import { Client, Connection } from '@temporalio/client';
import type { Connection as NangoConnection } from '../models/Connection.js';
import type { Config as ProviderConfig } from '../models/Provider.js';
import type { NangoIntegrationData, NangoConfig, NangoIntegration } from '../integrations/index.js';
import { Sync, SyncStatus, SyncType, ScheduleStatus, SyncCommand } from '../models/Sync.js';
import type { LogLevel, LogAction } from '../models/Activity.js';
import { TASK_QUEUE } from '../constants.js';
import { createActivityLog, createActivityLogMessage } from '../services/activity.service.js';
import { createSyncJob } from '../services/sync/job.service.js';
import { loadNangoConfig, getCronExpression } from '../services/nango-config.service.js';
import { createSchedule as createSyncSchedule } from '../services/sync/schedule.service.js';
import connectionService from '../services/connection.service.js';
import configService from '../services/config.service.js';
import { createSync } from '../services/sync/sync.service.js';

const generateWorkflowId = (sync: Sync, syncName: string, connectionId: string) => `${TASK_QUEUE}.${syncName}.${connectionId}-${sync.id}`;
const generateScheduleId = (sync: Sync, syncName: string, connectionId: string) => `${TASK_QUEUE}.${syncName}.${connectionId}-schedule-${sync.id}`;

class SyncClient {
    private static instance: Promise<SyncClient> | null = null;
    private client: Client | null = null;
    private namespace = process.env['TEMPORAL_NAMESPACE'] || 'default';

    private constructor(client: Client) {
        this.client = client;
    }

    static getInstance(): Promise<SyncClient> {
        if (this.instance === null) {
            this.instance = this.create();
        }
        return this.instance;
    }

    private static async create(): Promise<SyncClient> {
        try {
            const connection = await Connection.connect({
                address: process.env['TEMPORAL_ADDRESS'] || 'localhost:7233'
            });
            const client = new Client({
                connection
            });
            return new SyncClient(client);
        } catch (e) {
            console.error(e);
            throw e;
        }
    }

    async initiate(nangoConnectionId: number): Promise<void> {
        const nangoConnection = (await connectionService.getConnectionById(nangoConnectionId)) as NangoConnection;
        const nangoConfig = loadNangoConfig();
        if (!nangoConfig) {
            console.log('Failed to load Nango config - will not start any syncs!');
            return;
        }
        const { integrations }: NangoConfig = nangoConfig;
        const providerConfigKey = nangoConnection?.provider_config_key as string;

        if (!integrations[providerConfigKey]) {
            console.log(`No syncs registered for provider ${providerConfigKey} - will not start any syncs!`);
            return;
        }

        if (!this.client) {
            console.log('Failed to get a Temporal client - will not start any syncs!');
            return;
        }

        const syncConfig: ProviderConfig = (await configService.getProviderConfig(
            nangoConnection?.provider_config_key as string,
            nangoConnection?.account_id as number
        )) as ProviderConfig;

        const syncObject = integrations[providerConfigKey] as unknown as { [key: string]: NangoIntegration };
        const syncNames = Object.keys(syncObject);
        for (let k = 0; k < syncNames.length; k++) {
            const syncName = syncNames[k] as string;
            const syncData = syncObject[syncName] as unknown as NangoIntegrationData;
            const { returns: models } = syncData;

            const sync = await createSync(nangoConnectionId, syncName, models);

            if (sync) {
                const syncClient = await SyncClient.getInstance();
                syncClient.startContinuous(nangoConnection, sync, syncConfig, syncName, syncData);
            }
        }
    }

    /**
     * Start Continuous
     * @desc get the connection information and the provider information
     * and kick off an initial sync and also a incremental sync. Also look
     * up any sync configs to call any integration snippet that was setup
     */
    async startContinuous(
        nangoConnection: NangoConnection,
        sync: Sync,
        syncConfig: ProviderConfig,
        syncName: string,
        syncData: NangoIntegrationData
    ): Promise<void> {
        const log = {
            level: 'info' as LogLevel,
            success: false,
            action: 'sync' as LogAction,
            start: Date.now(),
            end: Date.now(),
            timestamp: Date.now(),
            connection_id: nangoConnection?.connection_id as string,
            provider_config_key: nangoConnection?.provider_config_key as string,
            provider: syncConfig.provider,
            session_id: sync?.id?.toString() as string,
            account_id: nangoConnection?.account_id as number,
            operation_name: syncName
        };
        const activityLogId = await createActivityLog(log);

        const jobId = generateWorkflowId(sync, syncName, nangoConnection?.connection_id as string);

        const syncJobId = await createSyncJob(sync.id as string, SyncType.INITIAL, SyncStatus.RUNNING, jobId, activityLogId as number);

        const handle = await this.client?.workflow.start('initialSync', {
            taskQueue: TASK_QUEUE,
            workflowId: jobId,
            args: [
                {
                    syncId: sync.id,
                    syncJobId: syncJobId?.id as number,
                    nangoConnection,
                    syncName,
                    activityLogId
                }
            ]
        });

        const frequency = getCronExpression(syncData.runs);
        const scheduleId = generateScheduleId(sync, syncName, nangoConnection?.connection_id as string);

        // kick off schedule
        await this.client?.schedule.create({
            scheduleId,
            spec: {
                cronExpressions: [frequency]
            },
            action: {
                type: 'startWorkflow',
                workflowType: 'continuousSync',
                taskQueue: TASK_QUEUE,
                args: [
                    {
                        syncId: sync.id,
                        activityLogId,
                        nangoConnection,
                        syncName
                    }
                ]
            }
        });

        await createSyncSchedule(sync.id as string, frequency, ScheduleStatus.RUNNING, scheduleId);

        await createActivityLogMessage({
            level: 'info',
            activity_log_id: activityLogId as number,
            content: `Started initial background sync ${handle?.workflowId} and data updated on a schedule ${scheduleId} at ${syncData.runs} in the task queue: ${TASK_QUEUE}`,
            timestamp: Date.now()
        });
    }

    async deleteSyncSchedule(id: string): Promise<boolean> {
        if (!this.client) {
            return false;
        }

        const workflowService = this.client?.workflowService;
        try {
            await workflowService?.deleteSchedule({
                scheduleId: id,
                namespace: this.namespace
            });
            return true;
        } catch (e) {
            return false;
        }
    }

    async listSchedules() {
        if (!this.client) {
            return;
        }

        const workflowService = this.client?.workflowService;

        const schedules = await workflowService?.listSchedules({
            namespace: this.namespace
        });

        return schedules;
    }

    async runSyncCommand(syncId: string, command: SyncCommand) {
        const scheduleHandle = this.client?.schedule.getHandle(syncId);

        switch (command) {
            case SyncCommand.PAUSE:
                await scheduleHandle?.pause();
                break;
            case SyncCommand.UNPAUSE:
                await scheduleHandle?.unpause();
                break;
            case SyncCommand.RUN:
                await scheduleHandle?.trigger();
                break;
            case SyncCommand.RUN_FULL:
                console.warn('Not implemented');
                break;
        }
    }
}

export default SyncClient;

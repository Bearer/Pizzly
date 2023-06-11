import {
    Nango,
    updateSyncJobStatus,
    createSyncJob,
    SyncStatus,
    SyncType,
    Config as ProviderConfig,
    configService,
    updateSuccess,
    createActivityLog,
    createActivityLogMessage,
    createActivityLogMessageAndEnd,
    UpsertResponse,
    LogLevel,
    LogAction,
    getApiUrl,
    updateSuccess as updateSuccessActivityLog,
    syncDataService,
    NangoIntegration,
    NangoIntegrationData,
    checkForIntegrationFile,
    loadNangoConfig,
    updateSyncJobResult,
    SyncResult,
    getLastSyncDate,
    dataService,
    updateJobActivityLogId,
    webhookService,
    NangoConnection,
    isCloud,
    accountService
} from '@nangohq/shared';
import type { ContinuousSyncArgs, InitialSyncArgs } from './models/Worker';
import integationService from './services/integration.service.js';

export async function routeSync(args: InitialSyncArgs): Promise<boolean> {
    const { syncId, syncJobId, syncName, activityLogId, nangoConnection } = args;
    const syncConfig: ProviderConfig = (await configService.getProviderConfig(
        nangoConnection?.provider_config_key as string,
        nangoConnection?.account_id as number
    )) as ProviderConfig;

    return syncProvider(syncConfig, syncId, syncJobId, syncName, SyncType.INITIAL, nangoConnection, activityLogId, false);
}

export async function scheduleAndRouteSync(args: ContinuousSyncArgs): Promise<boolean> {
    const { syncId, activityLogId, syncName, nangoConnection } = args;
    // TODO recreate the job id to be in the format created by temporal: nango-syncs.accounts-syncs-schedule-29768402-c6a8-462b-8334-37adf2b76be4-workflow-2023-05-30T08:45:00Z
    const syncJobId = await createSyncJob(syncId as string, SyncType.INCREMENTAL, SyncStatus.RUNNING, '', activityLogId);
    const syncConfig: ProviderConfig = (await configService.getProviderConfig(
        nangoConnection?.provider_config_key as string,
        nangoConnection?.account_id as number
    )) as ProviderConfig;

    return syncProvider(syncConfig, syncId, syncJobId?.id as number, syncName, SyncType.INCREMENTAL, nangoConnection, activityLogId, true);
}

/**
 * Sync Provider
 * @desc take in a provider, use the nango.yaml config to find
 * the integrations where that provider is used and call the sync
 * accordingly with the user defined integration code
 */
export async function syncProvider(
    syncConfig: ProviderConfig,
    syncId: string,
    syncJobId: number,
    syncName: string,
    syncType: SyncType,
    nangoConnection: NangoConnection,
    existingActivityLogId: number,
    isIncremental: boolean
): Promise<boolean> {
    let activityLogId = existingActivityLogId;

    if (isIncremental) {
        const log = {
            level: 'info' as LogLevel,
            success: null,
            action: 'sync' as LogAction,
            start: Date.now(),
            end: Date.now(),
            timestamp: Date.now(),
            connection_id: nangoConnection?.connection_id as string,
            provider_config_key: nangoConnection?.provider_config_key as string,
            provider: syncConfig.provider,
            session_id: syncJobId.toString(),
            account_id: nangoConnection?.account_id as number,
            operation_name: syncName
        };
        activityLogId = (await createActivityLog(log)) as number;

        updateJobActivityLogId(syncJobId, activityLogId);
    }

    const nangoConfig = await loadNangoConfig(nangoConnection, syncName);

    if (!nangoConfig) {
        const content = `No sync configuration was found for ${syncName}.`;
        reportFailureForResults(activityLogId, syncJobId, content);
        return false;
    }

    const { integrations } = nangoConfig;
    let result = true;

    // if there is a matching customer integration code for the provider config key then run it
    if (integrations[nangoConnection.provider_config_key]) {
        const account = await accountService.getAccountById(nangoConnection.account_id as number);

        if (!account) {
            const content = `No account was found for ${nangoConnection.account_id}. The sync cannot continue without a valid account`;
            reportFailureForResults(activityLogId, syncJobId, content);
        }

        const nango = new Nango({
            host: getApiUrl(),
            connectionId: String(nangoConnection?.connection_id),
            providerConfigKey: String(nangoConnection?.provider_config_key),
            activityLogId: activityLogId as number,
            isSync: true,
            secretKey: account?.secret_key as string
        });

        // updates to allow the batchSend to work
        nango.setSyncId(syncId);
        nango.setNangoConnectionId(nangoConnection.id as number);
        nango.setSyncJobId(syncJobId);

        const providerConfigKey = nangoConnection.provider_config_key;
        const syncObject = integrations[providerConfigKey] as unknown as { [key: string]: NangoIntegration };

        const now = new Date();

        if (!isCloud) {
            const { path: integrationFilePath, result: integrationFileResult } = checkForIntegrationFile(syncName);
            if (!integrationFileResult) {
                const content = `Integration was attempted to run for ${syncName} but no integration file was found at ${integrationFilePath}.`;
                reportFailureForResults(activityLogId, syncJobId, content);

                return false;
            }
        }

        const lastSyncDate = await getLastSyncDate(nangoConnection?.id as number, syncName);
        nango.setLastSyncDate(lastSyncDate as Date);
        const syncData = syncObject[syncName] as unknown as NangoIntegrationData;
        const { returns: models } = syncData;

        try {
            result = true;

            const userDefinedResults = await integationService.runScript(syncName, activityLogId, nango, syncData);

            if (userDefinedResults === null) {
                const content = `The integration was run but there was a problem in retrieving the results from the script.`;
                reportFailureForResults(activityLogId, syncJobId, content);

                return false;
            }

            let responseResults: UpsertResponse | null = { addedKeys: [], updatedKeys: [], affectedInternalIds: [], affectedExternalIds: [] };

            for (const model of models) {
                if (userDefinedResults[model]) {
                    const formattedResults = syncDataService.formatDataRecords(userDefinedResults[model], nangoConnection.id as number, model, syncId);
                    let upsertSuccess = true;
                    if (formattedResults.length > 0) {
                        try {
                            const upsertResult = await dataService.upsert(
                                formattedResults,
                                '_nango_sync_data_records',
                                'external_id',
                                nangoConnection.id as number,
                                model,
                                activityLogId
                            );

                            // if it is null that means there were duplicates and nothing was actually inserted
                            if (upsertResult) {
                                responseResults = upsertResult;
                            }
                        } catch (e) {
                            const errorMessage = JSON.stringify(e, ['message', 'name', 'stack'], 2);

                            await createActivityLogMessage({
                                level: 'error',
                                activity_log_id: activityLogId,
                                content: `There was a problem upserting the data for ${syncName} and the model ${model}. The error message was ${errorMessage}`,
                                timestamp: Date.now()
                            });
                            upsertSuccess = false;
                        }
                    }
                    if (responseResults) {
                        reportResults(
                            nangoConnection,
                            now,
                            syncJobId,
                            activityLogId,
                            model,
                            syncName,
                            syncType,
                            responseResults,
                            formattedResults.length > 0,
                            upsertSuccess,
                            syncData.version
                        );
                    } else {
                        const content = `There was a problem upserting the data and retrieving the changed results ${syncName} and the model ${model}.`;

                        await createActivityLogMessage({
                            level: 'error',
                            activity_log_id: activityLogId,
                            content,
                            timestamp: Date.now()
                        });
                        upsertSuccess = false;
                    }
                }
            }
        } catch (e) {
            result = false;
            const errorMessage = JSON.stringify(e, ['message', 'name', 'stack'], 2);
            const content = `The ${syncType} "${syncName}" sync did not complete successfully and has the following error: ${errorMessage}`;
            reportFailureForResults(activityLogId, syncJobId, content);
        }
    }

    return result;
}

async function reportResults(
    nangoConnection: NangoConnection,
    now: Date,
    syncJobId: number,
    activityLogId: number,
    model: string,
    syncName: string,
    syncType: SyncType,
    responseResults: UpsertResponse,
    anyResultsInserted: boolean,
    upsertSuccess: boolean,
    version?: string
) {
    await updateSyncJobStatus(syncJobId, SyncStatus.SUCCESS);
    await updateSuccess(activityLogId, true);
    const syncResult: SyncResult = await updateSyncJobResult(syncJobId, {
        added: responseResults.addedKeys.length,
        updated: responseResults.updatedKeys.length
    });

    const { added, updated } = syncResult;

    const successMessage =
        `The ${syncType} "${syncName}" sync has been completed to the ${model} model.` +
        (version ? ` The version integration script version ran was ${version}.` : '');

    let resultMessage = '';

    if (!upsertSuccess) {
        resultMessage = `There was an error in upserting the results`;
    } else {
        if (anyResultsInserted) {
            await webhookService.sendUpdate(nangoConnection, syncName, model, syncResult, syncType, now.toISOString(), activityLogId);
        }
        resultMessage = anyResultsInserted
            ? `The result was ${added} added record${added === 1 ? '' : 's'} and ${updated} updated record${updated === 1 ? '.' : 's.'}`
            : 'The external API returned no results so nothing was inserted or updated.';
    }

    const content = `${successMessage} ${resultMessage}`;

    await createActivityLogMessageAndEnd({
        level: 'info',
        activity_log_id: activityLogId,
        timestamp: Date.now(),
        content
    });
}

async function reportFailureForResults(activityLogId: number, syncJobId: number, content: string) {
    await updateSuccessActivityLog(activityLogId, false);
    await updateSyncJobStatus(syncJobId, SyncStatus.STOPPED);

    await createActivityLogMessageAndEnd({
        level: 'error',
        activity_log_id: activityLogId,
        timestamp: Date.now(),
        content
    });
}

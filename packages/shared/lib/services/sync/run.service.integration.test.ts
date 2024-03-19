import { expect, describe, it, beforeAll, afterAll, vi, afterEach } from 'vitest';
import SyncRun from './run.service.js';
import * as ConfigService from './config/config.service.js';
import environmentService from '../environment.service.js';
import LocalFileService from '../file/local.service.js';
import { IntegrationServiceInterface, Sync, SyncType, Job as SyncJob, SyncResult } from '../../models/Sync.js';
import type { Environment } from '../../models/Environment.js';
import { multipleMigrations } from '../../db/database.js';
import * as dataMocks from './data/mocks.js';
import * as dataService from './data/data.service.js';
import * as recordsService from './data/records.service.js';
import * as deleteService from './data/delete.service.js';
import * as jobService from './job.service.js';
import type { DataResponse } from '../../models/Data.js';
import type { Connection } from '../../models/Connection.js';
import db from '../../db/database.js';

class integrationServiceMock implements IntegrationServiceInterface {
    async runScript() {
        return {
            success: true
        };
    }
    async cancelScript() {
        return;
    }
}

const integrationService = new integrationServiceMock();

describe('SyncRun', () => {
    beforeAll(async () => {
        await multipleMigrations();
    });

    afterAll(async () => {
        await clearDb();
    });

    afterEach(async () => {
        await clearRecords();
    });

    const persist = async (
        rawRecords: DataResponse[],
        activityLogId: number,
        model: string,
        connection: Connection,
        sync: Sync,
        syncJob: SyncJob,
        trackDeletes: boolean,
        softDelete: boolean
    ) => {
        const { response: records } = recordsService.formatDataRecords(
            rawRecords,
            connection.id!,
            model,
            sync.id!,
            syncJob.id!,
            undefined, // lastSyncDate
            trackDeletes,
            softDelete
        );
        if (!records) {
            throw new Error(`failed to format records`);
        }
        const { error: upsertError, summary } = await dataService.upsert(
            records,
            '_nango_sync_data_records',
            'external_id',
            connection.id!,
            model,
            activityLogId,
            connection.environment_id,
            trackDeletes,
            softDelete
        );
        const updatedResults = {
            [model]: {
                added: summary?.addedKeys.length as number,
                updated: summary?.updatedKeys.length as number,
                deleted: summary?.deletedKeys?.length as number
            }
        };
        await jobService.updateSyncJobResult(syncJob.id!, updatedResults, model);
        if (upsertError) {
            throw new Error(`failed to upsert records: ${upsertError}`);
        }
    };

    const verifySyncRun = async (initialRecords: DataResponse[], newRecords: DataResponse[], trackDeletes: boolean, expectedResult: SyncResult) => {
        // Write initial records
        const { connection, model, sync, syncJob, activityLogId } = await dataMocks.upsertRecords(initialRecords);
        if (trackDeletes) {
            await deleteService.takeSnapshot(connection.id!, model);
        }

        // Create a new SyncRun
        const config = {
            integrationService: integrationService,
            writeToDb: true,
            nangoConnection: connection,
            syncName: sync.name,
            syncType: SyncType.INITIAL,
            syncId: sync.id!,
            syncJobId: syncJob.id!,
            activityLogId
        };
        const syncRun = new SyncRun(config);

        // Save records
        await persist(newRecords, activityLogId, model, connection, sync, syncJob, trackDeletes, false);

        // Finish the sync
        await syncRun.finishSync([model], new Date(), `v1`, 10, trackDeletes);

        const syncJobResult = await jobService.getLatestSyncJob(sync.id!);
        const result = {
            added: syncJobResult?.result?.[model]?.added || 0,
            updated: syncJobResult?.result?.[model]?.updated || 0,
            deleted: syncJobResult?.result?.[model]?.deleted || 0
        };
        expect(result).toEqual(expectedResult);
    };

    it(`with track_deletes=false`, () => {
        const trackDeletes = false;
        it(`should report no records have changed`, async () => {
            const rawRecords = [
                { id: '1', name: 'a' },
                { id: '2', name: 'b' }
            ];
            const expectedResult = { added: 0, updated: 0, deleted: 0 };
            await verifySyncRun(rawRecords, rawRecords, trackDeletes, expectedResult);
        });

        it(`should report one record has been added and one modified`, async () => {
            const rawRecords = [
                { id: '1', name: 'a' },
                { id: '2', name: 'b' }
            ];
            const newRecords = [
                { id: '1', name: 'A' },
                { id: '3', name: 'c' }
            ];
            const expectedResult = { added: 1, updated: 1, deleted: 0 };
            await verifySyncRun(rawRecords, newRecords, trackDeletes, expectedResult);
        });
    });
    it(`with track_deletes=true`, () => {
        const trackDeletes = true;
        it(`should report no records have changed`, async () => {
            const rawRecords = [
                { id: '1', name: 'a' },
                { id: '2', name: 'b' }
            ];
            const expectedResult = { added: 0, updated: 0, deleted: 0 };
            await verifySyncRun(rawRecords, rawRecords, trackDeletes, expectedResult);
        });

        it(`should report one record has been added, one updated and one deleted`, async () => {
            const rawRecords = [
                { id: '1', name: 'a' },
                { id: '2', name: 'b' }
            ];
            const newRecords = [
                { id: '1', name: 'A' },
                { id: '3', name: 'c' }
            ];
            const expectedResult = { added: 1, updated: 1, deleted: 1 };
            await verifySyncRun(rawRecords, newRecords, trackDeletes, expectedResult);
        });
    });
});

describe('SyncRun', () => {
    const dryRunConfig = {
        integrationService: integrationService as unknown as IntegrationServiceInterface,
        writeToDb: false,
        nangoConnection: {
            connection_id: '1234',
            provider_config_key: 'test_key',
            environment_id: 1
        },
        syncName: 'test_sync',
        syncType: SyncType.INCREMENTAL,
        syncId: 'some-sync',
        syncJobId: 123,
        activityLogId: 123,
        debug: true
    };
    it('should initialize correctly', () => {
        const config = {
            integrationService: integrationService as unknown as IntegrationServiceInterface,
            writeToDb: true,
            nangoConnection: {
                connection_id: '1234',
                provider_config_key: 'test_key',
                environment_id: 1
            },
            syncName: 'test_sync',
            syncType: SyncType.INCREMENTAL,
            syncId: 'some-sync',
            syncJobId: 123,
            activityLogId: 123,
            loadLocation: '/tmp',
            debug: true
        };

        const syncRun = new SyncRun(config);

        expect(syncRun).toBeTruthy();
        expect(syncRun.writeToDb).toEqual(true);
        expect(syncRun.nangoConnection.connection_id).toEqual('1234');
        expect(syncRun.syncName).toEqual('test_sync');
        expect(syncRun.syncType).toEqual(SyncType.INCREMENTAL);
        expect(syncRun.syncId).toEqual('some-sync');
        expect(syncRun.syncJobId).toEqual(123);
        expect(syncRun.activityLogId).toEqual(123);
        expect(syncRun.loadLocation).toEqual('/tmp');
        expect(syncRun.debug).toEqual(true);
    });

    it('should mock the run method in dry run mode with different fail and success conditions', async () => {
        const syncRun = new SyncRun(dryRunConfig);

        vi.spyOn(environmentService, 'getById').mockImplementation(() => {
            return Promise.resolve({
                id: 1,
                name: 'test',
                account_id: 1,
                secret_key: '1234'
            } as Environment);
        });

        vi.spyOn(ConfigService, 'getSyncConfig').mockImplementation(() => {
            return Promise.resolve({
                integrations: {
                    test_key: {
                        test_sync: {
                            runs: 'every 6h',
                            returns: ['Foo']
                        }
                    }
                },
                models: {
                    Foo: {
                        name: 'Foo'
                    }
                }
            });
        });

        vi.spyOn(LocalFileService, 'checkForIntegrationDistFile').mockImplementation(() => {
            return {
                result: true,
                path: '/tmp'
            };
        });

        vi.spyOn(integrationService, 'runScript').mockImplementation(() => {
            return Promise.resolve({
                success: true,
                response: { success: true }
            });
        });

        const run = await syncRun.run();

        expect(run).toEqual({ success: true });

        // if integration file not found it should return false
        vi.spyOn(LocalFileService, 'checkForIntegrationDistFile').mockImplementation(() => {
            return {
                result: false,
                path: '/tmp'
            };
        });

        const failRun = await syncRun.run();

        expect(failRun.response).toEqual(false);

        // @ts-expect-error - if run script returns null then fail
        vi.spyOn(integrationService, 'runScript').mockImplementation(() => {
            return Promise.resolve(null);
        });

        const { response } = await syncRun.run();

        expect(response).toEqual(false);
    });
});

const clearDb = async () => {
    await db.knex.raw(`DROP SCHEMA nango CASCADE`);
};
const clearRecords = async () => {
    await db.knex.raw(`TRUNCATE TABLE _nango_sync_data_records`);
    await db.knex.raw(`TRUNCATE TABLE _nango_sync_data_records_deletes`);
};

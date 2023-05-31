import { v4 as uuidv4 } from 'uuid';
import db, { schema, dbNamespace } from '../../db/database.js';
import { Sync, Job as SyncJob, SyncStatus, SyncConfig } from '../../models/Sync.js';
import SyncClient from '../../clients/sync.client.js';
import { markAllAsStopped } from './schedule.service.js';

const TABLE = dbNamespace + 'syncs';
const SYNC_JOB_TABLE = dbNamespace + 'sync_jobs';
const SYNC_SCHEDULE_TABLE = dbNamespace + 'sync_schedules';
const SYNC_CONFIG_TABLE = dbNamespace + 'sync_configs';

/**
 * Sync Service
 * @description
 *  A Sync a Nango Sync that has
 *  - collection of sync jobs (initial or incremental)
 *  - sync schedule
 *  - bunch of sync data records
 *
 */

export const getById = async (id: string): Promise<Sync | null> => {
    const result = await db.knex.withSchema(db.schema()).select('*').from<Sync>(TABLE).where({ id });

    if (!result || result.length == 0 || !result[0]) {
        return null;
    }

    return result[0];
};

export const createSync = async (nangoConnectionId: number, name: string, models: string[]): Promise<Sync | null> => {
    const sync: Sync = {
        id: uuidv4(),
        nango_connection_id: nangoConnectionId,
        name,
        models
    };

    const result = await db.knex.withSchema(db.schema()).from<Sync>(TABLE).insert(sync).returning('*');

    if (!result || result.length == 0 || !result[0]) {
        return null;
    }

    return result[0];
};

export const getLastSyncDate = async (nangoConnectionId: number, syncName: string): Promise<Date | null> => {
    const sync = await getSync(nangoConnectionId, syncName);

    if (!sync) {
        return null;
    }

    const result = await schema()
        .select('updated_at')
        .from<SyncJob>(SYNC_JOB_TABLE)
        .where({
            sync_id: sync.id as string,
            status: SyncStatus.SUCCESS
        })
        .orderBy('updated_at', 'desc')
        .first();

    if (!result) {
        return null;
    }

    const { updated_at } = result;

    return updated_at;
};

export const createSyncConfig = async (account_id: number, provider: string, integrationName: string, snippet: string): Promise<boolean> => {
    const result: void | Pick<SyncConfig, 'id'> = await db.knex.withSchema(db.schema()).from<SyncConfig>(SYNC_CONFIG_TABLE).insert(
        {
            account_id,
            provider,
            integration_name: integrationName,
            snippet
        },
        ['id']
    );

    if (Array.isArray(result) && result.length === 1 && result[0] !== null && 'id' in result[0]) {
        return true;
    }
    return false;
};

export const getSyncConfigByProvider = async (provider: string): Promise<SyncConfig[]> => {
    const result = await db.knex.withSchema(db.schema()).select('*').from<SyncConfig>(SYNC_CONFIG_TABLE).where({ provider: provider });

    if (Array.isArray(result) && result.length > 0) {
        return result;
    }

    return [];
};

export const getSync = async (nangoConnectionId: number, name: string): Promise<Sync | null> => {
    const result = await db.knex.withSchema(db.schema()).select('*').from<Sync>(TABLE).where({ nango_connection_id: nangoConnectionId, name });

    if (Array.isArray(result) && result.length > 0) {
        return result[0] as Sync;
    }

    return null;
};

/**
 * Get Syncs
 * @description get the sync related to the connection
 * the latest sync and its result and the next sync based on the schedule
 */
export const getSyncs = async (nangoConnectionId: number): Promise<Sync[]> => {
    const syncClient = await SyncClient.getInstance();
    const scheduleResponse = await syncClient.listSchedules();
    if (scheduleResponse?.schedules.length === 0) {
        await markAllAsStopped();
    }
    const result = await schema()
        .from<Sync>(TABLE)
        .select(
            `${TABLE}.*`,
            `${SYNC_SCHEDULE_TABLE}.schedule_id`,
            `${SYNC_SCHEDULE_TABLE}.frequency`,
            `${SYNC_SCHEDULE_TABLE}.status as schedule_status`,
            db.knex.raw(
                `(
                    SELECT json_build_object(
                        'updated_at', nango.${SYNC_JOB_TABLE}.updated_at,
                        'type', nango.${SYNC_JOB_TABLE}.type,
                        'result', nango.${SYNC_JOB_TABLE}.result,
                        'status', nango.${SYNC_JOB_TABLE}.status
                    )
                    FROM nango.${SYNC_JOB_TABLE}
                    WHERE nango.${SYNC_JOB_TABLE}.sync_id = nango.${TABLE}.id
                    ORDER BY nango.${SYNC_JOB_TABLE}.updated_at DESC
                    LIMIT 1
                ) as latest_sync
                `
            )
        )
        .leftJoin(SYNC_JOB_TABLE, `${SYNC_JOB_TABLE}.sync_id`, '=', `${TABLE}.id`)
        .join(SYNC_SCHEDULE_TABLE, `${SYNC_SCHEDULE_TABLE}.sync_id`, `${TABLE}.id`)
        .where({
            nango_connection_id: nangoConnectionId
        })
        .groupBy(`${TABLE}.id`, `${SYNC_SCHEDULE_TABLE}.frequency`, `${SYNC_SCHEDULE_TABLE}.status`, `${SYNC_SCHEDULE_TABLE}.schedule_id`);

    if (Array.isArray(result) && result.length > 0) {
        return result;
    }

    return [];
};

export const getSyncsByConnectionId = async (nangoConnectionId: number): Promise<Sync[] | null> => {
    const results = await db.knex.withSchema(db.schema()).select('*').from<Sync>(TABLE).where({ nango_connection_id: nangoConnectionId });

    if (Array.isArray(results) && results.length > 0) {
        return results;
    }

    return null;
};

/**
 * Verify Ownership
 * @desc verify that the incoming account id matches with the provided nango connection id
 */
export const verifyOwnership = async (nangoConnectionId: number, accountId: number, syncId: string): Promise<boolean> => {
    const result = await schema()
        .select('*')
        .from<Sync>(TABLE)
        .join('_nango_connections', '_nango_connections.id', `${TABLE}.nango_connection_id`)
        .where({
            account_id: accountId,
            [`${TABLE}.id`]: syncId,
            nango_connection_id: nangoConnectionId
        });

    if (result.length === 0) {
        return false;
    }

    return true;
};

import * as cron from 'node-cron';
import { isCloud, db, encryptionManager, errorManager, ErrorSourceEnum, LogActionEnum } from '@nangohq/shared';
import tracer from 'dd-trace';

export async function deleteOldActivityLogs(): Promise<void> {
    /**
     * Delete all activity logs older than 15 days
     */
    cron.schedule('*/1 * * * *', async () => {
        const activityLogTableName = '_nango_activity_logs';
        const span = tracer.startSpan('cron.activityLogs.clean');
        tracer.scope().activate(span, async () => {
            try {
                // Postgres do not allow DELETE LIMIT so we batch ourself to limit the memory footprint of this query.
                await db.knex.raw(
                    `DELETE FROM ${activityLogTableName} WHERE id IN (SELECT id FROM ${activityLogTableName} WHERE created_at < NOW() - interval '15 days' LIMIT 5000)`
                );
            } catch (err: unknown) {
                const e = new Error('failed_to_clean_activity_logs_table');
                errorManager.report(
                    e,
                    {
                        source: ErrorSourceEnum.PLATFORM,
                        operation: LogActionEnum.DATABASE
                    },
                    tracer
                );
            }
            span.finish();
        });
    });
}

export async function encryptDataRecords(): Promise<void> {
    if (isCloud()) {
        await encryptionManager.encryptAllDataRecords();
    }
}

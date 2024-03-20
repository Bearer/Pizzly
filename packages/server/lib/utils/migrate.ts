import logger from '../utils/logger.js';
import { encryptionManager, KnexDatabase, pathMigrations } from '@nangohq/shared';

export default async function migrate() {
    const db = new KnexDatabase({ timeoutMs: 0 }); // Disable timeout for migrations
    logger.info(`Migrating database ... ${pathMigrations}`);

    await db.knex.raw(`CREATE SCHEMA IF NOT EXISTS ${db.schema()}`);
    await db.migrate(pathMigrations);
    await encryptionManager.encryptDatabaseIfNeeded();

    logger.info('✅ Migrated database');
}

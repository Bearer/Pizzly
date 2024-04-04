import { logger } from '../utils/logger.js';
import { db } from './client.js';
import { schema, config } from './config.js';
import { dirname } from '../env.js';
import path from 'node:path';

export async function migrate(): Promise<void> {
    logger.info('[records] migration');
    const dir = path.join(dirname, 'records/dist/db/migrations');
    await db.raw(`CREATE SCHEMA IF NOT EXISTS ${schema}`);

    const [, pendingMigrations] = (await db.migrate.list({ ...config.migrations, directory: dir })) as [unknown, string[]];

    if (pendingMigrations.length === 0) {
        logger.info('[records] nothing to do');
        return;
    }

    await db.migrate.latest({ ...config.migrations, directory: dir });
    logger.info('[records] migrations completed.');
}

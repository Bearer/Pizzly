import * as cron from 'node-cron';
import type { Lock } from '@nangohq/shared';
import { errorManager, ErrorSourceEnum, connectionService, locking } from '@nangohq/shared';
import { stringifyError, getLogger, metrics } from '@nangohq/utils';
import { logContextGetter } from '@nangohq/logs';
import { connectionRefreshFailed as connectionRefreshFailedHook, connectionRefreshSuccess as connectionRefreshSuccessHook } from './hooks/hooks.js';
import tracer from 'dd-trace';

const logger = getLogger('Server');
const cronName = '[refreshTokens]';
const cronMinutes = 10;

export function refreshTokens(): void {
    cron.schedule(`*/${cronMinutes} * * * *`, () => {
        (async () => {
            const start = Date.now();
            try {
                await exec();
            } catch (err: unknown) {
                const e = new Error('failed_to_refresh_tokens', {
                    cause: err instanceof Error ? err.message : String(err)
                });
                errorManager.report(e, { source: ErrorSourceEnum.PLATFORM }, tracer);
            } finally {
                metrics.duration(metrics.Types.REFRESH_TOKENS, Date.now() - start);
            }
        })().catch((error: unknown) => {
            logger.error('Failed to execute refreshTokens cron job');
            logger.error(error);
        });
    });
}

export async function exec(): Promise<void> {
    return await tracer.trace<Promise<void>>('nango.server.cron.connectionCheck', async (span) => {
        let lock: Lock | undefined;
        try {
            logger.info(`${cronName} starting`);

            const ttlMs = cronMinutes * 60 * 1000;
            const startTimestamp = Date.now();
            const lockKey = `lock:connectionCheck:cron`;

            try {
                lock = await locking.acquire(lockKey, ttlMs);
            } catch {
                logger.info(`${cronName} could not acquire lock, skipping`);
                return;
            }

            let cursor = undefined;
            const limit = 1000;
            // eslint-disable-next-line no-constant-condition
            while (true) {
                const staleConnections = await connectionService.getStaleConnections({ days: 1, limit, cursor });
                logger.info(`${cronName} found ${staleConnections.length} stale connections`);
                for (const staleConnection of staleConnections) {
                    if (Date.now() - startTimestamp > ttlMs) {
                        logger.info(`${cronName} time limit reached, stopping`);
                        return;
                    }
                    const { connection_id, environment, provider_config_key, account } = staleConnection;
                    logger.info(`${cronName} refreshing token for connectionId: ${connection_id}, accountId: ${account.id}`);
                    try {
                        const credentialResponse = await connectionService.getConnectionCredentials({
                            account,
                            environment,
                            connectionId: connection_id,
                            providerConfigKey: provider_config_key,
                            logContextGetter,
                            instantRefresh: false,
                            onRefreshSuccess: connectionRefreshSuccessHook,
                            onRefreshFailed: connectionRefreshFailedHook
                        });
                        if (credentialResponse.isOk()) {
                            metrics.increment(metrics.Types.REFRESH_TOKENS_SUCCESS);
                        } else {
                            metrics.increment(metrics.Types.REFRESH_TOKENS_FAILED);
                        }
                    } catch (err) {
                        logger.error(`${cronName} failed to refresh token for connectionId: ${connection_id} ${stringifyError(err)}`);
                        metrics.increment(metrics.Types.REFRESH_TOKENS_FAILED);
                    }
                    cursor = staleConnection.cursor;
                }
                if (staleConnections.length < limit) {
                    break;
                }
            }

            logger.info(`${cronName} ✅ done`);
        } catch (err) {
            logger.error(`${cronName} failed: ${stringifyError(err)}`);
            span.setTag('error', err);
        } finally {
            if (lock) {
                locking.release(lock);
            }
        }
    });
}

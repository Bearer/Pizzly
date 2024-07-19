import { Ok } from '@nangohq/utils';
import type { Result } from '@nangohq/utils';
import type { StartWebhookScriptProps } from './types';
import type { LogContext } from '@nangohq/logs';

export async function startWebhook(props: StartWebhookScriptProps & { logCtx: LogContext }): Promise<Result<void>> {
    await new Promise((resolve) => setTimeout(resolve, 1));
    console.log(props);
    return Ok(undefined);
}

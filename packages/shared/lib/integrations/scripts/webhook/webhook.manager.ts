import configService from '../../../services/config.service.js';
import SyncClient from '../../../clients/sync.client.js';
import connectionService from '../../../services/connection.service.js';
import { getSyncConfigsByConfigId } from '../../../services/sync/config/config.service.js';
import type { SyncConfig } from './../../../models/Sync.js';
import type { Config as ProviderConfig } from './../../../models/Provider.js';
import webhookService from '../../../services/sync/notification/webhook.service.js';

import hubspotWebhook from './hubspot.js';

export interface InternalNango {
    getWebhooks: (environment_id: number, nango_config_id: number) => Promise<SyncConfig[] | null>;
    executeScriptForWebhooks(integration: ProviderConfig, body: any, webhookType: string, connectionIdentifier: string): Promise<void>;
}

async function execute(environmentUuid: string, providerConfigKey: string, headers: Record<string, any>, body: any) {
    if (!body) {
        return;
    }

    const provider = await configService.getProviderName(providerConfigKey);
    const integration = await configService.getProviderConfigByUuid(providerConfigKey, environmentUuid);

    if (!provider || !integration) {
        return;
    }

    const internalNango: InternalNango = {
        getWebhooks: async (environment_id: number, nango_config_id: number) => {
            const syncConfigs = await getSyncConfigsByConfigId(environment_id, nango_config_id);

            if (!syncConfigs) {
                return null;
            }

            const syncConfigsWithWebhooks = syncConfigs.filter((syncConfig: SyncConfig) => syncConfig.webhook_subscriptions);

            return syncConfigsWithWebhooks;
        },
        executeScriptForWebhooks: async (integration: ProviderConfig, body: any, webhookType: string, connectionIdentifier: string) => {
            const syncConfigsWithWebhooks = await internalNango.getWebhooks(integration.environment_id, integration.id as number);

            if (!syncConfigsWithWebhooks) {
                return;
            }

            const connections = await connectionService.getConnectionsByEnvironmentAndConfig(integration.environment_id, integration.provider);

            const syncClient = await SyncClient.getInstance();

            for (const syncConfig of syncConfigsWithWebhooks) {
                const { webhook_subscriptions } = syncConfig;

                if (!webhook_subscriptions) {
                    continue;
                }

                for (const webhook of webhook_subscriptions) {
                    if (body[webhookType] === webhook) {
                        for (const connection of connections) {
                            if (connection?.connection_config && connection?.connection_config[connectionIdentifier] === body[connectionIdentifier]) {
                                await syncClient?.triggerWebhook(
                                    connection,
                                    integration.provider,
                                    webhook,
                                    syncConfig.sync_name,
                                    body,
                                    integration.environment_id
                                );
                            }
                        }
                    }
                }
            }
        }
    };

    switch (provider) {
        case 'hubspot':
            await hubspotWebhook(internalNango, integration, headers, body);
            break;
        default:
            break;
    }

    await webhookService.forward(integration.environment_id, providerConfigKey, provider, body);
}

export default execute;

import type { ProviderConfig } from '../models.js';
import db from '../db/database.js';

class ConfigService {
    async getProviderConfig(providerConfigKey: string): Promise<ProviderConfig | null> {
        let result = await db.knex.withSchema(db.schema()).select('*').from(`_pizzly_configs`).where({ unique_key: providerConfigKey });

        if (result == null || result.length == 0 || result[0] == null) {
            return null;
        }

        return result[0];
    }

    async listProviderConfigs(): Promise<ProviderConfig[]> {
        return await db.knex.withSchema(db.schema()).from<ProviderConfig>(`_pizzly_configs`).select('*');
    }

    async createProviderConfig(config: ProviderConfig): Promise<void | Pick<ProviderConfig, 'id'>[]> {
        return await db.knex.withSchema(db.schema()).from<ProviderConfig>(`_pizzly_configs`).insert(config, ['id']);
    }

    async deleteProviderConfig(providerConfigKey: string): Promise<number> {
        return db.knex.withSchema(db.schema()).from<ProviderConfig>(`_pizzly_configs`).where('unique_key', providerConfigKey).del();
    }

    async editProviderConfig(config: ProviderConfig) {
        await db.knex.withSchema(db.schema()).from<ProviderConfig>(`_pizzly_configs`).where({ unique_key: config.unique_key }).update({
            provider: config.provider,
            oauth_client_id: config.oauth_client_id,
            oauth_client_secret: config.oauth_client_secret,
            oauth_scopes: config.oauth_scopes
        });
    }
}

export default new ConfigService();

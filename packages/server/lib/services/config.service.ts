import type { ProviderConfig, ProviderTemplate, ProviderTemplateAlias, Connection } from '../models.js';
import db from '../db/database.js';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import { dirname } from '../utils/utils.js';
import { NangoError } from '../utils/error.js';

class ConfigService {
    templates: { [key: string]: ProviderTemplate };

    constructor() {
        this.templates = this.getTemplatesFromFile();
    }

    getTemplatesFromFile() {
        let templatesPath = path.join(dirname(), '../../providers.yaml');

        let fileEntries = yaml.load(fs.readFileSync(templatesPath).toString()) as { [key: string]: ProviderTemplate | ProviderTemplateAlias };

        if (fileEntries == null) {
            throw new NangoError('provider_template_loading_failed');
        }

        for (let key in fileEntries) {
            let alias = (fileEntries[key] as ProviderTemplateAlias).alias;

            if (alias && fileEntries[alias] != null) {
                fileEntries[key] = fileEntries[alias] as ProviderTemplate;
            }
        }

        return fileEntries as { [key: string]: ProviderTemplate };
    }

    async getProviderConfig(providerConfigKey: string, accountId: number): Promise<ProviderConfig | null> {
        let result = await db.knex
            .withSchema(db.schema())
            .select('*')
            .from<ProviderConfig>(`_nango_configs`)
            .where({ unique_key: providerConfigKey, account_id: accountId });

        if (result == null || result.length == 0 || result[0] == null) {
            return null;
        }

        return result[0];
    }

    async listProviderConfigs(accountId: number): Promise<ProviderConfig[]> {
        return db.knex.withSchema(db.schema()).select('*').from<ProviderConfig>(`_nango_configs`).where({ account_id: accountId });
    }

    async createProviderConfig(config: ProviderConfig): Promise<void | Pick<ProviderConfig, 'id'>[]> {
        return db.knex.withSchema(db.schema()).from<ProviderConfig>(`_nango_configs`).insert(config, ['id']);
    }

    async deleteProviderConfig(providerConfigKey: string, accountId: number): Promise<number> {
        await db.knex
            .withSchema(db.schema())
            .from<Connection>(`_nango_connections`)
            .where({ provider_config_key: providerConfigKey, account_id: accountId })
            .del();
        return db.knex.withSchema(db.schema()).from<ProviderConfig>(`_nango_configs`).where({ unique_key: providerConfigKey, account_id: accountId }).del();
    }

    async editProviderConfig(config: ProviderConfig) {
        return db.knex
            .withSchema(db.schema())
            .from<ProviderConfig>(`_nango_configs`)
            .where({ unique_key: config.unique_key, account_id: config.account_id })
            .update({
                provider: config.provider,
                oauth_client_id: config.oauth_client_id,
                oauth_client_secret: config.oauth_client_secret,
                oauth_scopes: config.oauth_scopes
            });
    }

    checkProviderTemplateExists(provider: string) {
        return provider in this.templates;
    }

    getTemplate(provider: string): ProviderTemplate {
        let template = this.templates[provider];

        if (template == null) {
            throw new NangoError('unknown_provider_template_in_config');
        }

        return template;
    }

    getTemplates(): { [key: string]: ProviderTemplate } {
        return this.templates;
    }
}

export default new ConfigService();

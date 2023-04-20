import type { ProviderConfig, ProviderTemplate, ProviderTemplateAlias, Connection } from '../models.js';
import db from '../db/database.js';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import { dirname } from '../utils/utils.js';
import { NangoError } from '../utils/error.js';
import encryptionManager from '../utils/encryption.manager.js';

class ConfigService {
    templates: { [key: string]: ProviderTemplate };

    constructor() {
        this.templates = this.getTemplatesFromFile();
    }

    private getTemplatesFromFile() {
        let templatesPath = path.join(dirname(), '../../providers.yaml');

        let fileEntries = yaml.load(fs.readFileSync(templatesPath).toString()) as { [key: string]: ProviderTemplate | ProviderTemplateAlias };

        if (fileEntries == null) {
            throw new NangoError('provider_template_loading_failed');
        }

        for (let key in fileEntries) {
            const entry = fileEntries[key];
            let alias = (entry as ProviderTemplateAlias).alias;

            if (alias && fileEntries[alias] != null) {
                let overrides = {};
                if (Object.keys(entry as ProviderTemplateAlias).length > 0) {
                    const { alias, ...templateOverrides } = entry as ProviderTemplateAlias;
                    overrides = templateOverrides;
                }
                fileEntries[key] = fileEntries[alias] as ProviderTemplate;

                if (Object.keys(overrides).length > 0) {
                    for (const prop in overrides) {
                        // TODO clean up
                        // @ts-ignore
                        fileEntries[key][prop] = overrides[prop];
                    }
                }
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

        return encryptionManager.decryptProviderConfig(result[0]);
    }

    async listProviderConfigs(accountId: number): Promise<ProviderConfig[]> {
        return (await db.knex.withSchema(db.schema()).select('*').from<ProviderConfig>(`_nango_configs`).where({ account_id: accountId }))
            .map((config) => encryptionManager.decryptProviderConfig(config))
            .filter((config) => config != null) as ProviderConfig[];
    }

    async createProviderConfig(config: ProviderConfig): Promise<void | Pick<ProviderConfig, 'id'>[]> {
        return db.knex.withSchema(db.schema()).from<ProviderConfig>(`_nango_configs`).insert(encryptionManager.encryptProviderConfig(config), ['id']);
    }

    async createDefaultProviderConfig(accountId: number) {
        let config: ProviderConfig = {
            account_id: accountId,
            unique_key: 'demo-github-integration',
            provider: 'github',
            oauth_client_id: process.env['DEFAULT_GITHUB_CLIENT_ID'] || '',
            oauth_client_secret: process.env['DEFAULT_GITHUB_CLIENT_SECRET'] || '',
            oauth_scopes: 'public_repo'
        };

        await this.createProviderConfig(config);
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
            .update(encryptionManager.encryptProviderConfig(config));
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

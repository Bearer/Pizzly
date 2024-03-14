import type { Onboarding } from '../models/Onboarding';
import db, { dbNamespace } from '../db/database.js';
import configService from './config.service.js';
import type { Config } from '../models';

export const DEFAULT_GITHUB_CLIENT_ID = process.env['DEFAULT_GITHUB_CLIENT_ID'] || '';
export const DEFAULT_GITHUB_CLIENT_SECRET = process.env['DEFAULT_GITHUB_CLIENT_SECRET'] || '';
export const DEMO_GITHUB_CONFIG_KEY = 'github-demo';
export const DEMO_SYNC_NAME = 'github-issues-demo';
export const DEMO_ACTION_NAME = 'github-create-demo-issue';
export const DEMO_MODEL = 'GithubIssueDemo';

const TABLE = `${dbNamespace}onboarding_demo_progress`;

export const getOnboardingId = async (user_id: number): Promise<number | null> => {
    const result = await db.knex.from<Onboarding>(TABLE).select<Required<Pick<Onboarding, 'id'>>>('id').where({ user_id }).first();
    return result ? result.id : null;
};

export const initOnboarding = async (user_id: number): Promise<number | null> => {
    const onboardingId = await getOnboardingId(user_id);

    if (onboardingId) {
        return onboardingId;
    }

    const result = await db.knex
        .from<Required<Onboarding>>(TABLE)
        .insert({
            user_id,
            progress: 0,
            complete: false
        })
        .returning('id');

    if (!result || result.length == 0 || !result[0]) {
        return null;
    }

    return result[0].id;
};

export const updateOnboardingProgress = async (id: number, progress: number): Promise<void> => {
    const q = db.knex.from<Onboarding>(TABLE).update({ progress }).where({ id });
    if (progress === 6) {
        void q.update('complete', true);
    }

    await q;
};

export const getOnboardingProgress = async (user_id: number): Promise<Required<Pick<Onboarding, 'id' | 'progress'>> | undefined> => {
    const result = await db.knex.from<Onboarding>(TABLE).select<Required<Pick<Onboarding, 'progress' | 'id'>>>('progress', 'id').where({ user_id }).first();
    return result;
};

/**
 * Create Default Provider Config
 * @desc create a default Github config only for the dev environment
 */
export async function createOnboardingProvider({ envId }: { envId: number }): Promise<void> {
    const config: Config = {
        environment_id: envId,
        unique_key: DEMO_GITHUB_CONFIG_KEY,
        provider: 'github',
        oauth_client_id: DEFAULT_GITHUB_CLIENT_ID,
        oauth_client_secret: DEFAULT_GITHUB_CLIENT_SECRET,
        oauth_scopes: 'public_repo'
    };

    await configService.createProviderConfig(config);
}

export async function getOnboardingProvider({ envId }: { envId: number }): Promise<Config | null> {
    return await configService.getProviderConfig(DEMO_GITHUB_CONFIG_KEY, envId);
}

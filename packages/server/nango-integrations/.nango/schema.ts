// ---------------------------
// This file was generated by Nango (v0.40.10)
// You can version this file
// ---------------------------

export interface SlackMessage {
    content: string;
    providerConfigKey: string;
    provider: string;
    status: 'closed' | 'open';
    ts: string | undefined;
    meta?: { accountName: string; accountUuid: string };
}

export interface SlackResponse {
    ok: boolean;
    channel: string;
    ts: string;
    message: {
        bot_id: string;
        type: string;
        text: string;
        user: string;
        ts: string;
        app_id: string;
        team: string;
        bot_profile: { id: string; app_id: string; name: string; icons: object; deleted: boolean; updated: number; team_id: string };
        attachments: object[];
    };
    warning: string | undefined;
    response_metadata: { warnings: string[] };
}

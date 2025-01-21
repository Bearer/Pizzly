import type { Nango } from '@nangohq/node';
import type { AxiosInstance, AxiosInterceptorManager, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import type { ApiEndUser, DBSyncConfig, DBTeam, GetPublicIntegration, RunnerFlags } from '@nangohq/types';
import type { z } from 'zod';

export declare const oldLevelToNewLevel: {
    readonly debug: 'debug';
    readonly info: 'info';
    readonly warn: 'warn';
    readonly error: 'error';
    readonly verbose: 'debug';
    readonly silly: 'debug';
    readonly http: 'info';
};
type LogLevel = 'info' | 'debug' | 'error' | 'warn' | 'http' | 'verbose' | 'silly';
type ParamEncoder = (value: any, defaultEncoder: (value: any) => any) => any;
interface GenericFormData {
    append(name: string, value: any, options?: any): any;
}
type SerializerVisitor = (
    this: GenericFormData,
    value: any,
    key: string | number,
    path: null | (string | number)[],
    helpers: FormDataVisitorHelpers
) => boolean;
type CustomParamsSerializer = (params: Record<string, any>, options?: ParamsSerializerOptions) => string;
interface FormDataVisitorHelpers {
    defaultVisitor: SerializerVisitor;
    convertValue: (value: any) => any;
    isVisitable: (value: any) => boolean;
}
interface SerializerOptions {
    visitor?: SerializerVisitor;
    dots?: boolean;
    metaTokens?: boolean;
    indexes?: boolean | null;
}
interface ParamsSerializerOptions extends SerializerOptions {
    encode?: ParamEncoder;
    serialize?: CustomParamsSerializer;
}
interface Pagination {
    type: string;
    limit?: number;
    response_path?: string;
    limit_name_in_request: string;
}
interface CursorPagination extends Pagination {
    cursor_path_in_response: string;
    cursor_name_in_request: string;
}
interface LinkPagination extends Pagination {
    link_rel_in_response_header?: string;
    link_path_in_response_body?: string;
}
interface OffsetPagination extends Pagination {
    offset_name_in_request: string;
    offset_start_value?: number;
    offset_calculation_method?: 'per-page' | 'by-response-size';
}
interface RetryHeaderConfig {
    at?: string;
    after?: string;
}
export interface ProxyConfiguration {
    endpoint: string;
    providerConfigKey?: string;
    connectionId?: string;
    method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE' | 'get' | 'post' | 'patch' | 'put' | 'delete';
    headers?: Record<string, string>;
    params?: string | Record<string, string | number>;
    paramsSerializer?: ParamsSerializerOptions;
    data?: unknown;
    retries?: number;
    baseUrlOverride?: string;
    paginate?: Partial<CursorPagination> | Partial<LinkPagination> | Partial<OffsetPagination>;
    retryHeader?: RetryHeaderConfig;
    responseType?: 'arraybuffer' | 'blob' | 'document' | 'json' | 'text' | 'stream';
    retryOn?: number[] | null;
}
export interface AuthModes {
    OAuth1: 'OAUTH1';
    OAuth2: 'OAUTH2';
    OAuth2CC: 'OAUTH2_CC';
    Basic: 'BASIC';
    ApiKey: 'API_KEY';
    AppStore: 'APP_STORE';
    Custom: 'CUSTOM';
    App: 'APP';
    None: 'NONE';
    TBA: 'TBA';
    Tableau: 'TABLEAU';
    Jwt: 'JWT';
    Bill: 'BILL';
    TwoStep: 'TWO_STEP';
    Signature: 'SIGNATURE';
}
export type AuthModeType = AuthModes[keyof AuthModes];
interface OAuth1Token {
    oAuthToken: string;
    oAuthTokenSecret: string;
}
interface AppCredentials {
    type: AuthModes['App'];
    access_token: string;
    expires_at?: Date | undefined;
    raw: Record<string, any>;
}
interface AppStoreCredentials {
    type?: AuthModes['AppStore'];
    access_token: string;
    expires_at?: Date | undefined;
    raw: Record<string, any>;
    private_key: string;
}
interface BasicApiCredentials {
    type: AuthModes['Basic'];
    username: string;
    password: string;
}
interface ApiKeyCredentials {
    type: AuthModes['ApiKey'];
    apiKey: string;
}
interface CredentialsCommon<T = Record<string, any>> {
    type: AuthModeType;
    raw: T;
}
interface OAuth2Credentials extends CredentialsCommon {
    type: AuthModes['OAuth2'];
    access_token: string;
    refresh_token?: string;
    expires_at?: Date | undefined;
}
interface OAuth2ClientCredentials extends CredentialsCommon {
    type: AuthModes['OAuth2CC'];
    token: string;
    expires_at?: Date | undefined;
    client_id: string;
    client_secret: string;
}
interface OAuth1Credentials extends CredentialsCommon {
    type: AuthModes['OAuth1'];
    oauth_token: string;
    oauth_token_secret: string;
}
interface TbaCredentials {
    type: AuthModes['TBA'];
    token_id: string;
    token_secret: string;
    config_override: {
        client_id?: string;
        client_secret?: string;
    };
}
interface TableauCredentials extends CredentialsCommon {
    type: AuthModes['Tableau'];
    pat_name: string;
    pat_secret: string;
    content_url?: string;
    token?: string;
    expires_at?: Date | undefined;
}
interface JwtCredentials {
    type: AuthModes['Jwt'];
    privateKeyId?: string;
    issuerId?: string;
    privateKey:
        | {
              id: string;
              secret: string;
          }
        | string;
    token?: string;
    expires_at?: Date | undefined;
}
interface BillCredentials extends CredentialsCommon {
    type: AuthModes['Bill'];
    username: string;
    password: string;
    organization_id: string;
    dev_key: string;
    session_id?: string;
    user_id?: string;
    expires_at?: Date | undefined;
}
interface TwoStepCredentials extends CredentialsCommon {
    type: AuthModes['TwoStep'];
    [key: string]: any;
    token?: string;
    expires_at?: Date | undefined;
}
interface SignatureCredentials {
    type: AuthModes['Signature'];
    username: string;
    password: string;
    token?: string;
    expires_at?: Date | undefined;
}
interface CustomCredentials extends CredentialsCommon {
    type: AuthModes['Custom'];
}
type UnauthCredentials = Record<string, never>;
type AuthCredentials =
    | OAuth2Credentials
    | OAuth2ClientCredentials
    | OAuth1Credentials
    | BasicApiCredentials
    | ApiKeyCredentials
    | AppCredentials
    | AppStoreCredentials
    | UnauthCredentials
    | TbaCredentials
    | TableauCredentials
    | JwtCredentials
    | BillCredentials
    | TwoStepCredentials
    | SignatureCredentials
    | CustomCredentials;
type Metadata = Record<string, unknown>;
interface MetadataChangeResponse {
    metadata: Metadata;
    provider_config_key: string;
    connection_id: string | string[];
}
interface Connection {
    id: number;
    provider_config_key: string;
    connection_id: string;
    connection_config: Record<string, string>;
    created_at: string;
    updated_at: string;
    last_fetched_at: string;
    metadata: Record<string, unknown> | null;
    provider: string;
    errors: {
        type: string;
        log_id: string;
    }[];
    end_user: ApiEndUser | null;
    credentials: AuthCredentials;
}
export declare class ActionError<T = Record<string, unknown>> extends Error {
    type: string;
    payload?: Record<string, unknown>;
    constructor(payload?: T);
}
interface RunArgs {
    sync: string;
    connectionId: string;
    lastSyncDate?: string;
    useServerLastSyncDate?: boolean;
    input?: object;
    metadata?: Metadata;
    autoConfirm: boolean;
    debug: boolean;
    optionalEnvironment?: string;
    optionalProviderConfigKey?: string;
}
export interface DryRunServiceInterface {
    run: (options: RunArgs, debug?: boolean) => Promise<string | void>;
}
export interface NangoProps {
    scriptType: 'sync' | 'action' | 'webhook' | 'on-event';
    host?: string;
    secretKey: string;
    team?: Pick<DBTeam, 'id' | 'name'>;
    connectionId: string;
    environmentId: number;
    environmentName?: string;
    activityLogId?: string | undefined;
    providerConfigKey: string;
    provider: string;
    lastSyncDate?: Date;
    syncId?: string | undefined;
    nangoConnectionId?: number;
    syncJobId?: number | undefined;
    dryRun?: boolean;
    track_deletes?: boolean;
    attributes?: object | undefined;
    logMessages?:
        | {
              counts: {
                  updated: number;
                  added: number;
                  deleted: number;
              };
              messages: unknown[];
          }
        | undefined;
    rawSaveOutput?: Map<string, unknown[]> | undefined;
    rawDeleteOutput?: Map<string, unknown[]> | undefined;
    stubbedMetadata?: Metadata | undefined;
    abortSignal?: AbortSignal;
    dryRunService?: DryRunServiceInterface;
    syncConfig: DBSyncConfig;
    runnerFlags: RunnerFlags;
    debug: boolean;
    startedAt: Date;
    endUser: {
        id: number;
        endUserId: string | null;
        orgId: string | null;
    } | null;
    axios?: {
        request?: AxiosInterceptorManager<AxiosRequestConfig>;
        response?: {
            onFulfilled: (value: AxiosResponse) => AxiosResponse | Promise<AxiosResponse>;
            onRejected: (value: unknown) => AxiosError | Promise<AxiosError>;
        };
    };
}
export interface EnvironmentVariable {
    name: string;
    value: string;
}
export declare const defaultPersistApi: AxiosInstance;
export declare class NangoAction<
    TMetadata extends Zod.ZodObject<any> | undefined,
    TMetadataInfered = TMetadata extends never ? never : z.infer<Exclude<TMetadata, undefined>>
> {
    protected nango: Nango;
    private attributes;
    protected persistApi: AxiosInstance;
    activityLogId?: string | undefined;
    syncId?: string;
    nangoConnectionId?: number;
    environmentId: number;
    environmentName?: string;
    syncJobId?: number;
    dryRun?: boolean;
    abortSignal?: AbortSignal;
    dryRunService?: DryRunServiceInterface;
    syncConfig?: DBSyncConfig;
    runnerFlags: RunnerFlags;
    connectionId: string;
    providerConfigKey: string;
    provider?: string;
    ActionError: typeof ActionError;
    private memoizedConnections;
    private memoizedIntegration;
    constructor(
        config: NangoProps,
        {
            persistApi
        }?: {
            persistApi: AxiosInstance;
        }
    );
    protected stringify(): string;
    private proxyConfig;
    protected throwIfAborted(): void;
    proxy<T = any>(config: ProxyConfiguration): Promise<AxiosResponse<T>>;
    get<T = any>(config: Omit<ProxyConfiguration, 'method'>): Promise<AxiosResponse<T>>;
    post<T = any>(config: Omit<ProxyConfiguration, 'method'>): Promise<AxiosResponse<T>>;
    put<T = any>(config: Omit<ProxyConfiguration, 'method'>): Promise<AxiosResponse<T>>;
    patch<T = any>(config: Omit<ProxyConfiguration, 'method'>): Promise<AxiosResponse<T>>;
    delete<T = any>(config: Omit<ProxyConfiguration, 'method'>): Promise<AxiosResponse<T>>;
    getToken(): Promise<
        | string
        | OAuth1Token
        | OAuth2ClientCredentials
        | BasicApiCredentials
        | ApiKeyCredentials
        | AppCredentials
        | AppStoreCredentials
        | UnauthCredentials
        | CustomCredentials
        | TbaCredentials
        | TableauCredentials
        | JwtCredentials
        | BillCredentials
        | TwoStepCredentials
        | SignatureCredentials
    >;
    /**
     * Get current integration
     */
    getIntegration(queries?: GetPublicIntegration['Querystring']): Promise<GetPublicIntegration['Success']['data']>;
    getConnection(providerConfigKeyOverride?: string, connectionIdOverride?: string): Promise<Connection>;
    setMetadata(metadata: TMetadataInfered): Promise<AxiosResponse<MetadataChangeResponse>>;
    updateMetadata(metadata: TMetadataInfered): Promise<AxiosResponse<MetadataChangeResponse>>;
    /**
     * @deprecated please use setMetadata instead.
     */
    setFieldMapping(fieldMapping: Record<string, string>): Promise<AxiosResponse<object>>;
    getMetadata(): Promise<TMetadataInfered>;
    getWebhookURL(): Promise<string | null | undefined>;
    /**
     * @deprecated please use getMetadata instead.
     */
    getFieldMapping(): Promise<TMetadataInfered>;
    /**
     * Log
     * @desc Log a message to the activity log which shows up in the Nango Dashboard
     * note that the last argument can be an object with a level property to specify the log level
     * @example
     * ```ts
     * await nango.log('This is a log message', { level: 'error' })
     * ```
     */
    log(
        message: any,
        options?:
            | {
                  level?: LogLevel;
              }
            | {
                  [key: string]: any;
                  level?: never;
              }
    ): Promise<void>;
    log(
        message: string,
        ...args: [
            any,
            {
                level?: LogLevel;
            }
        ]
    ): Promise<void>;
    getEnvironmentVariables(): Promise<EnvironmentVariable[] | null>;
    getFlowAttributes<A = object>(): A | null;
    paginate<T = any>(config: ProxyConfiguration): AsyncGenerator<T[], undefined, void>;
    triggerAction<In = unknown, Out = object>(providerConfigKey: string, connectionId: string, actionName: string, input?: In): Promise<Out>;
    triggerSync(providerConfigKey: string, connectionId: string, syncName: string, fullResync?: boolean): Promise<void | string>;
    private sendLogToPersist;
    private logAPICall;
}
export declare class NangoSync<
    TModels extends Record<string, Zod.ZodObject<any>>,
    TMetadata extends Zod.ZodObject<any> | undefined,
    TKeys extends keyof TModels = keyof TModels
> extends NangoAction<TMetadata> {
    lastSyncDate?: Date;
    track_deletes: boolean;
    logMessages?:
        | {
              counts: {
                  updated: number;
                  added: number;
                  deleted: number;
              };
              messages: unknown[];
          }
        | undefined;
    rawSaveOutput?: Map<string, unknown[]>;
    rawDeleteOutput?: Map<string, unknown[]>;
    stubbedMetadata?: Metadata | undefined;
    private batchSize;
    constructor(config: NangoProps);
    /**
     * @deprecated please use batchSave
     */
    batchSend(results: z.infer<TModels[TKeys]>[], model: TKeys): Promise<boolean | null>;
    batchSave(results: z.infer<TModels[TKeys]>[], model: TKeys): Promise<boolean | null>;
    batchDelete<T = any>(results: T[], model: string): Promise<boolean | null>;
    batchUpdate<T = any>(results: T[], model: string): Promise<boolean | null>;
    getMetadata(): Promise<TMetadata extends never ? never : z.infer<Exclude<TMetadata, undefined>>>;

    saveRecords(modelName: TKeys, data: z.infer<TModels[TKeys]>[]): Promise<boolean | null>;
}

export type SemverVersion = `${number}.${number}.${number}`;
export declare function createSync<TModels extends Record<string, Zod.ZodObject<any>>, TMetadata extends Zod.ZodObject<any> | undefined = undefined>(params: {
    name: string;
    endpoint: { method: 'GET' | 'POST'; path: string; group: string };
    integrationId: string;
    runs: string;
    models: TModels;
    description: string;
    syncType: 'full' | 'incremental';
    trackDeletes?: boolean;
    autoStart?: boolean;
    scopes?: string;
    metadata?: TMetadata;
    version?: SemverVersion;
    fetchData: (nango: NangoSync<TModels, TMetadata>) => Promise<void> | void;
    onWebhook?: (nango: NangoSync<TModels, TMetadata>, payload: any) => Promise<void> | void;
}): any;

export declare function createAction<
    TInput extends Zod.ZodTypeAny,
    TOutput extends Zod.ZodTypeAny,
    TMetadata extends Zod.ZodObject<any> | undefined = undefined,
    TOutputInferred = z.infer<TOutput>,
    TInputInferred = z.infer<TInput>
>(params: {
    name: string;
    endpoint: { method: 'GET' | 'POST'; path: string; group: string };
    description: string;
    integrationId: string;
    input: TInput;
    output: TOutput;
    metadata?: TMetadata;
    version?: SemverVersion;
    runAction: (nango: NangoAction<TMetadata>, input: TInputInferred) => Promise<TOutputInferred> | TOutputInferred;
}): any;

export declare function createOnEvent<TMetadata extends Zod.ZodObject<any> | undefined = undefined>(params: {
    name: string;
    description: string;
    integrationId: string;
    type: 'post-connection-creation' | 'pre-connection-deletion';
    metadata?: TMetadata;
    version?: SemverVersion;
    exec: (nango: NangoAction<TMetadata>) => Promise<void> | void;
}): any;

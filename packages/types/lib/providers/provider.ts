import type { RetryHeaderConfig, CursorPagination, LinkPagination, OffsetPagination } from '../proxy/api.js';
import type { AuthModeType, OAuthAuthorizationMethodType, OAuthBodyFormatType } from '../auth/api.js';
import type { EndpointMethod } from '../api.js';

export interface TokenUrlObject {
    OAUTH1?: string;
    OAUTH2?: string;
    OAUTH2CC?: string;
    BASIC?: string;
    API_KEY?: string;
    APP_STORE?: string;
    CUSTOM?: string;
    APP?: string;
    NONE?: string;
}

export interface ProviderAlias {
    alias?: string;
    proxy: {
        base_url?: string;
    };
}

export interface SimplifiedJSONSchema {
    type: 'string';
    title: string;
    description: string;
    example?: string;
    pattern?: string;
    format?: string;
    order: number;
    default_value?: string;
    hidden?: string;
    suffix?: string;
    doc_section?: string;
}

export interface BaseProvider {
    display_name: string;
    auth_mode: AuthModeType;
    proxy?: {
        base_url: string;
        headers?: Record<string, string>;
        query?: {
            api_key: string;
        };
        retry?: RetryHeaderConfig;
        decompress?: boolean;
        paginate?: LinkPagination | CursorPagination | OffsetPagination;
        verification?: {
            method: EndpointMethod;
            endpoint: string;
            base_url_override?: string;
            headers?: Record<string, string>;
        };
    };
    authorization_url?: string;
    authorization_url_encode?: boolean;
    access_token_url?: string;
    authorization_params?: Record<string, string>;
    scope_separator?: string;
    default_scopes?: string[];
    token_url?: string | TokenUrlObject;
    token_url_encode?: boolean;
    token_params?: Record<string, string>;
    authorization_url_replacements?: Record<string, string>;
    redirect_uri_metadata?: string[];
    token_response_metadata?: string[];
    docs: string;
    docs_connect?: string;
    token_expiration_buffer?: number; // In seconds.
    webhook_routing_script?: string;
    webhook_user_defined_secret?: boolean;
    post_connection_script?: string;
    categories?: string[];
    connection_configuration?: string[];
    connection_config?: Record<string, SimplifiedJSONSchema>;
    credentials?: Record<string, SimplifiedJSONSchema>;
    authorization_url_fragment?: string;
}

export interface ProviderOAuth2 extends BaseProvider {
    auth_mode: 'OAUTH2' | 'CUSTOM';

    disable_pkce?: boolean; // Defaults to false (=PKCE used) if not provided

    token_params?: {
        grant_type?: 'authorization_code' | 'client_credentials';
    };

    refresh_params?: {
        grant_type: 'refresh_token';
    };
    authorization_method?: OAuthAuthorizationMethodType;
    body_format?: OAuthBodyFormatType;

    refresh_url?: string;
    expires_in_unit?: 'milliseconds';

    token_request_auth_method?: 'basic' | 'custom';
}

export interface ProviderOAuth1 extends BaseProvider {
    auth_mode: 'OAUTH1';

    request_url: string;
    request_params?: Record<string, string>;
    request_http_method?: 'GET' | 'PUT' | 'POST'; // Defaults to POST if not provided

    token_http_method?: 'GET' | 'PUT' | 'POST'; // Defaults to POST if not provided

    signature_method: 'HMAC-SHA1' | 'RSA-SHA1' | 'PLAINTEXT';
}

export interface ProviderJwt extends BaseProvider {
    token_headers: {
        algorithm: string;
    };
    token_payload: {
        expires_in_ms: number;
        token_audience: string;
    };
}
export type Provider = BaseProvider | ProviderOAuth1 | ProviderOAuth2 | ProviderJwt;

import { expect, describe, it } from 'vitest';
import { NangoYamlParserV1 } from './parser.v1.js';
import type { NangoYamlParsed, NangoYamlV1 } from '@nangohq/types';
import { ParserErrorModelIsLiteral } from './errors.js';

describe('parse', () => {
    it('should parse', () => {
        const v1: NangoYamlV1 = {
            models: { GithubIssue: { id: 'string' } },
            integrations: { provider: { sync: { type: 'sync', runs: 'every day', returns: 'GithubIssue' } } }
        };
        const parser = new NangoYamlParserV1({ raw: v1 });
        parser.parse();
        expect(parser.errors).toStrictEqual([]);
        expect(parser.parsed).toStrictEqual<NangoYamlParsed>({
            integrations: [
                {
                    providerConfigKey: 'provider',
                    syncs: [
                        {
                            auto_start: true,
                            description: '',
                            endpoints: [],
                            input: null,
                            name: 'sync',
                            output: ['GithubIssue'],
                            runs: 'every day',
                            scopes: [],
                            sync_type: 'incremental',
                            track_deletes: false,
                            type: 'sync',
                            usedModels: ['GithubIssue'],
                            webhookSubscriptions: []
                        }
                    ],
                    postConnectionScripts: [],
                    actions: []
                }
            ],
            models: new Map([['GithubIssue', { name: 'GithubIssue', fields: [{ name: 'id', value: 'string', tsType: true, array: false, optional: false }] }]]),
            yamlVersion: 'v1'
        });
    });

    it('should handle output as literal', () => {
        const v1: NangoYamlV1 = {
            models: {},
            integrations: { provider: { hello: { type: 'sync', runs: 'every day', returns: 'test' } } }
        };
        const parser = new NangoYamlParserV1({ raw: v1 });
        parser.parse();
        expect(parser.errors).toStrictEqual([]);
        expect(parser.warnings).toStrictEqual([new ParserErrorModelIsLiteral({ model: 'test', path: ['provider', 'sync', 'hello', '[output]'] })]);
        expect(parser.parsed).toStrictEqual<NangoYamlParsed>({
            integrations: [
                {
                    providerConfigKey: 'provider',
                    syncs: [
                        {
                            auto_start: true,
                            description: '',
                            endpoints: [],
                            input: null,
                            name: 'hello',
                            output: ['Anonymous_provider_sync_hello_output'],
                            runs: 'every day',
                            scopes: [],
                            sync_type: 'incremental',
                            track_deletes: false,
                            type: 'sync',
                            usedModels: ['Anonymous_provider_sync_hello_output'],
                            webhookSubscriptions: []
                        }
                    ],
                    postConnectionScripts: [],
                    actions: []
                }
            ],
            models: new Map([
                [
                    'Anonymous_provider_sync_hello_output',
                    { name: 'Anonymous_provider_sync_hello_output', fields: [{ name: 'output', value: 'test', array: false, optional: false }], isAnon: true }
                ]
            ]),
            yamlVersion: 'v1'
        });
    });
});

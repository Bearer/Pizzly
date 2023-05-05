---
sidebar_label: Fitbit
---

# Fitbit API wiki

:::note Working with the Fitbit API?
Please add your learnings, favorite links and gotchas here by [editing this page](https://github.com/nangohq/nango/tree/master/docs/docs/providers/fitbit.md).

:::

## Using Fitbit with Nango

API template name in Nango: `fitbit`  
Follow our [quickstart](../quickstart.md) to add an OAuth integration with Fitbit in 5 minutes.

Supported features in Nango:

| Feature                            | Supported                 |
| ---------------------------------- | ------------------------- |
| [Auth](/nango-auth/core-concepts)  | ✅                        |
| [Proxy](/nango-unified-apis/proxy) | ❎                        |
| Unified APIs                       | _Not included in any yet_ |

## App registration & publishing

Register your app [here](https://dev.fitbit.com/apps/new/).
There does not seem to be any approval process and you can immediately use your app.

## Useful links

-   [Web/REST API docs](https://dev.fitbit.com/build/reference/web-api/)
-   [The full list of OAuth scopes](https://dev.fitbit.com/build/reference/web-api/developer-guide/application-design/#Scopes)

## API specific gotchas

-   During the authorization flow, users need to manually select which scopes they grant to your application (from the ones you requested). They can complete the flow without granting all the requested scopes. The raw token response (which you can get from the Nango backend SDK) contains the `scope` key that lists the granted scopes.

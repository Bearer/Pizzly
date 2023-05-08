---
sidebar_label: Stack Exchange
---

# Stack Exchange API wiki

:::note Working with the Stack Exchange API?
Please add your learnings, favorite links and gotchas here by [editing this page](https://github.com/nangohq/nango/tree/master/docs/docs/providers/stackexchange.md).

:::

## Using Stack Exchange with Nango

Stack Exchange uses the same API for [all its sites](https://stackexchange.com/sites) such as Stack Overflow, Server Fault, Super User, Mathematics, Ask Ubuntu etc.

API template name in Nango: `stackexchange`  
Follow our [quickstart](../quickstart.md) to add an OAuth integration with Stack Exchange in 5 minutes.

Supported features in Nango:

| Feature                            | Supported                 |
| ---------------------------------- | ------------------------- |
| [Auth](/nango-auth/core-concepts)  | ✅                        |
| [Proxy](/nango-unified-apis/proxy) | ❎                        |
| Unified APIs                       | _Not included in any yet_ |

## App registration & publishing

You can [register your OAuth app here](http://stackapps.com/apps/oauth/register) (make sure you are logged into your Stack Exchange account).

There does not seem to be any approval process but once you are ready they can [help you promote your OAuth app on StackApps!](https://stackapps.com/questions/7/how-to-list-your-application-on-stack-apps)

## Useful links

-   [Stack Exchange API docs](https://api.stackexchange.com/docs)
-   [Stack Exchange OAuth scopes](https://api.stackexchange.com/docs/authentication#scope)

## API specific gotchas

-   By default access tokens expire (and cannot be refreshed). To get an access token that does not expire pass the `no_expiry` scope (along with your other scopes)
-   Read the [usage notes here](https://api.stackexchange.com/docs/authentication#usage): You need to pass an additional `key` parameter together with your access token to benefit from higher API quotas.

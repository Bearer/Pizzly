---
sidebar_label: Epic Games
---

# Epic Games API wiki

:::note Working with the Epic Games API?
Please add your learnings, favorite links and gotchas here by [editing this page](https://github.com/nangohq/nango/tree/master/docs/docs/providers/epic-games.md).

:::

## Using Epic Games with Nango

API template name in Nango: `epic-games`  
Follow our [quickstart](../quickstart.md) to add an OAuth integration with Epic Games in 5 minutes.

Supported features in Nango:

| Feature                            | Supported                 |
| ---------------------------------- | ------------------------- |
| [Auth](/nango-auth/core-concepts)  | ✅                        |
| [Proxy](/nango-unified-apis/proxy) | ❎                        |
| Unified APIs                       | _Not included in any yet_ |

## App registration & publishing

Register your app on the [Dev Portal](https://dev.epicgames.com/portal). It is all self-service, but far from self explanatory, you will need to set a client, link it with your app etc. There is also a branding review before you can distribute the app publicly.

## Useful links

-   Nango implements the [Auth Web APIs mentioned here](https://dev.epicgames.com/docs/web-api-ref/authentication) (specifically, it implements the `authorization code` flow).

## API specific gotchas

-   I could not find a public list of possible scopes, but there is a list when you setup your app in the dev portal.
-   The refresh token has a very aggressive time out of just a few hours - make API requests very frequently (to refresh it) or you will lose access!
-   Epic [returns many things](https://dev.epicgames.com/docs/web-api-ref/authentication#requesting-an-access-token) (scroll down for an example) together with the access token. Use the `getRawTokenRepsonse` methods of the Nango SDK to access these. You can get even more additional information by [inspecting the access token](https://dev.epicgames.com/docs/web-api-ref/authentication#account-information).

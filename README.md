<a href="https://heroku.com/deploy?template=https://github.com/Bearer/Pizzly" rel="nofollow"><img src="https://www.herokucdn.com/deploy/button.svg" alt="Deploy to Heroku" height="26"></a>
<a href="https://console.platform.sh/projects/create-project/?template=https://github.com/Bearer/Pizzly&utm_campaign=deploy_on_platform?utm_medium=button&utm_source=affiliate_links&utm_content=https://github.com/Bearer/Pizzly" rel="nofollow"><img src="https://platform.sh/images/deploy/deploy-button-lg-blue.svg" alt="Deploy with Platform.sh" height="26"></a>
<a href="https://www.bearer.sh/?ref=pizzly" rel="nofollow"><img src="/views/assets/img/badges/bearer-badge.png?raw=true" alt="Sponsored by Bearer.sh" height="26"></a>

# Pizzly 🐻 - The OAuth Integration Proxy

<div align="center">

<img src="/views/assets/img/logos/pizzly.png?raw=true" width="300">

The OAuth Integration Proxy

<!-- Build badge || License Badge || Heroku badge
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
-->
</div>

**Pizzly makes it fast and reliable to build API integrations**. It handles dozens of pre-configured APIs (including Salesforce, Slack, Google Sheets [and many more](#supported-apis)) and lets you quickly add more APIs with a generic JSON configuration schema. Using Pizzly your engineering team can focus on consuming APIs, in a standardized way that scales easily.

## How it works?

At the heart of Pizzly is a Node.js application that uses PostgreSQL as a database. Once deployed on your servers, each instance of Pizzly provides multiple tools to help developers with their API integrations, including:

- **a dashboard** - _to enable and configure APIs_;
- **an auth service** - _to handle the OAuth-dance_;
- **a proxy** - _to perform authenticated requests to an API_;
- a JS library - _to connect a user and perform requests from your frontend_;
- and its own API - _to programmatically do what you can do with the dashboard_.

![Integrate with many APIs, right from Pizzly's dashboard](views/assets/img/docs/pizzly-dashboard-all-apis.png?raw=true)

<!-- ## Key Features

- Manage retrieving, storing, and refreshing OAuth tokens _(aka the OAuth dance)_
- No scope limitations
- Retrieve and store complete OAuth payload
- Support of OAuth 1, OAuth 1a and OAuth 2.0
- JavaScript library to connect from your web-app (three-legged OAuth flow)
- Provides configurations for over 50+ OAuth APIs (see list below)
- Support adding new OAuth APIs using a file definition
- 1-click deploy to Heroku or major cloud hosting solutions -->

## Getting started

1. First, deploy your instance of Pizzly to Heroku using the button below (you can install it anywhere even locally, but for this getting started we gonna use Heroku)

   <a href="https://heroku.com/deploy?template=https://github.com/Bearer/Pizzly" rel="nofollow"><img src="https://www.herokucdn.com/deploy/button.svg" alt="Deploy to Heroku" height="40"></a>

2. Once deployed, open your Heroku app. You will land on Pizzly's dashboard.
3. Click on "Open Dashboard" and select the API you want to integrate with.
4. Now, configure the API by entering your credentials and scopes where prompted.
5. To connect a user to this API, _in your frontend_, use the code below:

   ```js
   import Pizzly from 'pizzly-js'

   const pizzly = new Pizzly() // Initialize Pizzly
   const myAPI = pizzly.integration('xxx-api-name') // Replace with the API slugname

   myAPI
     .connect()
     .then(({ authId }) => console.log('Sucessfully connected!', authId))
     .catch(console.error)
   ```

   This code will open a popup to start an authorization flow with that API. On success we obtain an `authId` which can be used to authenticate requests to the API.

6. _In your frontend again_, perform a request to the API using the code below:
   ```js
   myAPI
     .auth('xxx-auth-id') // Replace with the authId previously obtained
     .get('/endpoint') // Replace with the API endpoint
     .then(response => console.log(response.status))
     .catch(console.error)
   ```
   This example will perform a GET request to `/endpoint` of the API and will use the provided authId to authenticate the request.

## Examples

We have several examples [on the wiki](/wiki/Examples) with different APIs. Here is the first one to get you started:

```js
const pizzly = new Pizzly() // Initialize Pizzly
const github = pizzly.integration('github')

github
  .connect() // Connect to GitHub
  .then(({ authId }) => console.log('Sucessfully connected! with the authId:', authId))
  .catch(error => console.error('It failed!', error))
```

This example will trigger an OAuth dance to the GitHub API.

You'll notice that when a user is successfully connected, we received an `authId`; it's a power concept introduced by Pizzly. The `authId` acts as a reference to the OAuth payload (i.e. the `access_token` and `refresh_token`). While the `access_token` and `refresh_token` expire and/or change over time, the `authId` is always the same. Think of it as something like a user identity.

## Supported APIs

[![Some pre-configured APIs with Pizzly](/views/assets/img/docs/pizzly-preconfigured-apis.jpg)](https://github.com/Bearer/Pizzly/wiki/Supported-APIs)

More than 50 APIs are preconfigured to work out-of-the-box. Including:

- **Communication**: Gmail, Microsoft Teams, Slack, Zoom;
- **CRM**: Front, Hubspot, Salesforce, etc.
- **Developer tools**: BitBucket, GitHub, GitLab, etc.
- **Finance**: Xero, Sellsy, Zoho Books, etc.
- **Productivity**: Asana, Google Drive, Google Sheets, Jira, Trello, etc.
- **Social**: Facebook, LinkedIn, Reddit, etc.
- **[and more...](https://github.com/Bearer/Pizzly/wiki/Supported-APIs)**

Each API consists of a JSON configuration file, stored within the `/integrations` directory. Here's an example with the GitHub configuration file ([`/integrations/github.json`](/integrations/github.json)):

```json
{
  "name": "GitHub",
  "auth": {
    "authorizationURL": "https://github.com/login/oauth/authorize",
    "tokenURL": "https://github.com/login/oauth/access_token",
    "authType": "OAUTH2",
    "tokenParams": {},
    "authorizationParams": {},
    "auth": { "accessType": "offline" }
  },
  "request": {
    "baseURL": "https://api.github.com/",
    "headers": {
      "Accept": "application/vnd.github.v3+json",
      "Authorization": "token ${auth.accessToken}",
      "User-Agent": "Pizzly"
    }
  }
}
```

And adding new APIs is straightforward. Just create a new configuration file within the `/integrations` folder of your Pizzly's instance. If you feel like sharing, you can even create a PR so that other developers will be able to use it as well!

## Why Pizzly?

Pizzly originally started at Bearer.sh as a way to simplify the developer's journey and ease the building of API integrations. OAuth is a great framework, but the difficulty and wide range of implementation makes it painful to use and tends to slow down the ability to integrate with new APIs.

_But seriously, why Pizzly? We're fan of bears and fell in love with this [sweet hybrid](https://en.wikipedia.org/wiki/Grizzly–polar_bear_hybrid) one 🐻_

## Contributing

While Pizzly is actively backed by Bearer's engineering team, the main purpose of this repository is to continue to improve Pizzly, making it larged and easier to use. We are grateful to each contributors and encourage you to participate by reporting bugs, ask for improvements and propose changes to the code.

### Covenant Code of Conduct

Pizzly has adopted the Contributor Covenant Code of Conduct (version 2.0), available at https://www.contributor-covenant.org/version/2/0/code_of_conduct.html. We expect project participants to adhere to.

### Contributing Guide

All work on Pizzly happens directly on [GitHub](https://github.com/bearer/pizzly). Both Bearer.sh team members and external contributors send pull requests which go through the same review process. Submit all changes directly to the [`master branch`](https://github.com/bearer/pizzly/tree/master). We don’t use separate branches for development or for upcoming releases.

To report a bug or a feedback, use [GitHub Issues](/issues). We keep a close eye on this and try to labelize each new request. If you're fixing a bug or working on a new feature, submit a [pull request]() with detail on which changes you've made.

While there are no templates yet, we still recommend to provide as much detail as possible. Consider that someone external to the project should understand your request at first glance.

### License

Pizzly is MIT licensed. See the [LICENSE file](https://github.com/Bearer/Pizzly/blob/master/LICENSE.md) for more information.

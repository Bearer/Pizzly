/**
 * Proxy feature
 *
 * Use Pizzly as a proxy to make authenticated
 * requests to third-party APIs.
 */

import express from 'express'
import * as access from '../lib/access'
import { incomingRequestHandler } from '../lib/proxy'

const proxy = express.Router()

/**
 * Proxy authentication middleware
 *
 * Authenticated requests to the proxy service can use both a publishable key
 * (using ?pizzly_pkey=... as a query string) or a secret key (using
 * the Authentication header).
 *
 * By default requests using a publishable key are allowed, even if, as its name
 * implies, the publishable key is public (available in your website source code).
 * It's still considered safe, as you need both a valid publishable key and authId
 * to make requests to a third party API.
 */

proxy.use((req, res, next) => {
  // Limit access to the requests having a valid secret key only
  const proxyUsesSecretKeyOnly = Boolean(process.env.PROXY_USES_SECRET_KEY_ONLY)

  if (!proxyUsesSecretKeyOnly && req.query['pizzly_pkey']) {
    return access.publishableKey(req, res, next)
  } else {
    return access.secretKey(req, res, next)
  }
})

/**
 * Handle proxy requests.
 *
 * Some examples:
 *  - GET /github/user/ will retrieve information from GitHub API on the "/user" endpoint
 *  - POST /slack/reminders.add will create a reminder on Slack API "/reminders.add" endpoint.
 */

proxy.all('/:integration*', incomingRequestHandler)

/**
 * Error handling
 */

proxy.use((req, res, next) => {
  return res.status(404).json({ error: { type: 'missing', message: 'Ressource not found' } })
})

proxy.use((err, req, res, next) => {
  let status = 400
  let type = 'invalid'
  let message = 'Bad request'

  if (err.type && err.status && err.message) {
    status = err.status
    type = err.type
    message = err.message
  } else {
    console.error(err)
  }

  return res.status(status).json({ error: { type, message } })
})

export { proxy }

import { Router } from 'express'
import { connectContext, callbackContext } from './context'
import { connectConfig, callbackConfig } from './config'
import { session, destroySession, destroySessionOnError } from './session'
import { authenticate, fetchAuthDetails } from './strategy'
import { errorHandler } from './error-handler'
import { authSuccess } from './success'
import { connectAuthId, callbackAuthId } from './auth-id'
import { revoke } from './revoke'
import { connectSetupId } from './setup-id'
import { compose } from 'compose-middleware'
import { cors } from '../../proxy/cors'
import { configureAuthDetailsRequest } from '../configure-request'
import { authDetailsResponse } from '../auth-details'
import { connectBuid } from '../../middlewares/set-identifiers'

export default () => {
  const authenticateAndRespond = compose(
    authenticate,
    destroySession,
    authSuccess
  )

  const router = Router()

  router.use(session())

  router.get('/callback', callbackContext, callbackConfig, callbackAuthId, authenticateAndRespond)

  router.get(
    '/:buid',
    connectBuid,
    connectContext,
    connectSetupId,
    connectConfig,
    connectAuthId,
    authenticateAndRespond
  )

  router.delete('/:buid/revoke/:authId', revoke)

  router.use(destroySessionOnError)
  router.use(errorHandler)

  return router
}

export const authHostRouter = () => {
  const router = Router()

  router.use(cors)

  router.get('/apis/:aliasBuid/auth/:authId', configureAuthDetailsRequest, fetchAuthDetails, authDetailsResponse)

  return router
}

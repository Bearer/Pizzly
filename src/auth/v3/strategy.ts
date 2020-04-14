import { NextFunction, Response } from 'express'

import { EAuthType, TAuthenticateRequest } from './types'
import {
  OAuthOnlyEndpoint,
  InvalidAuthType
  // MissingAuthId,
  //  CredentialsNotConfigured
} from './errors'
import * as oauth1 from './strategies/oauth1'
import * as oauth2 from './strategies/oauth2'
import { TBackendRequestV4 } from '../../types'
import { asyncMiddleware } from '../../errorHandler'

const strategies = {
  [EAuthType.OAuth1]: oauth1,
  [EAuthType.OAuth2]: oauth2
}

export const isOAuthType = (authType: EAuthType) => [EAuthType.OAuth1, EAuthType.OAuth2].includes(authType)

export const authenticate = (req: TAuthenticateRequest, res: Response, next: NextFunction) => {
  const { authType } = req.integrationConfig

  if (!isOAuthType(authType)) {
    throw new OAuthOnlyEndpoint(authType)
  }

  strategies[authType].authenticate(req, res, next)
}

export const fetchAuthDetails = asyncMiddleware(async (req: TBackendRequestV4, _res: Response, next: NextFunction) => {
  const { buid, authId, integration, setupId } = req

  const integrationConfig = await integration.config()
  const { authType } = integrationConfig

  if (!Object.values(EAuthType).includes(authType)) {
    throw new InvalidAuthType(authType)
  }

  const strategy = strategies[authType]

  // if (isOAuthType(authType)) {
  //   if (!authId) {
  //     throw new MissingAuthId(buid)
  //   }
  // } else if (!setupId) {
  //   throw new CredentialsNotConfigured(buid)
  // }

  const params = {
    buid,
    authId,
    integration,
    setupId,
    store: req.store,
    setupIdFromRequest: !!req.query.setupId
  }

  // console.log(params)
  // console.log(integrationConfig)
  req.auth = await strategy.fetchAuthDetails(params, integrationConfig)

  console.log('Auth', req.auth)

  next()
})

import { URL } from 'url'
import axios from 'axios'
import querystring from 'querystring'

const inspectHeaders = {
  'Content-Type': 'application/x-www-form-urlencoded',
  'User-Agent': 'Bearer.sh'
}

const fetchConfiguration = async (issuerIdentifierURL: string): Promise<OpenIdConfiguration | undefined> => {
  try {
    return (await axios.get(`${issuerIdentifierURL}/.well-known/openid-configuration`)).data
  } catch (e) {
    console.error(e)
  }
}

const inspectToken = async ({
  clientID,
  clientSecret,
  introspectionEndpoint,
  token,
  tokenType
}: InspectTokenParams): Promise<TokenMetadata | undefined> => {
  const body = querystring.stringify({ token, token_type_hint: tokenType })
  const options = { auth: { username: clientID, password: clientSecret }, headers: inspectHeaders }

  try {
    return (await axios.post(introspectionEndpoint, body, options)).data
  } catch (e) {
    console.error(e)
  }
}

export const inspectAccessToken = async ({
  accessToken,
  clientID,
  clientSecret,
  tokenURL
}: InspectAccessTokenParams) => {
  const parsedTokenURL = new URL(tokenURL)
  const config = await fetchConfiguration(parsedTokenURL.origin)

  if (config && config.introspection_endpoint) {
    return inspectToken({
      clientID,
      clientSecret,
      introspectionEndpoint: config.introspection_endpoint,
      token: accessToken,
      tokenType: TokenType.AccessToken
    })
  }
}

interface InspectAccessTokenParams {
  accessToken: string
  clientID: string
  clientSecret: string
  tokenURL: string
}

interface InspectTokenParams {
  clientID: string
  clientSecret: string
  introspectionEndpoint: string
  token: string
  tokenType: TokenType
}

interface OpenIdConfiguration {
  introspection_endpoint?: string
}

enum TokenType {
  AccessToken = 'access_token'
}

export interface TokenMetadata {
  exp?: number
  iat?: number
}

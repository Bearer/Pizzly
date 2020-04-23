export const {
  COOKIE_SECRET,
  HOSTNAME,
  DB_USER,
  DB_PASSWORD,
  DB_HOST,
  DB_PORT,
  DB_DATABASE,
  HEROKU_POSTGRESQL_ONYX_URL,
  DATABASE_URL
} = process.env as {
  COOKIE_SECRET: string
  HOSTNAME: string
  POSTGRES_URL?: string
  DB_USER?: string
  DB_PASSWORD?: string
  DB_HOST?: string
  DB_PORT?: string
  DB_DATABASE?: string
  HEROKU_POSTGRESQL_ONYX_URL?: string
  DATABASE_URL?: string
}

export const connection = DATABASE_URL ||
  HEROKU_POSTGRESQL_ONYX_URL || {
    user: DB_USER!,
    password: DB_PASSWORD!,
    host: DB_HOST!,
    port: DB_PORT!,
    database: DB_DATABASE!
  }

export const AUTH_CALLBACK_URL = process.env.AUTH_CALLBACK_URL || `https://${HOSTNAME}/auth/callback`

// const AUTH_VHOST = `https://${AUTH_SUBDOMAIN}.${HOSTNAME}`
// const PROXY_VHOST = `https://${PROXY_SUBDOMAIN}.${HOSTNAME}`

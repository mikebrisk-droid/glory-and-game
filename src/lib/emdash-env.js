const REQUIRED_PRODUCTION_EMDASH_ENV = [
  'EMDASH_DATABASE_URL',
  'EMDASH_STORAGE_ENDPOINT',
  'EMDASH_STORAGE_BUCKET',
  'EMDASH_STORAGE_ACCESS_KEY_ID',
  'EMDASH_STORAGE_SECRET_ACCESS_KEY',
]

function readEnvValue(env, key) {
  const value = env[key]
  return typeof value === 'string' ? value.trim() : ''
}

export function isProductionEmdashConfigured(env = process.env) {
  return REQUIRED_PRODUCTION_EMDASH_ENV.every((key) => Boolean(readEnvValue(env, key)))
}

export function isEmdashEnabled(env = process.env) {
  return env.NODE_ENV !== 'production' || isProductionEmdashConfigured(env)
}

export function getProductionEmdashConfig(env = process.env) {
  if (!isProductionEmdashConfigured(env)) {
    return null
  }

  return {
    databaseUrl: readEnvValue(env, 'EMDASH_DATABASE_URL'),
    databaseAuthToken: readEnvValue(env, 'EMDASH_DATABASE_AUTH_TOKEN') || undefined,
    storageEndpoint: readEnvValue(env, 'EMDASH_STORAGE_ENDPOINT'),
    storageBucket: readEnvValue(env, 'EMDASH_STORAGE_BUCKET'),
    storageAccessKeyId: readEnvValue(env, 'EMDASH_STORAGE_ACCESS_KEY_ID'),
    storageSecretAccessKey: readEnvValue(env, 'EMDASH_STORAGE_SECRET_ACCESS_KEY'),
    storagePublicUrl: readEnvValue(env, 'EMDASH_STORAGE_PUBLIC_URL') || undefined,
    storageRegion: readEnvValue(env, 'EMDASH_STORAGE_REGION') || undefined,
  }
}

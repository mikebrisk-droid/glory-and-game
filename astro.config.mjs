import { defineConfig, sessionDrivers } from 'astro/config'
import { fileURLToPath } from 'node:url'
import react from '@astrojs/react'
import vercel from '@astrojs/vercel'
import emdash, { local, s3 } from 'emdash/astro'
import { libsql, sqlite } from 'emdash/db'
import { getProductionEmdashConfig, isEmdashEnabled } from './src/lib/emdash-env.js'

const isDev = process.argv.includes('dev')
const productionEmdashConfig = getProductionEmdashConfig()
const emdashEnabled = isEmdashEnabled()
const emdashDisabledAliases = emdashEnabled
  ? {}
  : {
      'virtual:emdash/config': fileURLToPath(new URL('./src/stubs/emdash-config.js', import.meta.url)),
      'virtual:emdash/dialect': fileURLToPath(new URL('./src/stubs/emdash-dialect.js', import.meta.url)),
      'virtual:emdash/storage': fileURLToPath(new URL('./src/stubs/emdash-storage.js', import.meta.url)),
      'virtual:emdash/auth': fileURLToPath(new URL('./src/stubs/emdash-auth.js', import.meta.url)),
      'virtual:emdash/plugins': fileURLToPath(new URL('./src/stubs/emdash-empty-array.js', import.meta.url)),
      'virtual:emdash/sandbox-runner': fileURLToPath(new URL('./src/stubs/emdash-sandbox-runner.js', import.meta.url)),
      'virtual:emdash/sandboxed-plugins': fileURLToPath(new URL('./src/stubs/emdash-empty-array.js', import.meta.url)),
      'virtual:emdash/media-providers': fileURLToPath(new URL('./src/stubs/emdash-empty-array.js', import.meta.url)),
      'virtual:emdash/admin-registry': fileURLToPath(new URL('./src/stubs/emdash-empty-object.js', import.meta.url)),
      'virtual:emdash/block-components': fileURLToPath(new URL('./src/stubs/emdash-empty-object.js', import.meta.url)),
      'virtual:emdash/seed': fileURLToPath(new URL('./src/stubs/emdash-seed.js', import.meta.url)),
    }

const emdashIntegration = emdashEnabled
  ? emdash(
      productionEmdashConfig
        ? {
            database: libsql({
              url: productionEmdashConfig.databaseUrl,
              authToken: productionEmdashConfig.databaseAuthToken,
            }),
            storage: s3({
              endpoint: productionEmdashConfig.storageEndpoint,
              bucket: productionEmdashConfig.storageBucket,
              accessKeyId: productionEmdashConfig.storageAccessKeyId,
              secretAccessKey: productionEmdashConfig.storageSecretAccessKey,
              publicUrl: productionEmdashConfig.storagePublicUrl,
              region: productionEmdashConfig.storageRegion,
            }),
          }
        : {
            database: sqlite({ url: 'file:./.emdash/data.db' }),
            storage: local({
              directory: './.emdash/uploads',
              baseUrl: '/_emdash/api/media/file',
            }),
          },
    )
  : null

export default defineConfig({
  integrations: [
    react(),
    ...(emdashIntegration ? [emdashIntegration] : []),
  ],
  adapter: vercel({
    includeFiles: [
      './node_modules/@libsql',
    ],
  }),
  output: 'server',
  site: 'https://gloryandgame.com',
  vite: {
    resolve: {
      alias: emdashDisabledAliases,
    },
  },
  session: isDev
    ? {
        driver: sessionDrivers.memory(),
        cookie: {
          name: 'gg-session',
          secure: false,
          sameSite: 'lax',
          httpOnly: true,
        },
      }
    : {
        driver: sessionDrivers.s3({
          endpoint: productionEmdashConfig?.storageEndpoint,
          bucket: productionEmdashConfig?.storageBucket,
          accessKeyId: productionEmdashConfig?.storageAccessKeyId,
          secretAccessKey: productionEmdashConfig?.storageSecretAccessKey,
          region: productionEmdashConfig?.storageRegion || 'us-east-1',
          base: 'sessions',
        }),
        cookie: {
          name: 'gg-session',
          secure: true,
          sameSite: 'lax',
          httpOnly: true,
        },
      },
})

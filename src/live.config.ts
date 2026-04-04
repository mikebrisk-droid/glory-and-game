import { defineLiveCollection } from 'astro:content'
import { isEmdashEnabled } from './lib/emdash-env.js'

const collections = {}

if (isEmdashEnabled()) {
  const { emdashLoader } = await import('emdash/runtime')

  Object.assign(collections, {
    _emdash: defineLiveCollection({ loader: emdashLoader() }),
  })
}

export { collections }

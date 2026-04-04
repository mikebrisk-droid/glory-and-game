import mediaSeed from '../../.emdash/seed.json'
import { isEmdashEnabled } from './emdash-env.js'

function getSeedTaxonomy(name) {
  const taxonomy = Array.isArray(mediaSeed.taxonomies)
    ? mediaSeed.taxonomies.find((item) => item.name === name)
    : null

  return Array.isArray(taxonomy?.terms) ? taxonomy.terms : []
}

function getEntryTaxonomyTerms(entry, taxonomyName) {
  const seedTerms = getSeedTaxonomy(taxonomyName)
  const assignedSlugs = Array.isArray(entry?.taxonomies?.[taxonomyName]) ? entry.taxonomies[taxonomyName] : []

  return assignedSlugs
    .map((slug) => seedTerms.find((term) => term.slug === slug))
    .filter(Boolean)
}

function normalizePost(entry) {
  const data = entry?.data || {}

  return {
    id: typeof entry?.id === 'string' ? entry.id : '',
    slug: typeof entry?.slug === 'string' ? entry.slug : '',
    title: typeof data.title === 'string' ? data.title : 'Untitled story',
    dek: typeof data.dek === 'string' ? data.dek : '',
    body: Array.isArray(data.body) ? data.body : [],
    coverImage: data.cover_image || null,
    authorName: typeof data.author_name === 'string' ? data.author_name : 'Glory & Game',
    mediaKind: typeof data.media_kind === 'string' ? data.media_kind : 'feature',
    featured: Boolean(data.featured),
    storyDate: typeof data.story_date === 'string' ? data.story_date : '',
    categories: getEntryTaxonomyTerms(entry, 'category'),
    tags: getEntryTaxonomyTerms(entry, 'tag'),
  }
}

function sortPosts(posts) {
  return [...posts].sort((left, right) => {
    const leftTime = Date.parse(left.storyDate || '') || 0
    const rightTime = Date.parse(right.storyDate || '') || 0
    return rightTime - leftTime
  })
}

function filterSeedPosts(posts, { category, tag }) {
  return posts.filter((post) => {
    const matchesCategory = category ? post.categories.some((term) => term.slug === category) : true
    const matchesTag = tag ? post.tags.some((term) => term.slug === tag) : true
    return matchesCategory && matchesTag
  })
}

function getSeedPosts(options = {}) {
  const seedEntries = Array.isArray(mediaSeed.content?.media_posts) ? mediaSeed.content.media_posts : []
  const publishedEntries = seedEntries.filter((entry) => entry.status === 'published').map(normalizePost)
  return filterSeedPosts(sortPosts(publishedEntries), options)
}

async function getLiveMediaIndex(options = {}) {
  const { getEmDashCollection, getTaxonomyTerms, getTermsForEntries } = await import('emdash')
  const { entries, error } = await getEmDashCollection('media_posts', {
    status: 'published',
    orderBy: { story_date: 'desc', created_at: 'desc' },
    limit: 24,
    where: {
      ...(options.category ? { category: options.category } : {}),
      ...(options.tag ? { tag: options.tag } : {}),
    },
  })

  if (error) {
    return {
      posts: [],
      categories: [],
      tags: [],
      error,
    }
  }

  const categories = await getTaxonomyTerms('category')
  const tags = await getTaxonomyTerms('tag')
  const entryIds = entries
    .map((entry) => (typeof entry.data?.id === 'string' ? entry.data.id : ''))
    .filter(Boolean)
  const [categoryMap, tagMap] = await Promise.all([
    getTermsForEntries('media_posts', entryIds, 'category'),
    getTermsForEntries('media_posts', entryIds, 'tag'),
  ])

  const posts = entries.map((entry) => {
    const data = entry.data || {}
    const entryId = typeof data.id === 'string' ? data.id : ''
    return {
      id: entryId,
      slug: entry.id,
      title: typeof data.title === 'string' ? data.title : 'Untitled story',
      dek: typeof data.dek === 'string' ? data.dek : '',
      body: Array.isArray(data.body) ? data.body : [],
      coverImage: data.cover_image || null,
      authorName: typeof data.author_name === 'string' ? data.author_name : 'Glory & Game',
      mediaKind: typeof data.media_kind === 'string' ? data.media_kind : 'feature',
      featured: Boolean(data.featured),
      storyDate: typeof data.story_date === 'string' ? data.story_date : '',
      categories: categoryMap.get(entryId) || [],
      tags: tagMap.get(entryId) || [],
    }
  })

  return {
    posts,
    categories,
    tags,
    error: null,
  }
}

async function getLiveMediaEntry(slug) {
  const { getEmDashEntry, getEntryTerms } = await import('emdash')
  const { entry, error } = await getEmDashEntry('media_posts', slug)

  if (error || !entry) {
    return {
      post: null,
      error,
    }
  }

  const data = entry.data || {}
  const entryId = typeof data.id === 'string' ? data.id : ''
  const [categories, tags] = await Promise.all([
    entryId ? getEntryTerms('media_posts', entryId, 'category') : Promise.resolve([]),
    entryId ? getEntryTerms('media_posts', entryId, 'tag') : Promise.resolve([]),
  ])

  return {
    post: {
      id: entryId,
      slug: entry.id,
      title: typeof data.title === 'string' ? data.title : 'Untitled story',
      dek: typeof data.dek === 'string' ? data.dek : '',
      body: Array.isArray(data.body) ? data.body : [],
      coverImage: data.cover_image || null,
      authorName: typeof data.author_name === 'string' ? data.author_name : 'Glory & Game',
      mediaKind: typeof data.media_kind === 'string' ? data.media_kind : 'feature',
      featured: Boolean(data.featured),
      storyDate: typeof data.story_date === 'string' ? data.story_date : '',
      categories,
      tags,
    },
    error: null,
  }
}

export async function getMediaIndex(options = {}) {
  if (isEmdashEnabled()) {
    return getLiveMediaIndex(options)
  }

  return {
    posts: getSeedPosts(options),
    categories: getSeedTaxonomy('category'),
    tags: getSeedTaxonomy('tag'),
    error: null,
  }
}

export async function getMediaPost(slug) {
  if (isEmdashEnabled()) {
    return getLiveMediaEntry(slug)
  }

  const post = getSeedPosts().find((entry) => entry.slug === slug) || null

  return {
    post,
    error: null,
  }
}


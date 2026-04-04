export function createDialect() {
  throw new Error('EmDash is disabled for this build.')
}

export function createSessionDialect() {
  return undefined
}

export function getBookmarkCookieName() {
  return 'emdash-disabled'
}

export function getD1Binding() {
  return undefined
}

export function getDefaultConstraint() {
  return undefined
}

export function isSessionEnabled() {
  return false
}

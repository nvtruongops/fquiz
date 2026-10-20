function getCurrentTokenVersion(version: number | undefined) {
  if (typeof version !== 'number') return 1
  if (!Number.isInteger(version)) return 1
  return version > 0 ? version : 1
}

function getTokenVersionFilter(version: number | undefined) {
  return version === undefined ? { token_version: { $exists: false } } : { token_version: version }
}

export function buildTokenVersionUpdate(version: number | undefined) {
  const currentVersion = getCurrentTokenVersion(version)
  return {
    nextVersion: currentVersion + 1,
    versionFilter: getTokenVersionFilter(version),
  }
}

/**
 * Decide which target control the Studio preview bar shows. Groups load
 * independently of the Studio view, so an empty list is ambiguous: the
 * toggle needs groups, errors need a retry, and a loaded-but-empty store
 * needs a pointer to group creation instead of dead silence.
 *
 * Returns 'toggle' | 'loading' | 'error' | 'empty'.
 */
export function resolveTargetSlot({ groupCount = 0, groupsLoading = false, groupsError = null, devicesError = null } = {}) {
  if (groupCount > 0) return 'toggle'
  if (groupsError || devicesError) return 'error'
  if (groupsLoading) return 'loading'
  return 'empty'
}

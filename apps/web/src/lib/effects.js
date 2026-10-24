// Effect identity helpers. Firmware reorders effect indices across versions
// (Candle is 41 on old builds, 88 on 0.16.x), so the NAME is the stable
// identity and indices always resolve against a concrete list.

export function effectNameById(list, id) {
  if (!Array.isArray(list)) return null
  return list.find((e) => e?.id === id)?.name ?? null
}

export function effectIdByName(list, name) {
  if (!Array.isArray(list)) return null
  return list.find((e) => e?.name === name)?.id ?? null
}

// Build picker entries from a device live /json/eff name list, enriching
// categories from the static catalog where the name is known.
export function toLiveEntries(names, staticCatalog = []) {
  if (!Array.isArray(names)) return []
  const cats = new Map(
    (Array.isArray(staticCatalog) ? staticCatalog : []).map((e) => [e?.name, e?.category]),
  )
  return names.map((name, id) => ({ id, name, category: cats.get(name) ?? 'Device' }))
}

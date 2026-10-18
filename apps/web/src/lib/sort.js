export function compareText(a, b) {
  return String(a ?? '').localeCompare(String(b ?? ''), undefined, { sensitivity: 'base', numeric: true })
}

export function sortedStrings(list) {
  return [...(list ?? [])].sort(compareText)
}

export function sortedByName(list) {
  return [...(list ?? [])].sort((a, b) => compareText(a?.name, b?.name))
}

export function sortedByLabel(list) {
  return [...(list ?? [])].sort((a, b) => compareText(a?.label, b?.label))
}

/**
 * Order device rows for the Device Manager. Modes: 'manual' (store order),
 * 'az', 'za', 'date' (newest first by sort_order), 'online' (online first),
 * 'updates' (firmware update available first). Ties break alphabetically.
 * outdatedIds lists device ids with a pending firmware update.
 */
export function sortDevices(list, mode = 'manual', outdatedIds = []) {
  const arr = [...(list ?? [])]
  const outdated = new Set(outdatedIds ?? [])
  switch (mode) {
    case 'az':
      return arr.sort((a, b) => compareText(a?.name, b?.name))
    case 'za':
      return arr.sort((a, b) => compareText(b?.name, a?.name))
    case 'date':
      return arr.sort((a, b) => (b?.sort_order ?? 0) - (a?.sort_order ?? 0))
    case 'online':
      return arr.sort((a, b) => (
        Number(b?.is_online === 1) - Number(a?.is_online === 1) || compareText(a?.name, b?.name)
      ))
    case 'updates':
      return arr.sort((a, b) => (
        Number(outdated.has(b?.id)) - Number(outdated.has(a?.id)) || compareText(a?.name, b?.name)
      ))
    default:
      return arr
  }
}

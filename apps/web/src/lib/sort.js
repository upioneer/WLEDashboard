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

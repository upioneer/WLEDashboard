const M_TO_FT = 3.28084

export function formatDimension(meters, unitSystem = 'metric') {
  const val = Number(meters) || 0
  if (unitSystem === 'imperial') {
    const feet = val * M_TO_FT
    return `${feet.toFixed(1)} ft`
  }
  return `${val.toFixed(1)} m`
}

export function displayToMeters(value, unitSystem = 'metric') {
  const val = Number(value) || 0
  if (unitSystem === 'imperial') {
    return val / M_TO_FT
  }
  return val
}

export function metersToDisplay(meters, unitSystem = 'metric') {
  const val = Number(meters) || 0
  if (unitSystem === 'imperial') {
    return Number((val * M_TO_FT).toFixed(1))
  }
  return Number(val.toFixed(1))
}

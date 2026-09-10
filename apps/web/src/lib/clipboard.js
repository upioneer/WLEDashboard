/**
 * Universal clipboard copy utility supporting both secure (HTTPS/localhost)
 * and insecure (HTTP on LAN / IP) browser execution contexts.
 *
 * @param {string} text - The text to copy to the clipboard.
 * @returns {Promise<boolean>} Resolves to true if copying succeeded, false otherwise.
 */
export async function copyToClipboard(text) {
  if (text === null || text === undefined) return false
  const str = String(text)

  // 1. Try modern async Clipboard API if available and in secure context
  if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(str)
      return true
    } catch (_) {
      // Fall through to fallback
    }
  }

  // 2. Fallback via temporary DOM textarea (works in HTTP over LAN)
  try {
    const textArea = document.createElement('textarea')
    textArea.value = str
    
    // Position off-screen and invisible without triggering scrolling
    textArea.style.position = 'fixed'
    textArea.style.top = '0'
    textArea.style.left = '0'
    textArea.style.width = '2em'
    textArea.style.height = '2em'
    textArea.style.padding = '0'
    textArea.style.border = 'none'
    textArea.style.outline = 'none'
    textArea.style.boxShadow = 'none'
    textArea.style.background = 'transparent'
    textArea.style.opacity = '0'
    textArea.style.pointerEvents = 'none'
    textArea.style.zIndex = '-9999'
    textArea.setAttribute('readonly', '')

    document.body.appendChild(textArea)
    textArea.focus({ preventScroll: true })
    textArea.select()
    textArea.setSelectionRange(0, textArea.value.length)

    const successful = document.execCommand('copy')
    document.body.removeChild(textArea)
    return successful
  } catch (err) {
    console.error('Failed to copy to clipboard:', err)
    return false
  }
}

import dgram from 'dgram'

const udpSocket = dgram.createSocket('udp4')
const DDP_PORT = 4048 // Direct Display Protocol UDP port

/**
 * Send DDP (Direct Display Protocol) RGB frame packet to WLED controller.
 * DDP Header format (10 bytes):
 * Flags (1 byte) | Sequence (1 byte) | Data Type (1 byte) | ID (1 byte) | Offset (4 bytes) | Length (2 bytes)
 */
export function sendDdpRgbFrame(targetIp, rgbPixels = []) {
  if (!targetIp || !Array.isArray(rgbPixels) || rgbPixels.length === 0) return

  const pixelData = new Uint8Array(rgbPixels.length * 3)
  for (let i = 0; i < rgbPixels.length; i++) {
    const [r, g, b] = rgbPixels[i] || [0, 0, 0]
    pixelData[i * 3]     = r
    pixelData[i * 3 + 1] = g
    pixelData[i * 3 + 2] = b
  }

  const dataLength = pixelData.length
  const header = new Uint8Array(10)
  header[0] = 0x41 // Flags: VER=1, PUSH=1
  header[1] = 0x00 // Sequence number
  header[2] = 0x01 // Data Type: RGB 8-bit
  header[3] = 0x01 // ID
  // Offset (4 bytes 0)
  header[4] = 0; header[5] = 0; header[6] = 0; header[7] = 0
  // Length (2 bytes big endian)
  header[8] = (dataLength >> 8) & 0xff
  header[9] = dataLength & 0xff

  const packet = Buffer.concat([Buffer.from(header), Buffer.from(pixelData)])

  udpSocket.send(packet, 0, packet.length, DDP_PORT, targetIp, (err) => {
    if (err) {
      // Quiet UDP packet drop guard
    }
  })
}

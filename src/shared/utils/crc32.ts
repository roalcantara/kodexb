const CRC32_TABLE_SIZE = 256
const CRC32_BIT_COUNT = 8
const CRC32_POLYNOMIAL = 0xedb88320
const CRC32_INIT = 0xffffffff

const TABLE = (() => {
  const t = new Uint32Array(CRC32_TABLE_SIZE)
  for (let i = 0; i < CRC32_TABLE_SIZE; i++) {
    let c = i
    for (let j = 0; j < CRC32_BIT_COUNT; j++) {
      c = c & 1 ? CRC32_POLYNOMIAL ^ (c >>> 1) : c >>> 1
    }
    t[i] = c
  }
  return t
})()

/** Returns an unsigned 32-bit CRC32 checksum for the given string (UTF-16 code units). */
export function crc32(str: string): number {
  let crc = CRC32_INIT
  for (let i = 0; i < str.length; i++) {
    crc = (crc >>> CRC32_BIT_COUNT) ^ (TABLE[(crc ^ str.charCodeAt(i)) & 0xff] ?? 0)
  }
  return (crc ^ CRC32_INIT) >>> 0
}

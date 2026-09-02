/**
 * Cryptographic random byte generation using the Web Crypto API.
 * Wraps crypto.getRandomValues() with batching for large requests.
 */

/**
 * Generate cryptographically secure random bytes.
 * @param {number} count - Number of random bytes to generate
 * @returns {Uint8Array} Array of random bytes
 */
export function getRandomBytes(count) {
  // crypto.getRandomValues has a max of 65536 bytes per call
  const MAX_BATCH = 65536;

  if (count <= MAX_BATCH) {
    return crypto.getRandomValues(new Uint8Array(count));
  }

  const result = new Uint8Array(count);
  let offset = 0;

  while (offset < count) {
    const batchSize = Math.min(MAX_BATCH, count - offset);
    const batch = crypto.getRandomValues(new Uint8Array(batchSize));
    result.set(batch, offset);
    offset += batchSize;
  }

  return result;
}

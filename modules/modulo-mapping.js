/**
 * Modulo mapping: maps random bytes to character pool using the modulo operator.
 * This is the simple but potentially biased method.
 *
 * When 256 is not evenly divisible by pool.length, some characters
 * receive one extra byte mapping, giving them a slightly higher probability.
 */

/**
 * Select a character using modulo mapping.
 * @param {number} randomByte - A single random byte (0-255)
 * @param {string} pool - The character pool
 * @returns {string} Selected character
 */
export function moduloSelect(randomByte, pool) {
  return pool[randomByte % pool.length];
}

/**
 * Generate a frequency distribution using modulo mapping.
 * @param {string} pool - The character pool
 * @param {Uint8Array} randomBytes - Pre-generated random bytes
 * @param {number} sampleCount - Number of samples to use
 * @returns {Object} Frequency map { char: count }
 */
export function moduloDistribution(pool, randomBytes, sampleCount) {
  const freq = {};
  for (let i = 0; i < pool.length; i++) {
    freq[pool[i]] = 0;
  }

  for (let i = 0; i < sampleCount; i++) {
    const char = pool[randomBytes[i] % pool.length];
    freq[char]++;
  }

  return freq;
}

/**
 * Calculate the theoretical mapping counts for modulo method.
 * Shows how many byte values map to each character index.
 * @param {number} poolSize - Size of the character pool
 * @returns {number[]} Array of mapping counts per character index
 */
export function moduloMappingCounts(poolSize) {
  const base = Math.floor(256 / poolSize);
  const remainder = 256 % poolSize;
  const counts = [];

  for (let i = 0; i < poolSize; i++) {
    counts.push(i < remainder ? base + 1 : base);
  }

  return counts;
}

/**
 * Generate a password using modulo mapping.
 * @param {string} pool - The character pool
 * @param {number} length - Password length
 * @returns {string} Generated password
 */
export function moduloPassword(pool, length) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let password = '';
  for (let i = 0; i < length; i++) {
    password += pool[bytes[i] % pool.length];
  }
  return password;
}

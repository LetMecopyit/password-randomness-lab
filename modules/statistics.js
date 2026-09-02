/**
 * Statistical analysis functions for comparing distributions.
 */

/**
 * Calculate the chi-squared test statistic.
 * Measures how far observed frequencies deviate from expected uniform distribution.
 * @param {Object} observed - Frequency map { char: count }
 * @param {number} expected - Expected count per character
 * @returns {number} Chi-squared statistic
 */
export function chiSquared(observed, expected) {
  let sum = 0;
  for (const key of Object.keys(observed)) {
    const diff = observed[key] - expected;
    sum += (diff * diff) / expected;
  }
  return sum;
}

/**
 * Calculate the maximum absolute deviation from expected percentage.
 * @param {Object} observed - Frequency map { char: count }
 * @param {number} totalSamples - Total number of samples
 * @param {number} poolSize - Size of the character pool
 * @returns {{ maxDev: number, maxChar: string }} Max deviation percentage and which character
 */
export function maxDeviation(observed, totalSamples, poolSize) {
  const expectedPct = 100 / poolSize;
  let maxDev = 0;
  let maxChar = '';

  for (const [char, count] of Object.entries(observed)) {
    const pct = (count / totalSamples) * 100;
    const dev = Math.abs(pct - expectedPct);
    if (dev > maxDev) {
      maxDev = dev;
      maxChar = char;
    }
  }

  return { maxDev, maxChar };
}

/**
 * Calculate the expected frequency for a uniform distribution.
 * @param {number} totalSamples - Total number of samples
 * @param {number} poolSize - Size of the character pool
 * @returns {number} Expected count per character
 */
export function expectedFrequency(totalSamples, poolSize) {
  return totalSamples / poolSize;
}

/**
 * Convert frequency map to percentage map.
 * @param {Object} freqMap - Frequency map { char: count }
 * @param {number} totalSamples - Total number of samples
 * @returns {Object} Percentage map { char: percentage }
 */
export function toPercentages(freqMap, totalSamples) {
  const result = {};
  for (const [char, count] of Object.entries(freqMap)) {
    result[char] = (count / totalSamples) * 100;
  }
  return result;
}

/**
 * Determine if a frequency is biased (above or below expected).
 * @param {number} count - Observed count
 * @param {number} expected - Expected count
 * @param {number} threshold - Deviation threshold as fraction (e.g., 0.001 = 0.1%)
 * @returns {'over' | 'under' | 'normal'} Bias direction
 */
export function biasDirection(count, expected, threshold) {
  const deviation = (count - expected) / expected;
  if (deviation > threshold) return 'over';
  if (deviation < -threshold) return 'under';
  return 'normal';
}

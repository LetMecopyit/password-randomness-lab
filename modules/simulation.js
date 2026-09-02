/**
 * Simulation orchestrator.
 * Runs both modulo and rejection sampling methods and returns results.
 * Uses chunked processing for large sample counts to keep UI responsive.
 */

import { getRandomBytes } from './crypto-random.js';
import { moduloDistribution } from './modulo-mapping.js';
import { rejectionDistribution } from './rejection-sampling.js';
import { chiSquared, maxDeviation, expectedFrequency, toPercentages } from './statistics.js';

/**
 * Run the full simulation for both methods.
 * @param {string} pool - The character pool
 * @param {number} sampleCount - Number of samples to generate
 * @param {function} onProgress - Progress callback (0-1)
 * @returns {Promise<{ modulo: Object, rejection: Object }>} Results for both methods
 */
export async function runSimulation(pool, sampleCount, onProgress) {
  onProgress(0);

  // For rejection sampling, we need extra bytes to account for rejections.
  // The rejection rate is (256 % pool.length) / 256.
  // Add a 20% buffer to be safe.
  const rejectionRate = (256 % pool.length) / 256;
  const extraBytes = Math.ceil(sampleCount * (1 + rejectionRate * 1.5));
  const totalBytes = sampleCount + extraBytes;

  // Generate random bytes in chunks to avoid blocking
  const CHUNK_SIZE = 200000;
  let allBytes;

  if (totalBytes <= CHUNK_SIZE) {
    allBytes = getRandomBytes(totalBytes);
    onProgress(0.3);
  } else {
    allBytes = new Uint8Array(totalBytes);
    let offset = 0;
    const chunks = Math.ceil(totalBytes / CHUNK_SIZE);

    for (let i = 0; i < chunks; i++) {
      const size = Math.min(CHUNK_SIZE, totalBytes - offset);
      const chunk = getRandomBytes(size);
      allBytes.set(chunk, offset);
      offset += size;
      onProgress(0.3 * ((i + 1) / chunks));

      // Yield to the browser between chunks
      if (i < chunks - 1) {
        await new Promise(resolve => requestAnimationFrame(resolve));
      }
    }
  }

  // Split bytes: first sampleCount for modulo, rest for rejection sampling
  const moduloBytes = allBytes.slice(0, sampleCount);
  const rejectionBytes = allBytes.slice(sampleCount);

  onProgress(0.4);

  // Run modulo distribution
  await yieldToMain();
  const moduloFreq = moduloDistribution(pool, moduloBytes, sampleCount);
  onProgress(0.6);

  // Run rejection sampling distribution
  await yieldToMain();
  const rejectionResult = rejectionDistribution(pool, rejectionBytes, sampleCount);
  onProgress(0.8);

  // Calculate statistics
  const expected = expectedFrequency(sampleCount, pool.length);

  const moduloStats = {
    freq: moduloFreq,
    percentages: toPercentages(moduloFreq, sampleCount),
    chiSquared: chiSquared(moduloFreq, expected),
    maxDeviation: maxDeviation(moduloFreq, sampleCount, pool.length),
    expected: expected,
    expectedPct: 100 / pool.length,
    sampleCount: sampleCount,
  };

  const rejectionStats = {
    freq: rejectionResult.freq,
    percentages: toPercentages(rejectionResult.freq, sampleCount),
    chiSquared: chiSquared(rejectionResult.freq, expected),
    maxDeviation: maxDeviation(rejectionResult.freq, sampleCount, pool.length),
    expected: expected,
    expectedPct: 100 / pool.length,
    sampleCount: sampleCount,
    rejectedCount: rejectionResult.rejectedCount,
  };

  onProgress(1);

  return { modulo: moduloStats, rejection: rejectionStats };
}

/** Yield control to the main thread. */
function yieldToMain() {
  return new Promise(resolve => requestAnimationFrame(resolve));
}

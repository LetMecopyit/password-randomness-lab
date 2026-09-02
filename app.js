/**
 * Password Randomness Lab — Main Application Controller
 *
 * Manages all UI interactions, experiment execution, theoretical calculations,
 * chart rendering, URL state synchronization, and the trust challenge section.
 */

import { moduloMappingCounts, moduloPassword } from './modules/modulo-mapping.js';
import { rejectionLimit, rejectionPassword } from './modules/rejection-sampling.js';
import { runSimulation } from './modules/simulation.js';
import { biasDirection, calculateTheoreticalDistribution } from './modules/statistics.js';

// ============================================
// STATE
// ============================================

const state = {
  pool: 'ABCDEFG',
  sampleCount: 10000,
  mode: 'simulation', // 'simulation' | 'theoretical'
  isRunning: false,
  challengeSwapped: Math.random() < 0.5,
};

// ============================================
// DOM REFERENCES
// ============================================

const dom = {
  // Pool section
  poolPresets: document.getElementById('pool-presets'),
  customPoolInput: document.getElementById('custom-pool-input'),
  poolChars: document.getElementById('pool-chars'),
  poolSize: document.getElementById('pool-size'),
  mathDivision: document.getElementById('math-division'),
  biasWarning: document.getElementById('bias-warning'),
  poolMath: document.getElementById('pool-math'),

  // Methods section
  moduloMappingTable: document.getElementById('modulo-mapping-table'),
  rejectionMappingTable: document.getElementById('rejection-mapping-table'),
  moduloVerdictText: document.getElementById('modulo-verdict-text'),

  // Experiment section
  modeButtons: document.getElementById('mode-buttons'),
  simulationControls: document.getElementById('simulation-controls'),
  sampleButtons: document.getElementById('sample-buttons'),
  shareBtn: document.getElementById('share-link-btn'),
  shareBtnText: document.getElementById('share-btn-text'),
  runBtn: document.getElementById('run-experiment-btn'),
  runBtnText: document.getElementById('run-btn-text'),
  progressContainer: document.getElementById('progress-container'),
  progressBar: document.getElementById('progress-bar'),
  progressText: document.getElementById('progress-text'),

  // Results & Cards
  resultsGrid: document.getElementById('results-grid'),
  moduloChart: document.getElementById('modulo-chart'),
  rejectionChart: document.getElementById('rejection-chart'),
  moduloStats: document.getElementById('modulo-stats'),
  rejectionStats: document.getElementById('rejection-stats'),
  moduloTargetProb: document.getElementById('modulo-target-prob'),
  rejectionTargetProb: document.getElementById('rejection-target-prob'),
  moduloStatusBadge: document.getElementById('modulo-status-badge'),
  rejectionStatusBadge: document.getElementById('rejection-status-badge'),

  mathReasonCard: document.getElementById('math-reason-card'),
  mathReasonBody: document.getElementById('math-reason-body'),
  termsExplainerCard: document.getElementById('terms-explainer-card'),

  // Challenge section
  genAPassword: document.getElementById('gen-a-password'),
  genBPassword: document.getElementById('gen-b-password'),
  genARegen: document.getElementById('gen-a-regen'),
  genBRegen: document.getElementById('gen-b-regen'),
  revealBtn: document.getElementById('reveal-answer-btn'),
  revealContainer: document.getElementById('reveal-container'),
};

// ============================================
// URL STATE SYNCHRONIZATION
// ============================================

function syncStateToURL() {
  const params = new URLSearchParams();
  params.set('pool', state.pool);
  params.set('samples', state.sampleCount.toString());
  params.set('mode', state.mode);

  const newURL = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState(null, '', newURL);
}

function loadStateFromURL() {
  const params = new URLSearchParams(window.location.search);
  const poolParam = params.get('pool');
  const samplesParam = params.get('samples');
  const modeParam = params.get('mode');

  if (modeParam === 'theoretical' || modeParam === 'simulation') {
    state.mode = modeParam;
    updateModeUI();
  }

  if (samplesParam) {
    const parsedSamples = parseInt(samplesParam, 10);
    if ([1000, 10000, 100000, 1000000].includes(parsedSamples)) {
      state.sampleCount = parsedSamples;
      dom.sampleButtons.querySelectorAll('.btn-preset').forEach(b => {
        b.classList.toggle('active', parseInt(b.dataset.count, 10) === parsedSamples);
      });
    }
  }

  if (poolParam && poolParam.length >= 2) {
    setPool(poolParam, false);
    // Select matching preset button if available
    let matchedPreset = false;
    dom.poolPresets.querySelectorAll('.btn-preset').forEach(b => {
      if (b.dataset.pool === poolParam) {
        b.classList.add('active');
        matchedPreset = true;
      } else {
        b.classList.remove('active');
      }
    });

    if (!matchedPreset) {
      dom.poolPresets.querySelectorAll('.btn-preset').forEach(b => b.classList.remove('active'));
      dom.customPoolInput.value = poolParam;
    }
  }
}

// ============================================
// POOL MANAGEMENT
// ============================================

function setPool(poolString, updateURL = true) {
  // Deduplicate characters while preserving order
  const seen = new Set();
  let unique = '';
  for (const ch of poolString) {
    if (!seen.has(ch)) {
      seen.add(ch);
      unique += ch;
    }
  }

  if (unique.length < 2) return; // Need at least 2 chars

  state.pool = unique;
  updatePoolDisplay();
  updateMappingTables();
  generateChallengePasswords();

  if (state.mode === 'theoretical') {
    runTheoreticalAnalysis();
  }

  if (updateURL) syncStateToURL();
}

function updatePoolDisplay() {
  const pool = state.pool;
  const size = pool.length;

  if (size <= 30) {
    dom.poolChars.textContent = pool.split('').join(' ');
  } else {
    dom.poolChars.textContent = pool.slice(0, 28).split('').join(' ') + ' … (' + size + ' total)';
  }

  dom.poolSize.textContent = size;

  const quotient = Math.floor(256 / size);
  const remainder = 256 % size;

  if (remainder === 0) {
    dom.mathDivision.innerHTML = `256 ÷ ${size} = ${quotient} remainder <strong class="text-green">0</strong>`;
    dom.biasWarning.textContent = '✓ Perfectly divisible — no modulo bias with this pool size because 256 splits evenly!';
    dom.biasWarning.className = 'math-result no-bias';
  } else {
    dom.mathDivision.innerHTML = `256 ÷ ${size} = ${quotient} remainder <strong class="text-yellow">${remainder}</strong>`;
    dom.biasWarning.textContent = `⚠ ${remainder} character${remainder > 1 ? 's' : ''} receive 1 extra byte mapping — bias is unavoidable with modulo math!`;
    dom.biasWarning.className = 'math-result text-yellow';
  }
}

// ============================================
// MAPPING TABLES
// ============================================

function updateMappingTables() {
  const pool = state.pool;
  const size = pool.length;

  const counts = moduloMappingCounts(size);
  const remainder = 256 % size;

  let moduloHTML = '<table><thead><tr><th>Char</th><th>Byte Values</th><th>Count</th></tr></thead><tbody>';

  const showCount = Math.min(size, 10);

  for (let i = 0; i < showCount; i++) {
    const isBiased = i < remainder && remainder !== 0;
    const rowClass = isBiased ? 'biased' : '';
    const badge = isBiased ? ' ⚠ (+1)' : '';
    moduloHTML += `<tr class="${rowClass}">
      <td>${escapeHtml(pool[i])}</td>
      <td>${i}, ${i + size}, ${i + size * 2}, …</td>
      <td>${counts[i]}${badge}</td>
    </tr>`;
  }

  if (size > 10) {
    moduloHTML += `<tr class="discarded"><td colspan="3">… and ${size - 10} more characters</td></tr>`;
  }

  moduloHTML += '</tbody></table>';
  dom.moduloMappingTable.innerHTML = moduloHTML;

  if (remainder === 0) {
    dom.moduloVerdictText.textContent = 'No bias for this pool size';
  } else {
    dom.moduloVerdictText.textContent = 'Unequal probability (Biased)';
  }

  const limit = rejectionLimit(size);
  const perChar = limit / size;

  let rejectionHTML = '<table><thead><tr><th>Char</th><th>Byte Values</th><th>Count</th></tr></thead><tbody>';

  for (let i = 0; i < showCount; i++) {
    rejectionHTML += `<tr>
      <td>${escapeHtml(pool[i])}</td>
      <td>${i}, ${i + size}, ${i + size * 2}, …</td>
      <td>${perChar}</td>
    </tr>`;
  }

  if (size > 10) {
    rejectionHTML += `<tr><td colspan="3">… and ${size - 10} more characters (${perChar} each)</td></tr>`;
  }

  if (256 % size !== 0) {
    rejectionHTML += `<tr class="discarded">
      <td colspan="2">Values ${limit}–255</td>
      <td>discarded & redrawn</td>
    </tr>`;
  }

  rejectionHTML += '</tbody></table>';
  dom.rejectionMappingTable.innerHTML = rejectionHTML;
}

// ============================================
// EXPERIMENT & THEORETICAL ANALYSIS
// ============================================

function setMode(mode) {
  state.mode = mode;
  updateModeUI();
  syncStateToURL();

  if (mode === 'theoretical') {
    runTheoreticalAnalysis();
  }
}

function updateModeUI() {
  const isTheoretical = state.mode === 'theoretical';

  dom.modeButtons.querySelectorAll('.btn').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === state.mode);
  });

  dom.simulationControls.style.display = isTheoretical ? 'none' : 'flex';
  dom.runBtn.style.display = isTheoretical ? 'none' : 'inline-flex';
}

function runTheoreticalAnalysis() {
  const results = calculateTheoreticalDistribution(state.pool);
  renderResults(results);
  renderMathReasonCard(results.mathReason);

  dom.resultsGrid.hidden = false;
  if (dom.mathReasonCard) dom.mathReasonCard.hidden = false;
  if (dom.termsExplainerCard) dom.termsExplainerCard.hidden = false;
}

async function runExperiment() {
  if (state.isRunning) return;
  state.isRunning = true;

  dom.runBtn.disabled = true;
  dom.runBtnText.textContent = 'Running simulation…';
  dom.progressContainer.hidden = false;
  dom.resultsGrid.hidden = true;
  if (dom.mathReasonCard) dom.mathReasonCard.hidden = true;
  if (dom.termsExplainerCard) dom.termsExplainerCard.hidden = true;
  dom.progressBar.style.width = '0%';
  dom.progressText.textContent = 'Generating random bytes…';

  try {
    const results = await runSimulation(state.pool, state.sampleCount, (progress) => {
      dom.progressBar.style.width = (progress * 100) + '%';
      if (progress < 0.4) {
        dom.progressText.textContent = 'Generating random bytes…';
      } else if (progress < 0.6) {
        dom.progressText.textContent = 'Running modulo mapping…';
      } else if (progress < 0.8) {
        dom.progressText.textContent = 'Running rejection sampling…';
      } else {
        dom.progressText.textContent = 'Calculating statistics…';
      }
    });

    dom.progressBar.style.width = '100%';
    dom.progressText.textContent = 'Complete';

    await new Promise(r => setTimeout(r, 200));

    const theoreticalData = calculateTheoreticalDistribution(state.pool);

    dom.progressContainer.hidden = true;
    renderResults(results);
    renderMathReasonCard(theoreticalData.mathReason);

    dom.resultsGrid.hidden = false;
    if (dom.mathReasonCard) dom.mathReasonCard.hidden = false;
    if (dom.termsExplainerCard) dom.termsExplainerCard.hidden = false;
    dom.resultsGrid.classList.add('fade-in-up');

    dom.resultsGrid.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (err) {
    console.error('Simulation error:', err);
    dom.progressText.textContent = 'Error: ' + err.message;
  } finally {
    state.isRunning = false;
    dom.runBtn.disabled = false;
    dom.runBtnText.textContent = '▶ Generate Distribution';
  }
}

// ============================================
// CHART & STATS RENDERING
// ============================================

function renderResults(results) {
  const isTheoretical = !!results.modulo.isTheoretical;

  // Status badges
  const isBiasedPool = (256 % state.pool.length !== 0);
  dom.moduloStatusBadge.textContent = isBiasedPool ? (isTheoretical ? 'Mathematically Biased' : 'Statistically Biased') : 'Unbiased (Divisible)';
  dom.moduloStatusBadge.className = isBiasedPool ? 'badge-status badge-status-biased' : 'badge-status badge-status-unbiased';

  dom.rejectionStatusBadge.textContent = 'Statistically Unbiased';

  // Target probability text
  const targetPct = (100 / state.pool.length).toFixed(4);
  dom.moduloTargetProb.textContent = `Expected Target: ${targetPct}%`;
  dom.rejectionTargetProb.textContent = `Expected Target: ${targetPct}%`;

  renderChart(dom.moduloChart, results.modulo, 'biased', isTheoretical);
  renderChart(dom.rejectionChart, results.rejection, 'uniform', isTheoretical);
  renderStatsSummary(dom.moduloStats, results.modulo);
  renderStatsSummary(dom.rejectionStats, results.rejection);
}

function renderChart(container, data, mode, isTheoretical = false) {
  container.innerHTML = '';
  const pool = state.pool;
  const percentages = data.percentages;

  const values = Object.values(percentages);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal;

  const theoreticalBias = (256 % pool.length !== 0)
    ? Math.abs(1 / pool.length - Math.floor(256 / pool.length) / 256) * 100
    : 0;
  const biasThreshold = Math.max(theoreticalBias * 0.3, 0.001);

  for (let i = 0; i < pool.length; i++) {
    const char = pool[i];
    const pct = percentages[char];
    const deviation = pct - data.expectedPct;

    let barWidth;
    if (range < 0.0001) {
      barWidth = 85;
    } else {
      barWidth = 45 + 45 * ((pct - minVal) / range);
    }

    let barClass;
    if (mode === 'uniform') {
      barClass = 'bar-uniform';
    } else {
      const dir = biasDirection(data.freq[char], data.expected, biasThreshold / 100);
      if (dir === 'over') barClass = 'bar-biased-over';
      else if (dir === 'under') barClass = 'bar-biased-under';
      else barClass = 'bar-normal';
    }

    let devClass = '';
    if (Math.abs(deviation) > biasThreshold) {
      devClass = deviation > 0 ? 'text-yellow' : 'text-red';
    } else {
      devClass = 'text-secondary';
    }

    const formattedPct = isTheoretical ? pct.toFixed(4) : pct.toFixed(2);
    const formattedDev = isTheoretical ? deviation.toFixed(4) : deviation.toFixed(2);

    const row = document.createElement('div');
    row.className = 'chart-bar-row';
    row.innerHTML = `
      <span class="chart-label">${escapeHtml(char)}</span>
      <div class="chart-bar-track">
        <div class="chart-bar-fill ${barClass}" style="width: 0%"></div>
      </div>
      <span class="chart-value">${formattedPct}%</span>
      <span class="chart-deviation ${devClass}">${deviation >= 0 ? '+' : ''}${formattedDev}%</span>
    `;

    container.appendChild(row);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        row.querySelector('.chart-bar-fill').style.width = barWidth + '%';
      });
    });
  }
}

function renderStatsSummary(container, data) {
  const isTheoretical = !!data.isTheoretical;
  const chiVal = data.chiSquared.toFixed(isTheoretical ? 4 : 2);
  const targetVal = data.expectedPct.toFixed(4);
  const maxDevVal = data.maxDeviation.maxDev.toFixed(isTheoretical ? 4 : 3);

  container.innerHTML = `
    <div class="stat-item" title="Chi-squared (χ²): Measures deviation from expected distribution.">
      <div class="stat-label">Chi-squared (χ²)</div>
      <div class="stat-value">${chiVal}</div>
    </div>
    <div class="stat-item" title="Expected Target: Exact uniform probability per character.">
      <div class="stat-label">Expected target</div>
      <div class="stat-value">${targetVal}%</div>
    </div>
    <div class="stat-item" title="Max Deviation: Largest difference from expected probability.">
      <div class="stat-label">Max deviation</div>
      <div class="stat-value">${maxDevVal}%</div>
    </div>
  `;
}

// ============================================
// MATHEMATICAL REASON CARD RENDERING
// ============================================

function renderMathReasonCard(mathReason) {
  const { poolSize, quotient, remainder, overCount, normalCount, overByteCount, normalByteCount, overPct, normalPct, expectedPct } = mathReason;

  if (remainder === 0) {
    dom.mathReasonBody.innerHTML = `
      <div class="math-highlight-box text-green">
        <strong>✓ Zero Modulo Bias for Pool Size ${poolSize}:</strong><br>
        256 is perfectly divisible by ${poolSize} (${quotient} byte values per character). Every character has an exact theoretical selection probability of <strong>${expectedPct.toFixed(6)}%</strong> (${quotient} / 256).
      </div>
    `;
    return;
  }

  const pool = state.pool;
  const overChars = pool.slice(0, overCount).split('').join(', ');
  const normalChars = pool.slice(overCount, poolSize).split('').join(', ');

  dom.mathReasonBody.innerHTML = `
    <p>Because a single byte yields <strong>256</strong> unique values (0–255), dividing by pool size <strong>${poolSize}</strong> creates an uneven remainder of <strong>${remainder}</strong>:</p>
    
    <table class="math-table">
      <thead>
        <tr>
          <th>Character Group</th>
          <th>Byte Mappings Count</th>
          <th>Mathematical Formula</th>
          <th>Exact Probability</th>
          <th>Deviation vs Target</th>
        </tr>
      </thead>
      <tbody>
        <tr class="row-over">
          <td>Characters [${escapeHtml(overChars)}] (${overCount} total)</td>
          <td>${overByteCount} byte values</td>
          <td>${overByteCount} / 256</td>
          <td><strong>${overPct.toFixed(6)}%</strong></td>
          <td>+${(overPct - expectedPct).toFixed(4)}%</td>
        </tr>
        <tr class="row-normal">
          <td>Characters [${escapeHtml(normalChars)}] (${normalCount} total)</td>
          <td>${normalByteCount} byte values</td>
          <td>${normalByteCount} / 256</td>
          <td><strong>${normalPct.toFixed(6)}%</strong></td>
          <td>${(normalPct - expectedPct).toFixed(4)}%</td>
        </tr>
      </tbody>
    </table>

    <div class="math-highlight-box">
      <strong>💡 Distinguishing Theoretical Bias from Simulation Noise:</strong><br>
      Notice that characters <strong>[${escapeHtml(overChars)}]</strong> get <strong>${overByteCount}</strong> byte mappings while <strong>[${escapeHtml(normalChars)}]</strong> only get <strong>${normalByteCount}</strong>.
      In a live CSPRNG simulation with 10,000 samples, random noise fluctuates around these exact theoretical percentages (<strong>${overPct.toFixed(4)}%</strong> vs <strong>${normalPct.toFixed(4)}%</strong>). Rejection sampling discards the ${remainder} leftover byte values, making every character's probability exactly <strong>${expectedPct.toFixed(6)}%</strong>.
    </div>
  `;
}

// ============================================
// SHARE LINK COPY FUNCTIONALITY
// ============================================

function copyShareLink() {
  syncStateToURL();
  const fullURL = window.location.href;

  navigator.clipboard.writeText(fullURL).then(() => {
    dom.shareBtnText.textContent = '✓ Link Copied!';
    dom.shareBtn.style.borderColor = 'var(--accent-green)';
    dom.shareBtn.style.color = 'var(--accent-green)';

    setTimeout(() => {
      dom.shareBtnText.textContent = '🔗 Copy Share Link';
      dom.shareBtn.style.borderColor = '';
      dom.shareBtn.style.color = '';
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy link:', err);
  });
}

// ============================================
// CHALLENGE SECTION
// ============================================

function generateChallengePasswords() {
  const pool = state.pool;
  const length = Math.min(15, Math.max(10, pool.length));

  const modPwd = moduloPassword(pool, length);
  const rejPwd = rejectionPassword(pool, length);

  if (state.challengeSwapped) {
    dom.genAPassword.textContent = rejPwd;
    dom.genBPassword.textContent = modPwd;
  } else {
    dom.genAPassword.textContent = modPwd;
    dom.genBPassword.textContent = rejPwd;
  }
}

function regenerateA() {
  const pool = state.pool;
  const length = Math.min(15, Math.max(10, pool.length));
  const isModulo = state.challengeSwapped ? false : true;
  dom.genAPassword.textContent = isModulo ? moduloPassword(pool, length) : rejectionPassword(pool, length);
}

function regenerateB() {
  const pool = state.pool;
  const length = Math.min(15, Math.max(10, pool.length));
  const isModulo = state.challengeSwapped ? true : false;
  dom.genBPassword.textContent = isModulo ? moduloPassword(pool, length) : rejectionPassword(pool, length);
}

// ============================================
// EVENT LISTENERS
// ============================================

// Pool preset buttons
dom.poolPresets.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-preset');
  if (!btn) return;

  dom.poolPresets.querySelectorAll('.btn-preset').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  dom.customPoolInput.value = '';
  setPool(btn.dataset.pool);
});

// Custom pool input
dom.customPoolInput.addEventListener('input', (e) => {
  const value = e.target.value;
  if (value.length >= 2) {
    dom.poolPresets.querySelectorAll('.btn-preset').forEach(b => b.classList.remove('active'));
    setPool(value);
  }
});

// Mode buttons (Theoretical vs Simulation)
dom.modeButtons.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn');
  if (!btn) return;

  setMode(btn.dataset.mode);
});

// Sample count buttons
dom.sampleButtons.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-preset');
  if (!btn) return;

  dom.sampleButtons.querySelectorAll('.btn-preset').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.sampleCount = parseInt(btn.dataset.count, 10);
  syncStateToURL();
});

// Share button
dom.shareBtn.addEventListener('click', () => copyShareLink());

// Run experiment button
dom.runBtn.addEventListener('click', () => runExperiment());

// Challenge regeneration
dom.genARegen.addEventListener('click', () => regenerateA());
dom.genBRegen.addEventListener('click', () => regenerateB());

// Reveal answer
dom.revealBtn.addEventListener('click', () => {
  dom.revealContainer.classList.toggle('visible');
  dom.revealBtn.textContent = dom.revealContainer.classList.contains('visible')
    ? 'Hide Answer'
    : 'Reveal Answer';
});

// Smooth scroll for hero CTA
document.getElementById('start-experiment-btn').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('pool').scrollIntoView({ behavior: 'smooth' });
});

// ============================================
// HELPERS
// ============================================

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// ============================================
// INIT
// ============================================

loadStateFromURL();
updatePoolDisplay();
updateMappingTables();
generateChallengePasswords();

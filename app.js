/**
 * Password Randomness Lab — Main Application Controller
 *
 * Manages all UI interactions, experiment execution, chart rendering,
 * and the trust challenge section.
 */

import { moduloMappingCounts, moduloPassword } from './modules/modulo-mapping.js';
import { rejectionLimit, rejectionPassword } from './modules/rejection-sampling.js';
import { runSimulation } from './modules/simulation.js';
import { biasDirection } from './modules/statistics.js';

// ============================================
// STATE
// ============================================

const state = {
  pool: 'ABCDEFG',
  sampleCount: 10000,
  isRunning: false,
  // For section 5: randomly assign which method goes where
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
  sampleButtons: document.getElementById('sample-buttons'),
  runBtn: document.getElementById('run-experiment-btn'),
  runBtnText: document.getElementById('run-btn-text'),
  progressContainer: document.getElementById('progress-container'),
  progressBar: document.getElementById('progress-bar'),
  progressText: document.getElementById('progress-text'),
  resultsGrid: document.getElementById('results-grid'),
  moduloChart: document.getElementById('modulo-chart'),
  rejectionChart: document.getElementById('rejection-chart'),
  moduloStats: document.getElementById('modulo-stats'),
  rejectionStats: document.getElementById('rejection-stats'),

  // Challenge section
  genAPassword: document.getElementById('gen-a-password'),
  genBPassword: document.getElementById('gen-b-password'),
  genARegen: document.getElementById('gen-a-regen'),
  genBRegen: document.getElementById('gen-b-regen'),
  revealBtn: document.getElementById('reveal-answer-btn'),
  revealContainer: document.getElementById('reveal-container'),
};

// ============================================
// POOL MANAGEMENT
// ============================================

function setPool(poolString) {
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
}

function updatePoolDisplay() {
  const pool = state.pool;
  const size = pool.length;

  // Show chars with spaces (truncate if > 30)
  if (size <= 30) {
    dom.poolChars.textContent = pool.split('').join(' ');
  } else {
    dom.poolChars.textContent = pool.slice(0, 28).split('').join(' ') + ' … (' + size + ' total)';
  }

  dom.poolSize.textContent = size;

  // Math
  const quotient = Math.floor(256 / size);
  const remainder = 256 % size;

  if (remainder === 0) {
    dom.mathDivision.innerHTML = `256 ÷ ${size} = ${quotient} remainder <strong class="text-green">0</strong>`;
    dom.biasWarning.textContent = '✓ Perfectly divisible — no modulo bias with this pool size.';
    dom.biasWarning.className = 'math-result no-bias';
  } else {
    dom.mathDivision.innerHTML = `256 ÷ ${size} = ${quotient} remainder <strong class="text-yellow">${remainder}</strong>`;
    dom.biasWarning.textContent = `⚠ ${remainder} character${remainder > 1 ? 's' : ''} receive an extra byte mapping — bias is unavoidable with modulo.`;
    dom.biasWarning.className = 'math-result text-yellow';
  }
}

// ============================================
// MAPPING TABLES
// ============================================

function updateMappingTables() {
  const pool = state.pool;
  const size = pool.length;

  // Modulo mapping counts
  const counts = moduloMappingCounts(size);
  const remainder = 256 % size;

  // Build modulo table
  let moduloHTML = '<table><thead><tr><th>Char</th><th>Byte Values</th><th>Count</th></tr></thead><tbody>';

  // Show up to 10 rows; if pool > 10, summarize
  const showCount = Math.min(size, 10);

  for (let i = 0; i < showCount; i++) {
    const isBiased = i < remainder && remainder !== 0;
    const rowClass = isBiased ? 'biased' : '';
    const badge = isBiased ? ' ⚠' : '';
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

  // Update verdict
  if (remainder === 0) {
    dom.moduloVerdictText.textContent = 'No bias for this pool size';
  } else {
    dom.moduloVerdictText.textContent = 'Unequal probability';
  }

  // Rejection sampling table
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
      <td>discarded</td>
    </tr>`;
  }

  rejectionHTML += '</tbody></table>';
  dom.rejectionMappingTable.innerHTML = rejectionHTML;
}

// ============================================
// EXPERIMENT
// ============================================

async function runExperiment() {
  if (state.isRunning) return;
  state.isRunning = true;

  dom.runBtn.disabled = true;
  dom.runBtnText.textContent = 'Running…';
  dom.progressContainer.hidden = false;
  dom.resultsGrid.hidden = true;
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

    // Small delay before showing results
    await new Promise(r => setTimeout(r, 300));

    dom.progressContainer.hidden = true;
    renderResults(results);
    dom.resultsGrid.hidden = false;
    dom.resultsGrid.classList.add('fade-in-up');

    // Scroll results into view
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
// CHART RENDERING
// ============================================

function renderResults(results) {
  renderChart(dom.moduloChart, results.modulo, 'biased');
  renderChart(dom.rejectionChart, results.rejection, 'uniform');
  renderStatsSummary(dom.moduloStats, results.modulo);
  renderStatsSummary(dom.rejectionStats, results.rejection);
}

function renderChart(container, data, mode) {
  container.innerHTML = '';
  const pool = state.pool;
  const percentages = data.percentages;
  const expected = data.expected;

  // Find min and max for scaling
  const values = Object.values(percentages);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal;

  // Threshold for "biased" coloring: > 0.5 * theoretical bias
  const theoreticalBias = (256 % pool.length !== 0)
    ? Math.abs(1 / pool.length - Math.floor(256 / pool.length) / 256) * 100
    : 0;
  const biasThreshold = Math.max(theoreticalBias * 0.3, 0.001);

  for (let i = 0; i < pool.length; i++) {
    const char = pool[i];
    const pct = percentages[char];
    const deviation = pct - data.expectedPct;

    // Scale bar: map to 50%-100% range for visibility
    let barWidth;
    if (range < 0.001) {
      barWidth = 85; // All equal
    } else {
      barWidth = 50 + 50 * ((pct - minVal) / range);
    }

    // Determine bar color class
    let barClass;
    if (mode === 'uniform') {
      barClass = 'bar-uniform';
    } else {
      const dir = biasDirection(data.freq[char], expected, biasThreshold / 100);
      if (dir === 'over') barClass = 'bar-biased-over';
      else if (dir === 'under') barClass = 'bar-biased-under';
      else barClass = 'bar-normal';
    }

    // Deviation color
    let devClass = '';
    if (Math.abs(deviation) > biasThreshold) {
      devClass = deviation > 0 ? 'text-yellow' : 'text-red';
    } else {
      devClass = 'text-secondary';
    }

    const row = document.createElement('div');
    row.className = 'chart-bar-row';
    row.innerHTML = `
      <span class="chart-label">${escapeHtml(char)}</span>
      <div class="chart-bar-track">
        <div class="chart-bar-fill ${barClass}" style="width: 0%"></div>
      </div>
      <span class="chart-value">${pct.toFixed(2)}%</span>
      <span class="chart-deviation ${devClass}">${deviation >= 0 ? '+' : ''}${deviation.toFixed(2)}%</span>
    `;

    container.appendChild(row);

    // Animate bar after a small delay
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        row.querySelector('.chart-bar-fill').style.width = barWidth + '%';
      });
    });
  }
}

function renderStatsSummary(container, data) {
  container.innerHTML = `
    <div class="stat-item">
      <div class="stat-label">Chi-squared (χ²)</div>
      <div class="stat-value">${data.chiSquared.toFixed(2)}</div>
    </div>
    <div class="stat-item">
      <div class="stat-label">Expected</div>
      <div class="stat-value">${data.expectedPct.toFixed(2)}%</div>
    </div>
    <div class="stat-item">
      <div class="stat-label">Max deviation</div>
      <div class="stat-value">${data.maxDeviation.maxDev.toFixed(3)}%</div>
    </div>
  `;
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

  // Update active state
  dom.poolPresets.querySelectorAll('.btn-preset').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  dom.customPoolInput.value = '';
  setPool(btn.dataset.pool);
});

// Custom pool input
dom.customPoolInput.addEventListener('input', (e) => {
  const value = e.target.value;
  if (value.length >= 2) {
    // Deactivate presets
    dom.poolPresets.querySelectorAll('.btn-preset').forEach(b => b.classList.remove('active'));
    setPool(value);
  }
});

// Sample count buttons
dom.sampleButtons.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-preset');
  if (!btn) return;

  dom.sampleButtons.querySelectorAll('.btn-preset').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.sampleCount = parseInt(btn.dataset.count, 10);
});

// Run experiment
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

updatePoolDisplay();
updateMappingTables();
generateChallengePasswords();

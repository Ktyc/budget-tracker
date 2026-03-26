// Chunk 1: Data (Variables and Constants)
// Stores app's data -- the category list, colour map, and everything saved in localStorage.
const CATEGORIES = ['Food', 'Transport', 'Investments', 'Leisure', 'Family Expense', 'Other'];

const CAT_COLORS = {
  'Food':           '#1D9E75',
  'Transport':      '#378ADD',
  'Investments':    '#7F77DD',
  'Leisure':        '#D85A30',
  'Family Expense': '#D4537E',
  'Other':          '#888780'
};

let transactions = JSON.parse(localStorage.getItem('bt_transactions') || '[]');
let salaries = JSON.parse(localStorage.getItem('bt_salaries') || '{}');
let currentType = 'expense';
let currentFilter = 'All';

// Chunk 2: Helper Functions
// These are small reusable tools -- calculating pay periods, formatting currency, saving to localStorage.
function getPayPeriod(dateStr) {
  const d = new Date(dateStr);
  if (d.getDate() < 9) {
    d.setMonth(d.getMonth() - 1);
  }
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

function getPeriodLabel(key) {
  const [y, m] = key.split('-');
  const start = new Date(+y, +m - 1, 9);
  const end = new Date(+y, +m, 8);
  const fmtStart = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const fmtEnd = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return fmtStart + ' – ' + fmtEnd;
}

function getSalary(key) {
  return parseFloat(salaries[key] || 0);
}

function fmt(n) {
  return '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function save() {
  localStorage.setItem('bt_transactions', JSON.stringify(transactions));
  localStorage.setItem('bt_salaries', JSON.stringify(salaries));
}

// Chunk 3: Render Functions
// These functions read your data and update what the user sees on screen. 
function renderSummary() {
  const key = getPayPeriod(new Date().toISOString().slice(0, 10));
  const mt = transactions.filter(t => getPayPeriod(t.date) === key);
  const sal = getSalary(key);
  const inc = sal + mt.filter(t => t.type === 'income').reduce((s, t) => s + t.amt, 0);
  const exp = mt.filter(t => t.type === 'expense').reduce((s, t) => s + t.amt, 0);
  const sav = inc - exp;
  document.getElementById('total-income').textContent = fmt(inc);
  document.getElementById('total-expenses').textContent = fmt(exp);
  const savEl = document.getElementById('total-savings');
  savEl.textContent = fmt(sav);
  savEl.style.color = sav >= 0 ? '#0f6e56' : '#a32d2d';
}

function renderTxList() {
  const list = document.getElementById('tx-list');
  const filtered = currentFilter === 'All'
    ? transactions
    : transactions.filter(t => t.cat === currentFilter);
  if (!filtered.length) {
    list.innerHTML = '<div class="empty">No transactions yet.</div>';
    return;
  }
  list.innerHTML = filtered.map(t => {
    const sign = t.type === 'income' ? '+' : '-';
    const cls = t.type === 'income' ? 'income' : 'expense';
    const d = new Date(t.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `
      <div class="tx-item">
        <div class="cat-dot" style="background:${CAT_COLORS[t.cat] || CAT_COLORS['Other']}"></div>
        <div class="tx-info">
          <div class="tx-desc">${t.desc}</div>
          <div class="tx-meta">${d} · ${t.cat}</div>
        </div>
        <div class="tx-amount ${cls}">${sign}${fmt(t.amt)}</div>
        <button class="del-btn" data-id="${t.id}">✕</button>
      </div>`;
  }).join('');
}

function renderMonthly() {
  const keys = [...new Set(transactions.map(t => getPayPeriod(t.date)))].sort().reverse();
  const list = document.getElementById('monthly-list');
  if (!keys.length) {
    list.innerHTML = '<div class="empty">No data yet.</div>';
    return;
  }
  list.innerHTML = keys.map(k => {
    const mt = transactions.filter(t => getPayPeriod(t.date) === k);
    const sal = getSalary(k);
    const otherInc = mt.filter(t => t.type === 'income').reduce((s, t) => s + t.amt, 0);
    const inc = sal + otherInc;
    const exp = mt.filter(t => t.type === 'expense').reduce((s, t) => s + t.amt, 0);
    const sav = inc - exp;
    const savColor = sav >= 0 ? '#0f6e56' : '#a32d2d';
    return `
      <div class="month-row">
        <div class="month-header">
          <div class="month-name">${getPeriodLabel(k)}</div>
          <div class="month-stats">
            <span style="color:#0f6e56">+${fmt(inc)}</span>
            <span style="color:#a32d2d">-${fmt(exp)}</span>
            <span style="color:${savColor}">${fmt(sav)}</span>
          </div>
        </div>
        <div class="month-salary-row">
          <span class="month-salary-label">Salary:</span>
          <input class="month-salary-input" type="number" value="${sal || ''}"
            placeholder="Enter salary" data-key="${k}"
            onchange="updateSalary(this.dataset.key, this.value)">
        </div>
      </div>`;
  }).join('');
}

function renderExportInfo() {
  const keys = [...new Set(transactions.map(t => getPayPeriod(t.date)))];
  document.getElementById('export-info').textContent =
    `${transactions.length} transaction${transactions.length !== 1 ? 's' : ''} across ${keys.length} pay period${keys.length !== 1 ? 's' : ''} ready to export.`;
}

function renderAll() {
  renderSummary();
  renderTxList();
}

// Chunk 4: Event Listeners
// These listen for user actions --clicks, inputs -- and respond accordingly.
document.getElementById('tabs').addEventListener('click', function(e) {
  const btn = e.target.closest('.tab-btn');
  if (!btn) return;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  if (btn.dataset.tab === 'monthly') renderMonthly();
  if (btn.dataset.tab === 'export') renderExportInfo();
});

document.getElementById('type-toggle').addEventListener('click', function(e) {
  const btn = e.target.closest('.type-btn');
  if (!btn) return;
  document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentType = btn.dataset.type;
});

document.getElementById('filter-bar').addEventListener('click', function(e) {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentFilter = btn.dataset.filter;
  renderTxList();
});

document.getElementById('add-btn').addEventListener('click', function() {
  const desc = document.getElementById('inp-desc').value.trim();
  const amt = parseFloat(document.getElementById('inp-amount').value);
  const date = document.getElementById('inp-date').value;
  const cat = document.getElementById('inp-category').value;
  if (!desc || isNaN(amt) || amt <= 0 || !date) {
    alert('Please fill in all fields with a valid amount.');
    return;
  }
  transactions.unshift({ id: Date.now(), desc, amt, date, cat, type: currentType });
  save();
  document.getElementById('inp-desc').value = '';
  document.getElementById('inp-amount').value = '';
  renderAll();
});

document.getElementById('tx-list').addEventListener('click', function(e) {
  const btn = e.target.closest('.del-btn');
  if (!btn) return;
  transactions = transactions.filter(t => t.id !== parseInt(btn.dataset.id));
  save();
  renderAll();
});

document.getElementById('salary-input').addEventListener('input', function() {
  const key = getPayPeriod(new Date().toISOString().slice(0, 10));
  salaries[key] = parseFloat(this.value) || 0;
  save();
  renderSummary();
});

document.getElementById('export-btn').addEventListener('click', exportExcel);

// Chunk 5: Export, Backup, and Init 
// exportExcel builds and downloads the .xlsx. init runs once on page load to set everything up.
function updateSalary(key, value) {
  salaries[key] = parseFloat(value) || 0;
  save();
  renderSummary();
}

function exportExcel() {
  if (!transactions.length) { alert('No transactions to export yet.'); return; }
  const wb = XLSX.utils.book_new();
  const keys = [...new Set(transactions.map(t => getPayPeriod(t.date)))].sort();

  const summaryRows = [['Year', 'Pay Period', 'Salary', 'Other Income', 'Total Income', 'Total Expenses', 'Savings', 'Savings Rate', ...CATEGORIES.map(c => c + ' (spent)')]];
  keys.forEach(k => {
    const mt = transactions.filter(t => getPayPeriod(t.date) === k);
    const sal = getSalary(k);
    const otherInc = mt.filter(t => t.type === 'income').reduce((s, t) => s + t.amt, 0);
    const totalInc = sal + otherInc;
    const totalExp = mt.filter(t => t.type === 'expense').reduce((s, t) => s + t.amt, 0);
    const sav = totalInc - totalExp;
    const rate = totalInc > 0 ? (sav / totalInc) : 0;
    const catAmts = CATEGORIES.map(c => mt.filter(t => t.type === 'expense' && t.cat === c).reduce((s, t) => s + t.amt, 0));
    summaryRows.push([k.split('-')[0], getPeriodLabel(k), sal, otherInc, totalInc, totalExp, sav, rate, ...catAmts]);
  });

  const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);
  ws1['!cols'] = [{ wch: 8 }, { wch: 24 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 13 }, ...CATEGORIES.map(() => ({ wch: 16 }))];

  const txRows = [['Date', 'Description', 'Category', 'Amount', 'Type']];
  [...transactions].sort((a, b) => a.date.localeCompare(b.date)).forEach(t => {
    txRows.push([t.date, t.desc, t.cat, t.type === 'expense' ? -t.amt : t.amt, t.type]);
  });
  const ws2 = XLSX.utils.aoa_to_sheet(txRows);
  ws2['!cols'] = [{ wch: 14 }, { wch: 30 }, { wch: 18 }, { wch: 12 }, { wch: 10 }];

  XLSX.utils.book_append_sheet(wb, ws1, 'Pay Period Summary');
  XLSX.utils.book_append_sheet(wb, ws2, 'All Transactions');
  localStorage.setItem('bt_last_export', Date.now().toString());
  document.getElementById('backup-banner').style.display = 'none';
  XLSX.writeFile(wb, 'budget_tracker_' + new Date().getFullYear() + '.xlsx');
}

function checkBackupReminder() {
  const last = parseInt(localStorage.getItem('bt_last_export') || '0');
  const now = Date.now();
  const daysSince = Math.floor((now - last) / (1000 * 60 * 60 * 24));
  const banner = document.getElementById('backup-banner');
  if (!last || daysSince >= 30) {
    document.getElementById('backup-days').textContent = last ? daysSince : 'unknown';
    banner.style.display = 'flex';
  }
}

function importExcel(file) {
  const result = document.getElementById('import-result');
  result.style.color = '#666666';
  result.textContent = 'Reading file...';

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const wb = XLSX.read(e.target.result, { type: 'array' });

      // --- Restore transactions from All Transactions sheet ---
      const txSheet = wb.Sheets['All Transactions'];
      if (!txSheet) {
        result.style.color = '#a32d2d';
        result.textContent = 'Could not find "All Transactions" sheet. Make sure this is an exported file from this app.';
        return;
      }

      const rows = XLSX.utils.sheet_to_json(txSheet, { header: 1 });
      // rows[0] is the header: ['Date','Description','Category','Amount','Type']
      let imported = 0;
      let skipped = 0;

      for (let i = 1; i < rows.length; i++) {
        const [date, desc, cat, amt, type] = rows[i];
        if (!date || !desc || amt === undefined) continue;

        const absAmt = Math.abs(parseFloat(amt));
        const txType = type || (parseFloat(amt) < 0 ? 'expense' : 'income');

        // Duplicate check: same date, description, amount and type
        const isDuplicate = transactions.some(t =>
          t.date === date &&
          t.desc === desc &&
          t.amt === absAmt &&
          t.type === txType
        );

        if (isDuplicate) {
          skipped++;
          continue;
        }

        transactions.push({
          id: Date.now() + i, // ensure unique ids
          date,
          desc,
          cat: cat || 'Other',
          amt: absAmt,
          type: txType
        });
        imported++;
      }

      // --- Restore salaries from Pay Period Summary sheet ---
      const sumSheet = wb.Sheets['Pay Period Summary'];
      let salariesRestored = 0;
      if (sumSheet) {
        const sumRows = XLSX.utils.sheet_to_json(sumSheet, { header: 1 });
        // header: ['Pay Period','Salary',...]
        for (let i = 1; i < sumRows.length; i++) {
          const [periodLabel, salary] = sumRows[i];
          if (!periodLabel || !salary) continue;
          // Match period label back to a key by finding transactions in that period
          // We use the date range label to find the key
          const matchingKeys = [...new Set(transactions.map(t => getPayPeriod(t.date)))];
          matchingKeys.forEach(k => {
            if (getPeriodLabel(k) === periodLabel && !salaries[k]) {
              salaries[k] = parseFloat(salary) || 0;
              salariesRestored++;
            }
          });
        }
      }

      // Sort transactions by date descending (newest first)
      transactions.sort((a, b) => b.date.localeCompare(a.date));

      save();
      renderAll();
      renderExportInfo();

      result.style.color = '#0f6e56';
      result.textContent = `✓ Imported ${imported} transaction${imported !== 1 ? 's' : ''}, restored ${salariesRestored} salary record${salariesRestored !== 1 ? 's' : ''}. ${skipped} duplicate${skipped !== 1 ? 's' : ''} skipped.`;

    } catch (err) {
      result.style.color = '#a32d2d';
      result.textContent = 'Failed to read file. Make sure it is a valid exported Excel file.';
      console.error(err);
    }
  };
  reader.readAsArrayBuffer(file);
}

document.getElementById('import-input').addEventListener('change', function() {
  if (this.files && this.files[0]) {
    importExcel(this.files[0]);
    this.value = ''; // reset so same file can be re-imported if needed
  }
});

function init() {
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('inp-date').value = today;
  const key = getPayPeriod(today);
  document.getElementById('current-period-label').textContent = getPeriodLabel(key);
  const sal = getSalary(key);
  if (sal) document.getElementById('salary-input').value = sal;
  renderAll();
  checkBackupReminder();
}

init();
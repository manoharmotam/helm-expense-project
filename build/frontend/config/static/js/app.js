'use strict';

// For local dev without nginx, set globalThis.BACKEND_URL = 'http://localhost:8080'
const API = globalThis.BACKEND_URL
  ? globalThis.BACKEND_URL + '/transaction'
  : '/api/transaction';

// ── DOM refs ────────────────────────────────────────────────────────────────
const form          = document.getElementById('addForm');
const amountInput   = document.getElementById('amount');
const categoryInput = document.getElementById('category');
const descInput     = document.getElementById('description');
const submitBtn     = document.getElementById('submitBtn');
const resetBtn      = document.getElementById('resetBtn');
const alertBox      = document.getElementById('alert');
const tbody         = document.getElementById('transactionBody');
const tableWrap     = document.getElementById('tableWrap');
const emptyState    = document.getElementById('emptyState');
const loadingEl     = document.getElementById('loading');
const deleteAllBtn  = document.getElementById('deleteAllBtn');
const refreshBtn    = document.getElementById('refreshBtn');
const statTotal     = document.getElementById('statTotal');
const statCount     = document.getElementById('statCount');
const statTopCat    = document.getElementById('statTopCat');

// ── Validation ───────────────────────────────────────────────────────────────
function clearErrors() {
  ['amount', 'category', 'description'].forEach(function(f) {
    document.getElementById(f).classList.remove('error');
    document.getElementById(f + 'Err').textContent = '';
  });
}

function setError(field, msg) {
  document.getElementById(field).classList.add('error');
  document.getElementById(field + 'Err').textContent = msg;
}

function validate() {
  clearErrors();
  let valid = true;

  const amount = Number(amountInput.value);
  if (amountInput.value.trim() === '') {
    setError('amount', 'Amount is required.');
    valid = false;
  } else if (!Number.isInteger(amount) || amount <= 0) {
    setError('amount', 'Amount must be a positive whole number.');
    valid = false;
  } else if (amount > 1000000) {
    setError('amount', 'Amount cannot exceed ₹10,00,000.');
    valid = false;
  }

  if (!categoryInput.value) {
    setError('category', 'Please select a category.');
    valid = false;
  }

  const desc = descInput.value.trim();
  if (!desc) {
    setError('description', 'Description is required.');
    valid = false;
  } else if (desc.length > 255) {
    setError('description', 'Description cannot exceed 255 characters.');
    valid = false;
  }

  return valid;
}

// Live clear errors on input
amountInput.addEventListener('input', function() {
  amountInput.classList.remove('error');
  document.getElementById('amountErr').textContent = '';
});
categoryInput.addEventListener('change', function() {
  categoryInput.classList.remove('error');
  document.getElementById('categoryErr').textContent = '';
});
descInput.addEventListener('input', function() {
  descInput.classList.remove('error');
  document.getElementById('descriptionErr').textContent = '';
});

// ── Alert banner ─────────────────────────────────────────────────────────────
let alertTimer;
function showAlert(msg, type) {
  clearTimeout(alertTimer);
  alertBox.textContent = msg;
  alertBox.className = type;
  alertBox.style.display = 'block';
  alertTimer = setTimeout(function() { alertBox.style.display = 'none'; }, 4000);
}

// ── Add expense ───────────────────────────────────────────────────────────────
form.addEventListener('submit', async function(e) {
  e.preventDefault();
  if (!validate()) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving…';

  try {
    const res  = await fetch(API, {
      method  : 'POST',
      headers : { 'Content-Type': 'application/json' },
      body    : JSON.stringify({
        amount      : Number(amountInput.value),
        category    : categoryInput.value,
        description : descInput.value.trim()
      })
    });
    const data = await res.json();
    if (res.ok) {
      showAlert('Expense added successfully!', 'success');
      form.reset();
      clearErrors();
      fetchTransactions();
    } else {
      const errMsg = data.errors ? data.errors.join(', ') : (data.message || 'Unknown error');
      showAlert('Error: ' + errMsg, 'failure');
    }
  } catch {
    showAlert('Could not reach the backend. Is it running?', 'failure');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Add Expense';
  }
});

resetBtn.addEventListener('click', function() {
  form.reset();
  clearErrors();
  alertBox.style.display = 'none';
});

// ── Fetch & render ────────────────────────────────────────────────────────────
function fetchTransactions() {
  loadingEl.style.display = 'block';
  tableWrap.style.display = 'none';
  emptyState.style.display = 'none';

  fetch(API)
    .then(function(res) { return res.json(); })
    .then(function(data) { renderTable(data.result || []); })
    .catch(function() {
      loadingEl.innerHTML = '<p>Failed to load expenses. Check backend connection.</p>';
    });
}

function renderTable(rows) {
  loadingEl.style.display = 'none';
  tbody.innerHTML = '';

  if (!rows.length) {
    emptyState.style.display = 'block';
    statTotal.textContent  = '₹0';
    statCount.textContent  = '0';
    statTopCat.textContent = '—';
    return;
  }

  const total = rows.reduce(function(sum, r) { return sum + (r.amount || 0); }, 0);
  statTotal.textContent = '₹' + total.toLocaleString('en-IN');
  statCount.textContent = rows.length;

  const catFreq = {};
  rows.forEach(function(r) { catFreq[r.category] = (catFreq[r.category] || 0) + 1; });
  const categories = Object.keys(catFreq);
  const topCat = categories.reduce(function(best, cat) {
    return catFreq[cat] > catFreq[best] ? cat : best;
  }, categories[0]);
  statTopCat.textContent = topCat;

  rows.forEach(function(row) {
    const tr = document.createElement('tr');
    tr.innerHTML =
      '<td>' + escHtml(String(row.id)) + '</td>' +
      '<td class="amount-cell">₹' + Number(row.amount).toLocaleString('en-IN') + '</td>' +
      '<td><span class="badge badge-' + escHtml(row.category) + '">' + escHtml(row.category) + '</span></td>' +
      '<td>' + escHtml(row.description) + '</td>' +
      '<td><button class="btn-icon" title="Delete" onclick="deleteOne(' + row.id + ')">🗑</button></td>';
    tbody.appendChild(tr);
  });

  tableWrap.style.display = 'block';
}

// ── Delete ────────────────────────────────────────────────────────────────────
function deleteOne(id) {
  if (!confirm('Delete expense #' + id + '?')) return;
  fetch(API + '/' + id, { method: 'DELETE' })
    .then(function(res) {
      if (res.ok) { showAlert('Expense #' + id + ' deleted.', 'success'); fetchTransactions(); }
      else         { showAlert('Could not delete expense.', 'failure'); }
    })
    .catch(function() { showAlert('Network error while deleting.', 'failure'); });
}

deleteAllBtn.addEventListener('click', function() {
  if (!confirm('Delete ALL expenses? This cannot be undone.')) return;
  fetch(API, { method: 'DELETE' })
    .then(function(res) {
      if (res.ok) { showAlert('All expenses deleted.', 'success'); fetchTransactions(); }
      else         { showAlert('Could not delete all expenses.', 'failure'); }
    })
    .catch(function() { showAlert('Network error.', 'failure'); });
});

refreshBtn.addEventListener('click', fetchTransactions);

// ── XSS guard ─────────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replaceAll('&',  '&amp;')
    .replaceAll('<',  '&lt;')
    .replaceAll('>',  '&gt;')
    .replaceAll('"',  '&quot;')
    .replaceAll("'",  '&#039;');
}

// ── Init ──────────────────────────────────────────────────────────────────────
fetchTransactions();

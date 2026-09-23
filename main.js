const STORAGE_KEY = 'expense-tracker-transactions';

let transactions = [];
let editingTransactionId = null;

const incomeList = document.getElementById('incomeList');
const expenseList = document.getElementById('expenseList');
const transactionForm = document.getElementById('transactionForm');
const transactionFormTitleInput = document.getElementById('transactionFormTitleInput');
const transactionFormAmountInput = document.getElementById('transactionFormAmountInput');
const transactionFormDateInput = document.getElementById('transactionFormDateInput');
const transactionFormTypeSelect = document.getElementById('transactionFormTypeSelect');
const transactionFormSubmitButton = document.querySelector('[data-testid="transactionFormSubmitButton"]');
const transactionFormCancelButton = document.getElementById('transactionFormCancelButton');
const transactionFormSection = document.querySelector('.tracker-form-section');
const transactionFormCard = document.querySelector('.tracker-form-section__card');
const addTransactionButton = document.getElementById('addTransactionButton');
const transactionFormHeading = document.getElementById('form-heading');
const searchTransactionForm = document.getElementById('searchTransactionForm');
const searchTransactionFormTitleInput = document.getElementById('searchTransactionFormTitleInput');
const incomeCount = document.getElementById('incomeCount');
const expenseCount = document.getElementById('expenseCount');

function generateTransactionId() {
  return +new Date();
}

function loadTransactions() {
  const storedTransactions = localStorage.getItem(STORAGE_KEY);

  if (!storedTransactions) {
    transactions = [];
    return;
  }

  transactions = JSON.parse(storedTransactions);
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function formatRupiah(amount) {
  const sign = amount < 0 ? '-' : '';
  return `${sign}Rp${Math.abs(amount).toLocaleString('id-ID')}`;
}

function formatDate(dateString) {
  if (!dateString) {
    return 'Tanpa tanggal';
  }

  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getTodayDate() {
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  return today.toISOString().slice(0, 10);
}

function appendLabeledText(element, label, value) {
  const labelElement = document.createElement('span');
  labelElement.className = 'visually-hidden-inline';
  labelElement.innerText = label;

  const valueElement = document.createElement('span');
  valueElement.className = 'tracker-entry__value';
  valueElement.innerText = value;

  element.append(labelElement, ' ', valueElement);
}

function setFormMode(isEditing) {
  transactionFormCard.classList.toggle('is-editing', isEditing);
  transactionFormHeading.innerText = isEditing ? 'Ubah Pencatatan' : 'Tambah Pencatatan Baru';
  transactionFormSubmitButton.innerText = isEditing ? 'Perbarui' : 'Simpan';
}

function resetForm() {
  editingTransactionId = null;
  transactionForm.reset();
  transactionFormDateInput.value = getTodayDate();
  setFormMode(false);
}

let lastFocusedElement = null;

function openFormModal() {
  lastFocusedElement = document.activeElement;
  transactionFormSection.hidden = false;
  document.body.classList.add('has-modal');
  requestAnimationFrame(() => transactionFormSection.classList.add('is-open'));
  transactionFormAmountInput.focus();
}

function closeFormModal() {
  transactionFormSection.classList.remove('is-open');
  transactionFormSection.hidden = true;
  document.body.classList.remove('has-modal');
  if (lastFocusedElement && document.contains(lastFocusedElement)) {
    lastFocusedElement.focus();
  }
}

function cancelForm() {
  resetForm();
  closeFormModal();
  renderTransactions();
}

function createTransactionCard(transaction) {
  const card = document.createElement('div');
  card.dataset.testid = 'transactionItem';
  card.className = `tracker-entry tracker-entry--${transaction.type}`;
  if (transaction.id === editingTransactionId) {
    card.classList.add('is-editing');
  }

  const title = document.createElement('h3');
  title.dataset.testid = 'transactionItemTitle';
  title.className = 'tracker-entry__title';
  title.innerText = transaction.title;
  title.title = transaction.title;

  const amount = document.createElement('p');
  amount.dataset.testid = 'transactionItemAmount';
  amount.className = 'tracker-entry__amount';
  appendLabeledText(amount, 'Nominal:', formatRupiah(transaction.amount));

  const date = document.createElement('p');
  date.dataset.testid = 'transactionItemDate';
  date.className = 'tracker-entry__date';
  appendLabeledText(date, 'Tanggal:', formatDate(transaction.date));
  date.lastChild.title = transaction.date;

  const type = document.createElement('p');
  type.dataset.testid = 'transactionItemType';
  type.className = 'tracker-entry__type';
  appendLabeledText(type, 'Tipe:', transaction.type === 'income' ? 'Pemasukan' : 'Pengeluaran');

  const actionContainer = document.createElement('div');
  actionContainer.className = 'tracker-entry__actions';

  const editTypeButton = document.createElement('button');
  editTypeButton.dataset.testid = 'transactionItemEditTypeButton';
  editTypeButton.className = 'tracker-entry__btn';
  editTypeButton.innerText = 'Ubah Tipe';
  editTypeButton.addEventListener('click', () => {
    transaction.type = transaction.type === 'income' ? 'expense' : 'income';
    dispatchTransactionUpdated();
  });

  const deleteButton = document.createElement('button');
  deleteButton.dataset.testid = 'transactionItemDeleteButton';
  deleteButton.className = 'tracker-entry__btn tracker-entry__btn--danger';
  deleteButton.innerText = 'Hapus';
  deleteButton.addEventListener('click', () => {
    transactions = transactions.filter((item) => item.id !== transaction.id);
    if (transaction.id === editingTransactionId) {
      resetForm();
    }
    dispatchTransactionUpdated();
  });

  const editButton = document.createElement('button');
  editButton.className = 'tracker-entry__btn';
  editButton.innerText = 'Edit';
  editButton.addEventListener('click', () => {
    editingTransactionId = transaction.id;
    transactionFormTitleInput.value = transaction.title;
    transactionFormAmountInput.value = transaction.amount;
    transactionFormDateInput.value = transaction.date;
    transactionFormTypeSelect.value = transaction.type;
    setFormMode(true);
    renderTransactions();
    openFormModal();
  });

  actionContainer.append(editTypeButton, editButton, deleteButton);
  card.append(title, amount, date, type, actionContainer);

  return card;
}

function renderTransactions() {
  incomeList.innerHTML = '';
  expenseList.innerHTML = '';

  const keyword = searchTransactionFormTitleInput.value.trim().toLowerCase();
  document.body.classList.toggle('is-searching', keyword !== '');
  const filteredTransactions = transactions.filter((transaction) => {
    return transaction.title.toLowerCase().includes(keyword);
  });

  filteredTransactions.forEach((transaction) => {
    const transactionCard = createTransactionCard(transaction);

    if (transaction.type === 'income') {
      incomeList.append(transactionCard);
    } else {
      expenseList.append(transactionCard);
    }
  });

  incomeCount.innerText = incomeList.children.length;
  expenseCount.innerText = expenseList.children.length;
}

function updateDashboard() {
  const totalIncome = transactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((total, transaction) => total + transaction.amount, 0);

  const totalExpense = transactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((total, transaction) => total + transaction.amount, 0);

  const balance = totalIncome - totalExpense;
  const balanceAmount = document.querySelector('.tracker-summary__balance-amount');

  balanceAmount.innerText = formatRupiah(balance);
  document.querySelector('.tracker-summary__stat-amount--income').innerText = formatRupiah(totalIncome);
  document.querySelector('.tracker-summary__stat-amount--expense').innerText = formatRupiah(totalExpense);
}

function dispatchTransactionUpdated() {
  saveTransactions();
  document.dispatchEvent(new Event('transaction:updated'));
}

transactionForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const title = transactionFormTitleInput.value.trim();
  const amount = Number(transactionFormAmountInput.value);
  const date = transactionFormDateInput.value;
  const type = transactionFormTypeSelect.value;

  if (!title) {
    alert('Judul transaksi tidak boleh kosong.');
    return;
  }

  if (amount < 1) {
    alert('Nominal uang harus minimal 1 rupiah.');
    return;
  }

  if (editingTransactionId === null) {
    transactions.push({
      id: generateTransactionId(),
      title,
      amount,
      date,
      type,
    });
  } else {
    const editingTransaction = transactions.find((transaction) => transaction.id === editingTransactionId);
    editingTransaction.title = title;
    editingTransaction.amount = amount;
    editingTransaction.date = date;
    editingTransaction.type = type;
  }

  resetForm();
  closeFormModal();
  dispatchTransactionUpdated();
});

addTransactionButton.addEventListener('click', () => {
  resetForm();
  openFormModal();
});

transactionFormCancelButton.addEventListener('click', cancelForm);

transactionFormSection.addEventListener('click', (event) => {
  if (event.target === transactionFormSection) {
    cancelForm();
  }
});

document.addEventListener('keydown', (event) => {
  if (transactionFormSection.hidden) return;

  if (event.key === 'Escape') {
    cancelForm();
    return;
  }

  if (event.key === 'Tab') {
    const focusable = transactionFormCard.querySelectorAll('input, select, button');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});

searchTransactionForm.addEventListener('submit', (event) => {
  event.preventDefault();
  renderTransactions();
});

searchTransactionFormTitleInput.addEventListener('input', () => {
  renderTransactions();
});

document.addEventListener('transaction:updated', () => {
  renderTransactions();
  updateDashboard();
});

loadTransactions();
resetForm();
dispatchTransactionUpdated();

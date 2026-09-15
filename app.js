const STORAGE_KEY = "bilancio-casa-transactions";
const BILL_STORAGE_KEY = "bilancio-casa-bills";

const form = document.querySelector("#transactionForm");
const typeInput = document.querySelector("#type");
const amountInput = document.querySelector("#amount");
const categoryInput = document.querySelector("#category");
const dateInput = document.querySelector("#date");
const descriptionInput = document.querySelector("#description");

const transactionList = document.querySelector("#transactionList");
const incomeTotal = document.querySelector("#incomeTotal");
const expenseTotal = document.querySelector("#expenseTotal");
const balanceTotal = document.querySelector("#balanceTotal");
const pendingTotal = document.querySelector("#pendingTotal");
const monthLabel = document.querySelector("#monthLabel");
const previousMonthButton = document.querySelector("#previousMonthButton");
const nextMonthButton = document.querySelector("#nextMonthButton");

const billForm = document.querySelector("#billForm");
const billNameInput = document.querySelector("#billName");
const billCategoryInput = document.querySelector("#billCategory");
const billAmountInput = document.querySelector("#billAmount");
const billDueDateInput = document.querySelector("#billDueDate");
const billNotesInput = document.querySelector("#billNotes");
const billList = document.querySelector("#billList");
const paidBillList = document.querySelector("#paidBillList");

const euro = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR"
});

let selectedMonth = getTodayLocal().slice(0, 7);

dateInput.value = getTodayLocal();

function getTodayLocal() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTransactions() {
  const savedData = localStorage.getItem(STORAGE_KEY);

  try {
    return savedData ? JSON.parse(savedData) : [];
  } catch {
    return [];
  }
}

function saveTransactions(transactions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function getBills() {
  const savedData = localStorage.getItem(BILL_STORAGE_KEY);

  try {
    return savedData ? JSON.parse(savedData) : [];
  } catch {
    return [];
  }
}

function saveBills(bills) {
  localStorage.setItem(BILL_STORAGE_KEY, JSON.stringify(bills));
}

function formatSelectedMonth() {
  const [year, month] = selectedMonth.split("-").map(Number);
  const date = new Date(year, month - 1, 1);

  const formatted = new Intl.DateTimeFormat("it-IT", {
    month: "long",
    year: "numeric"
  }).format(date);

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function changeSelectedMonth(monthDifference) {
  const [year, month] = selectedMonth.split("-").map(Number);
  const date = new Date(year, month - 1 + monthDifference, 1);

  const newYear = date.getFullYear();
  const newMonth = String(date.getMonth() + 1).padStart(2, "0");
  const newMonthKey = `${newYear}-${newMonth}`;

  const currentMonthKey = getTodayLocal().slice(0, 7);

  if (newMonthKey > currentMonthKey) {
    return;
  }

  selectedMonth = newMonthKey;
  render();
}

function render() {
  const transactions = getTransactions();
  const currentMonthKey = getTodayLocal().slice(0, 7);

  monthLabel.textContent = formatSelectedMonth();
  nextMonthButton.disabled = selectedMonth >= currentMonthKey;

  const monthlyTransactions = transactions.filter((transaction) =>
    transaction.date.startsWith(selectedMonth)
  );

  const totalIncomeCents = monthlyTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce((total, transaction) => total + transaction.amountCents, 0);

  const totalExpenseCents = monthlyTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((total, transaction) => total + transaction.amountCents, 0);

  incomeTotal.textContent = euro.format(totalIncomeCents / 100);
  expenseTotal.textContent = euro.format(totalExpenseCents / 100);
  balanceTotal.textContent = euro.format(
    (totalIncomeCents - totalExpenseCents) / 100
  );

  const sortedTransactions = [...monthlyTransactions].sort((first, second) => {
    const dateComparison = second.date.localeCompare(first.date);

    if (dateComparison !== 0) {
      return dateComparison;
    }

    return second.createdAt.localeCompare(first.createdAt);
  });

  if (sortedTransactions.length === 0) {
    transactionList.innerHTML =
      '<p class="empty-message">Nessun movimento in questo mese.</p>';
  } else {
    transactionList.innerHTML = sortedTransactions
      .map((transaction) => createTransactionHtml(transaction))
      .join("");

    document.querySelectorAll(".delete-button").forEach((button) => {
      button.addEventListener("click", () => {
        deleteTransaction(button.dataset.id);
      });
    });
  }

  renderBills();
}

function createTransactionHtml(transaction) {
  const isIncome = transaction.type === "income";
  const sign = isIncome ? "+" : "−";
  const amountClass = isIncome ? "amount-income" : "amount-expense";
  const safeCategory = escapeHtml(transaction.category);
  const safeDescription = escapeHtml(
    transaction.description || "Nessuna descrizione"
  );

  return `
    <article class="transaction">
      <div class="transaction-info">
        <p class="transaction-title">${safeCategory}</p>
        <p class="transaction-meta">
          ${safeDescription} · ${formatDate(transaction.date)}
        </p>
      </div>

      <div class="transaction-right">
        <strong class="${amountClass}">
          ${sign} ${euro.format(transaction.amountCents / 100)}
        </strong>

        <button
          class="delete-button"
          type="button"
          data-id="${transaction.id}"
        >
          Elimina
        </button>
      </div>
    </article>
  `;
}

function addTransaction(event) {
  event.preventDefault();

  const amountText = amountInput.value.replace(",", ".");
  const amount = Number(amountText);

  if (!Number.isFinite(amount) || amount <= 0) {
    alert("Inserisci un importo valido maggiore di zero.");
    return;
  }

  const transaction = {
    id: crypto.randomUUID(),
    type: typeInput.value,
    amountCents: Math.round(amount * 100),
    category: categoryInput.value,
    date: dateInput.value,
    description: descriptionInput.value.trim(),
    createdAt: new Date().toISOString()
  };

  const transactions = getTransactions();
  transactions.push(transaction);
  saveTransactions(transactions);

  selectedMonth = transaction.date.slice(0, 7);
  form.reset();
  typeInput.value = "expense";
  dateInput.value = getTodayLocal();

  render();
}

function deleteTransaction(id) {
  const userConfirmed = confirm(
    "Vuoi eliminare definitivamente questo movimento?"
  );

  if (!userConfirmed) {
    return;
  }

  const updatedTransactions = getTransactions().filter(
    (transaction) => transaction.id !== id
  );

  saveTransactions(updatedTransactions);
  render();
}

function addBill(event) {
  event.preventDefault();

  const amountText = billAmountInput.value.replace(",", ".");
  const amount = Number(amountText);

  if (!Number.isFinite(amount) || amount <= 0) {
    alert("Inserisci un importo valido maggiore di zero.");
    return;
  }

  const bill = {
    id: crypto.randomUUID(),
    name: billNameInput.value.trim(),
    category: billCategoryInput.value,
    amountCents: Math.round(amount * 100),
    dueDate: billDueDateInput.value,
    notes: billNotesInput.value.trim(),
    status: "pending",
    createdAt: new Date().toISOString()
  };

  const bills = getBills();
  bills.push(bill);
  saveBills(bills);

  billForm.reset();
  render();
}

function renderBills() {
  const bills = getBills();

  const pendingBills = bills
    .filter((bill) => bill.status === "pending")
    .sort((first, second) => first.dueDate.localeCompare(second.dueDate));

  const paidBills = bills
    .filter((bill) => bill.status === "paid")
    .sort((first, second) => {
      return second.paidDate.localeCompare(first.paidDate);
    });

  const totalPendingCents = pendingBills.reduce(
    (total, bill) => total + bill.amountCents,
    0
  );

  pendingTotal.textContent = euro.format(totalPendingCents / 100);

  if (pendingBills.length === 0) {
    billList.innerHTML =
      '<p class="empty-message">Nessuna scadenza da pagare.</p>';
  } else {
    billList.innerHTML = pendingBills
      .map((bill) => createBillHtml(bill))
      .join("");
  }

  if (paidBills.length === 0) {
    paidBillList.innerHTML =
      '<p class="empty-message">Nessuna scadenza già pagata.</p>';
  } else {
    paidBillList.innerHTML = paidBills
      .map((bill) => createPaidBillHtml(bill))
      .join("");
  }

  document.querySelectorAll(".pay-bill-button").forEach((button) => {
    button.addEventListener("click", () => {
      payBill(button.dataset.id);
    });
  });

  document.querySelectorAll(".delete-bill-button").forEach((button) => {
    button.addEventListener("click", () => {
      deleteBill(button.dataset.id);
    });
  });
}

function createBillHtml(bill) {
  const today = getTodayLocal();
  const isOverdue = bill.dueDate < today;
  const dueStatus = isOverdue ? "Scaduta" : "Da pagare";
  const statusClass = isOverdue ? "bill-overdue" : "bill-pending";
  const safeName = escapeHtml(bill.name);
  const safeCategory = escapeHtml(bill.category);
  const safeNotes = escapeHtml(bill.notes || "Nessuna nota");

  return `
    <article class="bill ${statusClass}">
      <div class="bill-info">
        <p class="transaction-title">${safeName}</p>
        <p class="transaction-meta">
          ${safeCategory} · Scadenza: ${formatDate(bill.dueDate)}
        </p>
        <p class="transaction-meta">${safeNotes}</p>
        <p class="bill-status">${dueStatus}</p>
      </div>

      <div class="transaction-right">
        <strong class="amount-expense">
          ${euro.format(bill.amountCents / 100)}
        </strong>

        <button
          class="pay-bill-button"
          type="button"
          data-id="${bill.id}"
        >
          Segna pagata
        </button>

        <button
          class="delete-bill-button"
          type="button"
          data-id="${bill.id}"
        >
          Elimina
        </button>
      </div>
    </article>
  `;
}

function createPaidBillHtml(bill) {
  const safeName = escapeHtml(bill.name);
  const safeCategory = escapeHtml(bill.category);
  const safeNotes = escapeHtml(bill.notes || "Nessuna nota");

  return `
    <article class="bill bill-paid">
      <div class="bill-info">
        <p class="transaction-title">${safeName}</p>
        <p class="transaction-meta">
          ${safeCategory} · Pagata il: ${formatDate(bill.paidDate)}
        </p>
        <p class="transaction-meta">${safeNotes}</p>
        <p class="bill-status">Pagata</p>
      </div>

      <div class="transaction-right">
        <strong class="amount-income">
          ${euro.format(bill.amountCents / 100)}
        </strong>

        <button
          class="delete-bill-button"
          type="button"
          data-id="${bill.id}"
        >
          Elimina
        </button>
      </div>
    </article>
  `;
}

function payBill(id) {
  const bills = getBills();
  const bill = bills.find((item) => item.id === id);

  if (!bill) {
    return;
  }

  const userConfirmed = confirm(
    `Vuoi segnare come pagata la scadenza "${bill.name}" di ${euro.format(
      bill.amountCents / 100
    )}? Verrà aggiunta anche alle uscite.`
  );

  if (!userConfirmed) {
    return;
  }

  bill.status = "paid";
  bill.paidDate = getTodayLocal();
  saveBills(bills);

  const transactions = getTransactions();

  transactions.push({
    id: crypto.randomUUID(),
    type: "expense",
    amountCents: bill.amountCents,
    category: bill.category,
    date: bill.paidDate,
    description: `Pagamento: ${bill.name}`,
    createdAt: new Date().toISOString(),
    billId: bill.id
  });

  saveTransactions(transactions);

  selectedMonth = bill.paidDate.slice(0, 7);
  render();
}

function deleteBill(id) {
  const userConfirmed = confirm(
    "Vuoi eliminare definitivamente questa scadenza?"
  );

  if (!userConfirmed) {
    return;
  }

  const updatedBills = getBills().filter((bill) => bill.id !== id);
  saveBills(updatedBills);

  render();
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T12:00:00`);

  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

form.addEventListener("submit", addTransaction);
billForm.addEventListener("submit", addBill);

previousMonthButton.addEventListener("click", () => {
  changeSelectedMonth(-1);
});

nextMonthButton.addEventListener("click", () => {
  changeSelectedMonth(1);
});

render();
const STORAGE_KEY = "dailyPlannerCashflow.v1";
const ACCESS_KEY = "onflow.localAccess.v1";
const SESSION_KEY = "onflow.unlocked";
const PENDING_SYNC_KEY = `${STORAGE_KEY}.pendingSync`;
const FOCUS_TIMER_KEY = `${STORAGE_KEY}.focusTimer`;
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const TRANSACTION_TYPES = {
  income: { label: "Pendapatan", className: "income", sign: "+" },
  expense: { label: "Pengeluaran", className: "expense", sign: "-" },
  bill: { label: "Tagihan", className: "bill", sign: "-" },
  saving: { label: "Tabungan / Investasi", className: "saving", sign: "-" },
  debt: { label: "Pembayaran Utang", className: "debt", sign: "-" }
};
const OUTFLOW_TYPES = ["expense", "bill", "saving", "debt"];
const CHART_COLORS = ["#2f6f5e", "#ddae37", "#3395f2", "#dd5345"];
const CURRENCIES = {
  IDR: { locale: "id-ID", digits: 0 },
  USD: { locale: "en-US", digits: 2 },
  SGD: { locale: "en-SG", digits: 2 },
  EUR: { locale: "de-DE", digits: 2 },
  GBP: { locale: "en-GB", digits: 2 },
  JPY: { locale: "ja-JP", digits: 0 },
  AUD: { locale: "en-AU", digits: 2 }
};

const defaultState = {
  tasks: [
    { id: crypto.randomUUID(), title: "Review prioritas kerja hari ini", time: "09:00", type: "project", priority: "Tinggi", done: false },
    { id: crypto.randomUUID(), title: "Catat pengeluaran harian", time: "20:00", type: "daily", priority: "Sedang", done: false }
  ],
  habits: [
    { id: crypto.randomUUID(), name: "Minum air cukup", doneToday: false, streak: 0 },
    { id: crypto.randomUUID(), name: "Baca 10 menit", doneToday: false, streak: 0 }
  ],
  cashflows: [
    {
      id: crypto.randomUUID(),
      title: "Saldo awal",
      amount: 1000000,
      type: "income",
      category: "Lainnya",
      date: new Date().toISOString(),
      paymentMethod: ""
    }
  ],
  categories: [
    { id: crypto.randomUUID(), name: "Gaji", type: "income", budget: 0, color: "#2f6f5e" },
    { id: crypto.randomUUID(), name: "Freelance", type: "income", budget: 0, color: "#3395f2" },
    { id: crypto.randomUUID(), name: "Makan & Minum", type: "expense", budget: 1500000, color: "#dd5345" },
    { id: crypto.randomUUID(), name: "Transport", type: "expense", budget: 700000, color: "#ddae37" },
    { id: crypto.randomUUID(), name: "Belanja", type: "expense", budget: 800000, color: "#3395f2" },
    { id: crypto.randomUUID(), name: "Lainnya", type: "expense", budget: 300000, color: "#2f6f5e" }
  ],
  bills: [],
  savings: [],
  debts: [],
  incomePlans: [],
  focusSessions: [],
  preferences: { alarmSound: true, alarmVolume: 75, theme: "system", currency: "IDR" }
};

let state = loadState();
let editingBillId = "";
let editingSavingId = "";
let editingDebtId = "";
let editingCategoryId = "";
let focusInterval = null;
let focusAlarmInterval = null;
let focusAudioContext = null;
let serverAuthAvailable = false;
let remoteSession = false;
let cloudReady = false;
let cloudSaveTimer = null;
let cloudSyncStatus = "Data tersimpan di perangkat ini.";
const focusTimer = {
  preset: "25-5",
  phase: "work",
  remaining: 25 * 60,
  total: 25 * 60,
  running: false,
  endTime: 0,
  taskId: "",
  completedWorkSessions: 0
};
const FOCUS_PRESETS = {
  "25-5": { work: 25 * 60, break: 5 * 60, longBreak: 15 * 60, cyclesBeforeLongBreak: 4, label: "Fokus klasik 25 menit", shortLabel: "25/5" },
  "50-10": { work: 50 * 60, break: 10 * 60, longBreak: 20 * 60, cyclesBeforeLongBreak: 2, label: "Fokus panjang 50 menit", shortLabel: "50/10" }
};

const els = {
  accessGate: document.querySelector("#accessGate"),
  accessForm: document.querySelector("#accessForm"),
  accessKicker: document.querySelector("#accessKicker"),
  accessTitle: document.querySelector("#accessTitle"),
  accessMessage: document.querySelector("#accessMessage"),
  accessUsername: document.querySelector("#accessUsername"),
  accessPassword: document.querySelector("#accessPassword"),
  accessError: document.querySelector("#accessError"),
  accessSubmit: document.querySelector("#accessSubmit"),
  headerGreeting: document.querySelector("#headerGreeting"),
  todayDate: document.querySelector("#todayDate"),
  viewPanels: document.querySelectorAll(".view-panel"),
  workspaceNavButtons: document.querySelectorAll(".sidebar-link"),
  homeActionButtons: document.querySelectorAll("[data-home-action]"),
  tabButtons: document.querySelectorAll(".tab-button"),
  tabPanels: document.querySelectorAll(".tab-panel"),
  cashflowTabButtons: document.querySelectorAll(".cashflow-tab-button"),
  cashflowTabPanels: document.querySelectorAll(".cashflow-tab-panel"),
  taskCount: document.querySelector("#taskCount"),
  habitCount: document.querySelector("#habitCount"),
  taskForm: document.querySelector("#taskForm"),
  taskTitle: document.querySelector("#taskTitle"),
  taskTime: document.querySelector("#taskTime"),
  taskType: document.querySelector("#taskType"),
  taskPriority: document.querySelector("#taskPriority"),
  taskList: document.querySelector("#taskList"),
  clearDoneTasks: document.querySelector("#clearDoneTasks"),
  focusTaskLabel: document.querySelector("#focusTaskLabel"),
  focusTimer: document.querySelector("#focusTimer"),
  focusStatus: document.querySelector("#focusStatus"),
  focusProgress: document.querySelector("#focusProgress"),
  focusPresetButtons: document.querySelectorAll(".focus-preset"),
  startFocusTimer: document.querySelector("#startFocusTimer"),
  pauseFocusTimer: document.querySelector("#pauseFocusTimer"),
  resetFocusTimer: document.querySelector("#resetFocusTimer"),
  focusModeOverlay: document.querySelector("#focusModeOverlay"),
  focusModeTimer: document.querySelector("#focusModeTimer"),
  focusModePhase: document.querySelector("#focusModePhase"),
  focusModeTask: document.querySelector("#focusModeTask"),
  focusModeProgress: document.querySelector("#focusModeProgress"),
  focusModePause: document.querySelector("#focusModePause"),
  focusModeReset: document.querySelector("#focusModeReset"),
  closeFocusMode: document.querySelector("#closeFocusMode"),
  focusAlarmWidget: document.querySelector("#focusAlarmWidget"),
  focusAlarmBadge: document.querySelector("#focusAlarmBadge"),
  focusAlarmTitle: document.querySelector("#focusAlarmTitle"),
  focusAlarmMessage: document.querySelector("#focusAlarmMessage"),
  dismissFocusAlarm: document.querySelector("#dismissFocusAlarm"),
  startBreakButton: document.querySelector("#startBreakButton"),
  habitForm: document.querySelector("#habitForm"),
  habitName: document.querySelector("#habitName"),
  habitList: document.querySelector("#habitList"),
  homeBalance: document.querySelector("#homeBalance"),
  homeBalanceNote: document.querySelector("#homeBalanceNote"),
  homeTaskCount: document.querySelector("#homeTaskCount"),
  homeHabitCount: document.querySelector("#homeHabitCount"),
  homeExpenseTotal: document.querySelector("#homeExpenseTotal"),
  homeExpenseNote: document.querySelector("#homeExpenseNote"),
  homeBudgetRemaining: document.querySelector("#homeBudgetRemaining"),
  homeBudgetNote: document.querySelector("#homeBudgetNote"),
  homeTaskList: document.querySelector("#homeTaskList"),
  homeTransactionList: document.querySelector("#homeTransactionList"),
  homeBudgetList: document.querySelector("#homeBudgetList"),
  cashflowHeroBalance: document.querySelector("#cashflowHeroBalance"),
  cashflowSavingRate: document.querySelector("#cashflowSavingRate"),
  incomeTotal: document.querySelector("#incomeTotal"),
  expenseTotal: document.querySelector("#expenseTotal"),
  balanceTotal: document.querySelector("#balanceTotal"),
  savingsTotal: document.querySelector("#savingsTotal"),
  debtTotal: document.querySelector("#debtTotal"),
  categoryTotalLabel: document.querySelector("#categoryTotalLabel"),
  monthBalanceLabel: document.querySelector("#monthBalanceLabel"),
  expensePieChart: document.querySelector("#expensePieChart"),
  categoryChart: document.querySelector("#categoryChart"),
  expectedActualChart: document.querySelector("#expectedActualChart"),
  yearIncomeTotal: document.querySelector("#yearIncomeTotal"),
  yearExpenseTotal: document.querySelector("#yearExpenseTotal"),
  annualChart: document.querySelector("#annualChart"),
  cashflowPeriodButton: document.querySelector("#cashflowPeriodButton"),
  cashflowPeriodLabel: document.querySelector("#cashflowPeriodLabel"),
  cashflowPeriodMenu: document.querySelector("#cashflowPeriodMenu"),
  cashflowMonthGrid: document.querySelector("#cashflowMonthGrid"),
  cashflowMonth: document.querySelector("#cashflowMonth"),
  cashflowYear: document.querySelector("#cashflowYear"),
  transactionSearch: document.querySelector("#transactionSearch"),
  transactionTypeFilter: document.querySelector("#transactionTypeFilter"),
  transactionCategoryFilter: document.querySelector("#transactionCategoryFilter"),
  cashflowList: document.querySelector("#cashflowList"),
  transactionDialog: document.querySelector("#transactionDialog"),
  openTransactionButtons: document.querySelectorAll("[data-open-transaction]"),
  closeTransactionDialog: document.querySelector("#closeTransactionDialog"),
  transactionDialogTitle: document.querySelector("#transactionDialogTitle"),
  cashflowForm: document.querySelector("#cashflowForm"),
  editingTransactionId: document.querySelector("#editingTransactionId"),
  cashflowType: document.querySelector("#cashflowType"),
  cashflowCategory: document.querySelector("#cashflowCategory"),
  cashflowAmount: document.querySelector("#cashflowAmount"),
  cashflowDate: document.querySelector("#cashflowDate"),
  cashflowTitle: document.querySelector("#cashflowTitle"),
  cashflowPaymentMethod: document.querySelector("#cashflowPaymentMethod"),
  budgetForm: document.querySelector("#budgetForm"),
  budgetCategory: document.querySelector("#budgetCategory"),
  budgetAmount: document.querySelector("#budgetAmount"),
  budgetRemainingTotal: document.querySelector("#budgetRemainingTotal"),
  budgetList: document.querySelector("#budgetList"),
  budgetPlanMonth: document.querySelector("#budgetPlanMonth"),
  incomePlanForm: document.querySelector("#incomePlanForm"),
  incomePlanName: document.querySelector("#incomePlanName"),
  incomePlanAmount: document.querySelector("#incomePlanAmount"),
  incomePlanDifference: document.querySelector("#incomePlanDifference"),
  incomePlanList: document.querySelector("#incomePlanList"),
  budgetBillForm: document.querySelector("#budgetBillForm"),
  budgetBillName: document.querySelector("#budgetBillName"),
  budgetBillDueDate: document.querySelector("#budgetBillDueDate"),
  budgetBillAmount: document.querySelector("#budgetBillAmount"),
  budgetBillList: document.querySelector("#budgetBillList"),
  budgetSavingForm: document.querySelector("#budgetSavingForm"),
  budgetSavingName: document.querySelector("#budgetSavingName"),
  budgetSavingAmount: document.querySelector("#budgetSavingAmount"),
  budgetSavingList: document.querySelector("#budgetSavingList"),
  budgetDebtForm: document.querySelector("#budgetDebtForm"),
  budgetDebtName: document.querySelector("#budgetDebtName"),
  budgetDebtDueDate: document.querySelector("#budgetDebtDueDate"),
  budgetDebtAmount: document.querySelector("#budgetDebtAmount"),
  budgetDebtList: document.querySelector("#budgetDebtList"),
  billForm: document.querySelector("#billForm"),
  billName: document.querySelector("#billName"),
  billDueDate: document.querySelector("#billDueDate"),
  billPlanned: document.querySelector("#billPlanned"),
  billList: document.querySelector("#billList"),
  savingForm: document.querySelector("#savingForm"),
  savingName: document.querySelector("#savingName"),
  savingTarget: document.querySelector("#savingTarget"),
  savingList: document.querySelector("#savingList"),
  debtForm: document.querySelector("#debtForm"),
  debtName: document.querySelector("#debtName"),
  debtDueDate: document.querySelector("#debtDueDate"),
  debtPlanned: document.querySelector("#debtPlanned"),
  debtList: document.querySelector("#debtList"),
  categoryForm: document.querySelector("#categoryForm"),
  categoryName: document.querySelector("#categoryName"),
  categoryType: document.querySelector("#categoryType"),
  categoryBudget: document.querySelector("#categoryBudget"),
  categoryColor: document.querySelector("#categoryColor"),
  categoryList: document.querySelector("#categoryList"),
  reportPeriod: document.querySelector("#reportPeriod"),
  reportStartDate: document.querySelector("#reportStartDate"),
  reportEndDate: document.querySelector("#reportEndDate"),
  reportPeriodLabel: document.querySelector("#reportPeriodLabel"),
  reportIncome: document.querySelector("#reportIncome"),
  reportExpense: document.querySelector("#reportExpense"),
  reportBills: document.querySelector("#reportBills"),
  reportSavings: document.querySelector("#reportSavings"),
  reportBalance: document.querySelector("#reportBalance"),
  reportPlanDifference: document.querySelector("#reportPlanDifference"),
  reportPlanChart: document.querySelector("#reportPlanChart"),
  reportExpenseCategories: document.querySelector("#reportExpenseCategories"),
  reportIncomeCategories: document.querySelector("#reportIncomeCategories"),
  reportTopExpenses: document.querySelector("#reportTopExpenses"),
  reportTasksDone: document.querySelector("#reportTasksDone"),
  reportTasksOpen: document.querySelector("#reportTasksOpen"),
  reportCompletionRate: document.querySelector("#reportCompletionRate"),
  reportFocusSessions: document.querySelector("#reportFocusSessions"),
  reportFocusDuration: document.querySelector("#reportFocusDuration"),
  reportBestHabit: document.querySelector("#reportBestHabit"),
  reportBestHabitStreak: document.querySelector("#reportBestHabitStreak"),
  reportAverageFocus: document.querySelector("#reportAverageFocus"),
  themeButtons: document.querySelectorAll("[data-theme-option]"),
  settingsAlarmSound: document.querySelector("#settingsAlarmSound"),
  settingsAlarmVolume: document.querySelector("#settingsAlarmVolume"),
  settingsCurrency: document.querySelector("#settingsCurrency"),
  settingsProfileName: document.querySelector("#settingsProfileName"),
  settingsIntention: document.querySelector("#settingsIntention"),
  logoutButton: document.querySelector("#logoutButton"),
  emptyStateTemplate: document.querySelector("#emptyStateTemplate")
};

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(defaultState);
  try {
    return normalizeState(JSON.parse(saved));
  } catch {
    return structuredClone(defaultState);
  }
}

function normalizeState(saved) {
  const legacyBudgets = Array.isArray(saved.budgets) ? saved.budgets : [];
  const categories = Array.isArray(saved.categories) && saved.categories.length
    ? saved.categories
    : defaultState.categories.map((category) => {
        const legacy = legacyBudgets.find((budget) => budget.category === category.name);
        return { ...category, id: crypto.randomUUID(), budget: legacy ? Number(legacy.amount) : category.budget };
      });

  return {
    tasks: (Array.isArray(saved.tasks) ? saved.tasks : defaultState.tasks).map((task) => ({
      ...task,
      type: task.type === "daily" ? "daily" : "project",
      completedAt: task.completedAt || ""
    })),
    habits: Array.isArray(saved.habits) ? saved.habits : defaultState.habits,
    cashflows: (Array.isArray(saved.cashflows) ? saved.cashflows : defaultState.cashflows).map((entry) => ({
      id: entry.id || crypto.randomUUID(),
      title: entry.title || "",
      amount: Number(entry.amount) || 0,
      type: TRANSACTION_TYPES[entry.type] ? entry.type : "expense",
      category: entry.category || "Lainnya",
      date: entry.date || new Date().toISOString(),
      paymentMethod: entry.paymentMethod || "",
      linkedEntityId: entry.linkedEntityId || ""
    })),
    categories,
    bills: Array.isArray(saved.bills) ? saved.bills : [],
    savings: Array.isArray(saved.savings) ? saved.savings : [],
    debts: Array.isArray(saved.debts) ? saved.debts : [],
    incomePlans: Array.isArray(saved.incomePlans) ? saved.incomePlans : [],
    focusSessions: Array.isArray(saved.focusSessions) ? saved.focusSessions : [],
    preferences: {
      alarmSound: saved.preferences?.alarmSound !== false,
      alarmVolume: Number(saved.preferences?.alarmVolume ?? 75),
      theme: ["light", "dark", "system"].includes(saved.preferences?.theme) ? saved.preferences.theme : "system",
      currency: CURRENCIES[saved.preferences?.currency] ? saved.preferences.currency : "IDR"
    }
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (remoteSession && cloudReady) queueCloudSave();
}

function queueCloudSave() {
  window.clearTimeout(cloudSaveTimer);
  localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(state));
  cloudSyncStatus = "Menyinkronkan perubahan...";
  cloudSaveTimer = window.setTimeout(syncCloudState, 450);
}

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || "Permintaan gagal.");
    error.status = response.status;
    throw error;
  }
  return data;
}

async function syncCloudState() {
  if (!remoteSession || !cloudReady) return;
  const stateSnapshot = JSON.stringify(state);
  try {
    await apiRequest("/api/state", {
      method: "PUT",
      body: JSON.stringify({ state: JSON.parse(stateSnapshot) })
    });
    if (localStorage.getItem(PENDING_SYNC_KEY) === stateSnapshot) {
      localStorage.removeItem(PENDING_SYNC_KEY);
    }
    cloudSyncStatus = "Tersinkron aman ke cloud.";
  } catch (error) {
    console.error(error);
    cloudSyncStatus = "Sinkronisasi tertunda. Data tetap aman di perangkat.";
  }
  renderSettings();
}

async function hydrateCloudState() {
  cloudReady = false;
  const result = await apiRequest("/api/state");
  let pendingState = null;
  try {
    const pendingRaw = localStorage.getItem(PENDING_SYNC_KEY);
    if (pendingRaw) pendingState = normalizeState(JSON.parse(pendingRaw));
  } catch {
    localStorage.removeItem(PENDING_SYNC_KEY);
  }

  if (pendingState) {
    state = pendingState;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } else if (result.state) {
    state = normalizeState(result.state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  cloudReady = true;
  if (pendingState || !result.state) await syncCloudState();
  cloudSyncStatus = "Tersinkron aman ke cloud.";
  render();
}

function getAccessProfile() {
  try {
    return JSON.parse(localStorage.getItem(ACCESS_KEY) || "null");
  } catch {
    return null;
  }
}

function configureAccessGate() {
  const profile = getAccessProfile();
  const locallyUnlocked = !serverAuthAvailable && sessionStorage.getItem(SESSION_KEY) === "true";
  if (remoteSession || (profile && locallyUnlocked)) {
    unlockWorkspace();
    return;
  }

  document.body.classList.remove("auth-checking");
  document.body.classList.add("access-locked");
  els.accessGate.hidden = false;
  els.accessError.textContent = "";
  const savedUsername = profile?.username || profile?.name || "";
  els.accessUsername.value = savedUsername;
  els.accessKicker.textContent = "Akses pribadi";
  els.accessTitle.textContent = "Selamat datang.";
  els.accessMessage.textContent = "Masukkan username dan password untuk melanjutkan.";
  els.accessSubmit.textContent = "Masuk";
  window.setTimeout(() => els.accessPassword.focus(), 50);
}

function unlockWorkspace() {
  document.body.classList.remove("auth-checking");
  document.body.classList.remove("access-locked");
  els.accessGate.hidden = true;
  if (!serverAuthAvailable) sessionStorage.setItem(SESSION_KEY, "true");
  applyTheme(state.preferences.theme);
  renderSettings();
}

async function handleAccessSubmit(event) {
  event.preventDefault();
  const profile = getAccessProfile();
  const username = els.accessUsername.value.trim();
  const password = els.accessPassword.value;
  els.accessError.textContent = "";

  if (!username) {
    els.accessError.textContent = "Masukkan username.";
    return;
  }

  els.accessSubmit.disabled = true;
  els.accessSubmit.textContent = "Memeriksa...";
  try {
    if (serverAuthAvailable) {
      const result = await apiRequest("/api/login", {
        method: "POST",
        body: JSON.stringify({ username, password })
      });
      remoteSession = true;
      localStorage.setItem(ACCESS_KEY, JSON.stringify({ username: result.username || username }));
      unlockWorkspace();
      try {
        await hydrateCloudState();
      } catch (error) {
        console.error(error);
        cloudReady = false;
        cloudSyncStatus = "Cloud belum terhubung. Data sementara tersimpan di perangkat ini.";
      }
    } else if (!profile || !(profile.password || profile.pin)) {
      localStorage.setItem(ACCESS_KEY, JSON.stringify({ username, password }));
    } else {
      const savedUsername = profile.username || profile.name || "";
      const savedPassword = profile.password || profile.pin || "";
      if (savedUsername.toLocaleLowerCase("id-ID") !== username.toLocaleLowerCase("id-ID")
        || savedPassword !== password) {
        throw new Error("Username atau password belum tepat.");
      }
    }
  } catch (error) {
    els.accessError.textContent = error.message || "Tidak dapat masuk.";
    els.accessPassword.select();
    return;
  } finally {
    els.accessSubmit.disabled = false;
    els.accessSubmit.textContent = "Masuk";
  }

  els.accessForm.reset();
  unlockWorkspace();
  primeFocusAudio();
  requestFocusNotifications();
}

function resolveTheme(theme) {
  if (theme !== "system") return theme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme = state.preferences.theme) {
  document.documentElement.dataset.theme = resolveTheme(theme);
  document.documentElement.style.colorScheme = resolveTheme(theme);
  els.themeButtons.forEach((button) => {
    const active = button.dataset.themeOption === theme;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function renderSettings() {
  const profile = getAccessProfile();
  const username = profile?.username || profile?.name || "";
  els.settingsProfileName.textContent = username || "Profil OnFlow";
  els.settingsIntention.textContent = remoteSession ? cloudSyncStatus : "Data tersimpan secara lokal di perangkat ini.";
  els.settingsAlarmSound.checked = state.preferences.alarmSound;
  els.settingsAlarmVolume.value = state.preferences.alarmVolume;
  els.settingsCurrency.value = state.preferences.currency;
  applyTheme(state.preferences.theme);
}

function formatCurrency(value) {
  const currency = state.preferences.currency || "IDR";
  const config = CURRENCIES[currency] || CURRENCIES.IDR;
  return new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency,
    minimumFractionDigits: config.digits,
    maximumFractionDigits: config.digits
  }).format(Number(value) || 0);
}

function renderCurrencyInputs() {
  const currency = state.preferences.currency || "IDR";
  const placeholders = {
    cashflowAmount: "0",
    incomePlanAmount: "0",
    budgetAmount: "0",
    budgetBillAmount: "0",
    budgetSavingAmount: "0",
    budgetDebtAmount: "0",
    billPlanned: "0",
    savingTarget: "0",
    debtPlanned: "0",
    categoryBudget: "0"
  };
  Object.entries(placeholders).forEach(([id, label]) => {
    const input = document.querySelector(`#${id}`);
    if (!input) return;
    input.dataset.currency = currency;
    input.placeholder = label;
    input.setAttribute("aria-label", `${id} dalam ${currency}`);
    const prefix = input.parentElement.querySelector(`.price-prefix[data-input-id="${id}"]`);
    if (prefix) {
      prefix.textContent = currency;
    }
  });
}

function formatDateInput(date = new Date()) {
  const local = new Date(date);
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  return local.toISOString().slice(0, 10);
}

function formatMonthInput(date = new Date()) {
  return formatDateInput(date).slice(0, 7);
}

function renderEmpty(container, text = "Belum ada data.") {
  const node = els.emptyStateTemplate.content.cloneNode(true);
  node.querySelector(".empty-state").textContent = text;
  container.replaceChildren(node);
}

function render() {
  els.headerGreeting.textContent = getGreeting();
  updateHeaderClock();

  renderTasks();
  renderFocusTimer();
  renderHabits();
  renderCashflowControls();
  renderCashflow();
  renderHome();
  renderReports();
  renderSettings();
  renderCurrencyInputs();
  saveState();
}

function updateHeaderClock() {
  const now = new Date();
  const date = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(now);
  const time = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
  els.todayDate.replaceChildren(
    Object.assign(document.createElement("span"), { className: "header-date", textContent: date }),
    Object.assign(document.createElement("span"), { className: "header-time", textContent: time })
  );
  els.headerGreeting.textContent = getGreeting(now);
}

function getGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 11) return "Selamat pagi 👋";
  if (hour < 15) return "Selamat siang 👋";
  if (hour < 19) return "Selamat sore 👋";
  return "Selamat malam 👋";
}

function setActiveTab(tabName) {
  els.tabButtons.forEach((button) => {
    const active = button.dataset.tab === tabName;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  els.tabPanels.forEach((panel) => {
    const active = panel.dataset.panel === tabName;
    panel.classList.toggle("active", active);
    panel.hidden = !active;
  });
  setActiveWorkspaceNav(tabName);
}

function setActiveCashflowTab(tabName) {
  els.cashflowTabButtons.forEach((button) => {
    const active = button.dataset.cashflowTab === tabName;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  els.cashflowTabPanels.forEach((panel) => {
    const active = panel.dataset.cashflowPanel === tabName;
    panel.classList.toggle("active", active);
    panel.hidden = !active;
  });
  if (!document.querySelector("#cashflowPanel").hidden) {
    setActiveWorkspaceNav("cashflow");
  }
  localStorage.setItem(`${STORAGE_KEY}.activeCashflowTab`, tabName);
}

function setActiveWorkspaceNav(target) {
  els.workspaceNavButtons.forEach((button) => {
    const active = button.dataset.workspaceTarget === target;
    button.classList.toggle("active", active);
    button.setAttribute("aria-current", active ? "page" : "false");
  });
}

function navigateWorkspace(target) {
  if (target === "home") return setActiveTab("home");
  if (target === "reports" || target === "settings") {
    setActiveTab(target);
    return setActiveWorkspaceNav(target);
  }
  if (target === "daily") {
    setActiveTab("daily");
    return setActiveWorkspaceNav(target);
  }
  if (target === "budget") {
    setActiveTab("cashflow");
    setActiveCashflowTab("budget");
    return setActiveWorkspaceNav("cashflow");
  }
  setActiveTab("cashflow");
  setActiveCashflowTab("transactions");
  setActiveWorkspaceNav(target);
}

function renderTasks() {
  const sorted = [...state.tasks].sort((a, b) => Number(a.done) - Number(b.done) || (a.time || "99:99").localeCompare(b.time || "99:99"));
  els.taskCount.textContent = state.tasks.filter((task) => !task.done).length;
  if (!sorted.length) return renderEmpty(els.taskList);
  const groups = [
    { type: "project", label: "Proyek kerja" },
    { type: "daily", label: "Aktivitas harian" }
  ].map(({ type, label }) => {
    const tasks = sorted.filter((task) => task.type === type);
    const group = document.createElement("section");
    group.className = "task-group";
    const heading = document.createElement("div");
    heading.className = "task-group-heading";
    heading.innerHTML = `<strong></strong><span></span>`;
    heading.querySelector("strong").textContent = label;
    heading.querySelector("span").textContent = `${tasks.filter((task) => !task.done).length} tersisa`;
    const list = document.createElement("div");
    list.className = "task-group-list";
    if (!tasks.length) {
      const empty = document.createElement("div");
      empty.className = "task-group-empty";
      empty.textContent = type === "project" ? "Belum ada tugas proyek." : "Belum ada aktivitas harian.";
      list.append(empty);
    } else {
      list.append(...tasks.map((task) => {
    const item = document.createElement("div");
    item.className = `list-item${task.done ? " done" : ""}`;
    const checkbox = document.createElement("input");
    checkbox.className = "check";
    checkbox.type = "checkbox";
    checkbox.checked = task.done;
    checkbox.ariaLabel = `Tandai ${task.title} selesai`;
    checkbox.addEventListener("change", () => {
      task.done = checkbox.checked;
      task.completedAt = checkbox.checked ? new Date().toISOString() : "";
      render();
    });
    const main = document.createElement("div");
    main.className = "item-main";
    main.innerHTML = `<span class="item-title"></span><span class="item-meta"><span></span><span class="pill"></span></span>`;
    main.querySelector(".item-title").textContent = task.title;
    main.querySelector(".item-meta > span").textContent = task.time || "Tanpa jam";
    const pill = main.querySelector(".pill");
    pill.textContent = task.priority;
    pill.classList.add(priorityClass(task.priority));
    const actions = document.createElement("div");
    actions.className = "task-actions";
    const focusButton = document.createElement("button");
    focusButton.className = "task-focus-button";
    focusButton.type = "button";
    focusButton.innerHTML = iconMarkup("play");
    focusButton.title = `Fokus: ${task.title}`;
    focusButton.ariaLabel = `Mulai fokus untuk ${task.title}`;
    focusButton.addEventListener("click", () => selectFocusTask(task.id, true));
    const deleteButton = actionButton("delete", `Hapus tugas ${task.title}`, () => {
      state.tasks = state.tasks.filter((entry) => entry.id !== task.id);
      if (focusTimer.taskId === task.id) resetFocusSession("");
      render();
    });
    actions.append(focusButton, deleteButton);
    item.append(checkbox, main, actions);
    return item;
      }));
    }
    group.append(heading, list);
    return group;
  });
  els.taskList.replaceChildren(...groups);
}

function renderFocusTimer() {
  syncFocusRemaining();
  const selectedTask = state.tasks.find((task) => task.id === focusTimer.taskId);
  const preset = FOCUS_PRESETS[focusTimer.preset];
  const phaseLabel = focusTimer.phase === "work" ? "Kerja fokus" : "Istirahat";
  els.focusTaskLabel.textContent = selectedTask
    ? `Sedang fokus: ${selectedTask.title}`
    : "Pilih tugas untuk mulai.";
  els.focusTimer.textContent = formatTimer(focusTimer.remaining);
  els.focusStatus.textContent = focusTimer.running
    ? `${phaseLabel} berjalan`
    : focusTimer.phase === "work"
      ? preset.label
      : `${focusTimer.total > preset.break ? "Istirahat panjang" : "Istirahat"} ${Math.round(focusTimer.total / 60)} menit`;
  const progress = focusTimer.total ? 100 - ((focusTimer.remaining / focusTimer.total) * 100) : 0;
  els.focusProgress.style.width = `${Math.min(100, Math.max(0, progress))}%`;
  els.focusPresetButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.focusPreset === focusTimer.preset);
  });
  els.startFocusTimer.innerHTML = focusTimer.running ? iconMarkup("check") : iconMarkup("play");
  els.startFocusTimer.disabled = focusTimer.running;
  els.startFocusTimer.ariaLabel = focusTimer.running ? "Fokus sedang berjalan" : "Mulai fokus";
  els.startFocusTimer.title = focusTimer.running ? "Berjalan" : "Mulai";
  renderFocusMode({ selectedTask, phaseLabel, progress });
}

function selectFocusTask(taskId, startNow = false) {
  focusTimer.taskId = taskId;
  resetFocusSession(taskId);
  if (startNow) startFocusTimer();
  renderFocusTimer();
}

function resetFocusSession(taskId = focusTimer.taskId) {
  stopFocusInterval();
  focusTimer.taskId = taskId;
  focusTimer.phase = "work";
  focusTimer.running = false;
  focusTimer.endTime = 0;
  focusTimer.total = FOCUS_PRESETS[focusTimer.preset].work;
  focusTimer.remaining = focusTimer.total;
  saveFocusTimer();
  closeFocusMode();
}

function startFocusTimer() {
  if (focusTimer.running) return;
  primeFocusAudio();
  focusTimer.running = true;
  focusTimer.endTime = Date.now() + (focusTimer.remaining * 1000);
  saveFocusTimer();
  openFocusMode();
  renderFocusTimer();
  focusInterval = window.setInterval(tickFocusTimer, 500);
}

function pauseFocusTimer() {
  syncFocusRemaining();
  stopFocusInterval();
  focusTimer.running = false;
  focusTimer.endTime = 0;
  saveFocusTimer();
  renderFocusTimer();
}

function stopFocusInterval() {
  if (!focusInterval) return;
  window.clearInterval(focusInterval);
  focusInterval = null;
}

function tickFocusTimer() {
  if (!focusTimer.running) return;
  syncFocusRemaining();
  if (focusTimer.remaining <= 0) {
    completeFocusPhase();
    return;
  }
  renderFocusTimer();
}

function syncFocusRemaining() {
  if (!focusTimer.running || !focusTimer.endTime) return;
  focusTimer.remaining = Math.max(0, Math.ceil((focusTimer.endTime - Date.now()) / 1000));
}

function completeFocusPhase() {
  const completedPhase = focusTimer.phase;
  if (completedPhase === "work") {
    focusTimer.completedWorkSessions += 1;
    state.focusSessions.push({
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      duration: focusTimer.total,
      taskId: focusTimer.taskId
    });
  }
  stopFocusInterval();
  focusTimer.running = false;
  focusTimer.endTime = 0;
  switchFocusPhase(completedPhase);
  triggerFocusAlarm(completedPhase);
  saveFocusTimer();
  saveState();
  renderFocusTimer();
}

function switchFocusPhase(completedPhase = focusTimer.phase) {
  const preset = FOCUS_PRESETS[focusTimer.preset];
  focusTimer.phase = completedPhase === "work" ? "break" : "work";
  const longBreakDue = completedPhase === "work"
    && focusTimer.completedWorkSessions > 0
    && focusTimer.completedWorkSessions % preset.cyclesBeforeLongBreak === 0;
  focusTimer.total = focusTimer.phase === "work"
    ? preset.work
    : longBreakDue ? preset.longBreak : preset.break;
  focusTimer.remaining = focusTimer.total;
  focusTimer.endTime = 0;
  saveFocusTimer();
}

function saveFocusTimer() {
  localStorage.setItem(FOCUS_TIMER_KEY, JSON.stringify(focusTimer));
}

function restoreFocusTimer() {
  try {
    const saved = JSON.parse(localStorage.getItem(FOCUS_TIMER_KEY) || "null");
    if (!saved || !FOCUS_PRESETS[saved.preset]) return;
    focusTimer.preset = saved.preset;
    focusTimer.phase = saved.phase === "break" ? "break" : "work";
    focusTimer.total = Math.max(1, Number(saved.total) || FOCUS_PRESETS[focusTimer.preset].work);
    focusTimer.remaining = Math.max(0, Number(saved.remaining) || focusTimer.total);
    focusTimer.endTime = Number(saved.endTime) || 0;
    focusTimer.taskId = typeof saved.taskId === "string" ? saved.taskId : "";
    focusTimer.completedWorkSessions = Math.max(0, Number(saved.completedWorkSessions) || 0);
    focusTimer.running = Boolean(saved.running && saved.endTime);

    if (focusTimer.running) {
      syncFocusRemaining();
      if (focusTimer.remaining <= 0) {
        completeFocusPhase();
      } else if (!focusInterval) {
        focusInterval = window.setInterval(tickFocusTimer, 500);
        openFocusMode();
      }
    }
  } catch {
    localStorage.removeItem(FOCUS_TIMER_KEY);
  }
}

function renderFocusMode(context = {}) {
  if (!els.focusModeOverlay) return;
  const selectedTask = context.selectedTask || state.tasks.find((task) => task.id === focusTimer.taskId);
  const phaseLabel = context.phaseLabel || (focusTimer.phase === "work" ? "Kerja fokus" : "Istirahat");
  const progress = typeof context.progress === "number"
    ? context.progress
    : focusTimer.total ? 100 - ((focusTimer.remaining / focusTimer.total) * 100) : 0;
  els.focusModeTimer.textContent = formatTimer(focusTimer.remaining);
  els.focusModePhase.textContent = focusTimer.running ? `${phaseLabel} berjalan` : phaseLabel;
  els.focusModeTask.textContent = selectedTask
    ? selectedTask.title
    : focusTimer.phase === "work" ? "Tetap fokus, satu hal dulu." : "Tarik napas sebentar.";
  els.focusModeProgress.style.width = `${Math.min(100, Math.max(0, progress))}%`;
  els.focusModePause.innerHTML = focusTimer.running ? iconMarkup("pause") : iconMarkup("play");
  els.focusModePause.ariaLabel = focusTimer.running ? "Jeda fokus" : "Lanjut fokus";
  els.focusModePause.title = focusTimer.running ? "Jeda" : "Lanjut";
}

function openFocusMode() {
  if (!els.focusModeOverlay || !els.focusModeOverlay.hidden) return;
  els.focusModeOverlay.hidden = false;
  document.body.classList.add("focus-mode-open");
}

function closeFocusMode() {
  if (!els.focusModeOverlay) return;
  els.focusModeOverlay.hidden = true;
  document.body.classList.remove("focus-mode-open");
}

function formatTimer(seconds) {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const rest = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function triggerFocusAlarm(completedPhase) {
  const selectedTask = state.tasks.find((task) => task.id === focusTimer.taskId);
  const title = completedPhase === "work" ? "Waktu Fokus Selesai" : "Waktu Istirahat Selesai";
  const message = completedPhase === "work"
    ? `Saatnya istirahat sejenak.${selectedTask ? ` Kamu baru menyelesaikan sesi untuk ${selectedTask.title}.` : ""}`
    : "Saatnya kembali fokus.";
  startRepeatingFocusAlarm();
  showFocusAlarmWidget(title, message, completedPhase);
  sendFocusNotification(title, message);
}

function showFocusAlarmWidget(title, message, completedPhase) {
  els.focusAlarmBadge.textContent = completedPhase === "work" ? "Waktunya istirahat" : "Waktunya fokus";
  els.focusAlarmTitle.textContent = title;
  els.focusAlarmMessage.textContent = message;
  els.startBreakButton.textContent = completedPhase === "work" ? "Mulai Istirahat" : "Mulai Fokus";
  els.focusAlarmWidget.hidden = false;
  document.body.classList.add("alarm-open");
  document.title = `${title} · OnFlow`;
}

function dismissFocusAlarm() {
  stopRepeatingFocusAlarm();
  els.focusAlarmWidget.hidden = true;
  document.body.classList.remove("alarm-open");
  document.title = "OnFlow";
}

async function requestFocusNotifications() {
  if (!("Notification" in window) || Notification.permission !== "default") return;
  try {
    await Notification.requestPermission();
  } catch {
    // Overlay alarm remains available when notification permission is unavailable.
  }
}

function sendFocusNotification(title, message) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  new Notification(title, {
    body: message,
    tag: "onflow-focus-alarm",
    renotify: true
  });
}

function vibrateFocusAlarm() {
  if ("vibrate" in navigator) navigator.vibrate([350, 160, 350, 160, 650]);
}

function startRepeatingFocusAlarm() {
  stopRepeatingFocusAlarm();
  playFocusAlarm();
  vibrateFocusAlarm();
  focusAlarmInterval = window.setInterval(() => {
    playFocusAlarm();
    vibrateFocusAlarm();
  }, 2200);
}

function stopRepeatingFocusAlarm() {
  if (focusAlarmInterval) {
    window.clearInterval(focusAlarmInterval);
    focusAlarmInterval = null;
  }
  if ("vibrate" in navigator) navigator.vibrate(0);
}

function playFocusAlarm() {
  if (!state.preferences.alarmSound) return;
  try {
    const context = primeFocusAudio();
    if (!context) return;
    const volume = Math.max(0.01, Math.min(1, state.preferences.alarmVolume / 100));
    const masterGain = context.createGain();
    masterGain.gain.setValueAtTime(0.001, context.currentTime);
    masterGain.gain.exponentialRampToValueAtTime(0.72 * volume, context.currentTime + 0.03);
    masterGain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 1.55);
    masterGain.connect(context.destination);

    [0, 0.14, 0.28, 0.42, 0.68, 0.82, 0.96, 1.1].forEach((offset, index) => {
      const bell = context.createOscillator();
      const overtone = context.createOscillator();
      const gain = context.createGain();
      bell.type = "square";
      overtone.type = "square";
      bell.frequency.setValueAtTime(index % 2 ? 620 : 880, context.currentTime + offset);
      bell.frequency.linearRampToValueAtTime(index % 2 ? 600 : 910, context.currentTime + offset + 0.12);
      overtone.frequency.setValueAtTime(index % 2 ? 1240 : 1760, context.currentTime + offset);
      gain.gain.setValueAtTime(0.001, context.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.34, context.currentTime + offset + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + offset + 0.11);
      bell.connect(gain);
      overtone.connect(gain);
      gain.connect(masterGain);
      bell.start(context.currentTime + offset);
      overtone.start(context.currentTime + offset);
      bell.stop(context.currentTime + offset + 0.13);
      overtone.stop(context.currentTime + offset + 0.13);
    });
  } catch {
    // Browser may block audio until the user interacts. The visual timer still switches phase.
  }
}

function primeFocusAudio() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    if (!focusAudioContext) focusAudioContext = new AudioContext();
    if (focusAudioContext.state === "suspended") focusAudioContext.resume();
    return focusAudioContext;
  } catch {
    return null;
  }
}

function startNextFocusPhase() {
  dismissFocusAlarm();
  startFocusTimer();
}

function renderHabits() {
  els.habitCount.textContent = `${state.habits.filter((habit) => habit.doneToday).length}/${state.habits.length}`;
  if (!state.habits.length) return renderEmpty(els.habitList);
  els.habitList.replaceChildren(...state.habits.map((habit) => {
    const item = document.createElement("div");
    item.className = `list-item${habit.doneToday ? " done" : ""}`;
    const checkbox = document.createElement("input");
    checkbox.className = "check";
    checkbox.type = "checkbox";
    checkbox.checked = habit.doneToday;
    checkbox.ariaLabel = `Tandai kebiasaan ${habit.name}`;
    checkbox.addEventListener("change", () => {
      habit.doneToday = checkbox.checked;
      habit.streak = Math.max(0, Number(habit.streak || 0) + (checkbox.checked ? 1 : -1));
      render();
    });
    const main = document.createElement("div");
    main.className = "item-main";
    main.innerHTML = `<span class="item-title"></span><span class="item-meta"><span class="pill"></span></span>`;
    main.querySelector(".item-title").textContent = habit.name;
    main.querySelector(".pill").textContent = `${habit.streak || 0} hari`;
    item.append(checkbox, main, actionButton("delete", `Hapus kebiasaan ${habit.name}`, () => {
      state.habits = state.habits.filter((entry) => entry.id !== habit.id);
      render();
    }));
    return item;
  }));
}

function renderCashflowControls() {
  if (!els.cashflowMonth.value) els.cashflowMonth.value = formatMonthInput();
  if (!els.budgetPlanMonth.value) els.budgetPlanMonth.value = els.cashflowMonth.value;
  const currentMonth = els.cashflowMonth.value || formatMonthInput();
  const selectedYear = currentMonth.slice(0, 4);
  const selectedMonthNumber = currentMonth.slice(5, 7);
  const currentYear = new Date().getFullYear();
  const years = new Set(Array.from({ length: 7 }, (_, index) => currentYear - 3 + index));
  years.add(Number(selectedYear));
  state.cashflows.forEach((entry) => years.add(new Date(entry.date).getFullYear()));
  els.cashflowYear.replaceChildren(...[...years].sort((a, b) => b - a).map((year) => optionNode(year, year, String(year) === selectedYear)));
  const monthOptions = Array.from({ length: 12 }, (_, index) => {
    const month = String(index + 1).padStart(2, "0");
    const label = new Intl.DateTimeFormat("id-ID", { month: "long" }).format(new Date(2026, index, 1));
    return { month, label };
  });
  els.cashflowMonth.replaceChildren(...monthOptions.map(({ month, label }) =>
    optionNode(`${selectedYear}-${month}`, label, month === selectedMonthNumber)
  ));
  const activeMonth = monthOptions.find(({ month }) => month === selectedMonthNumber) || monthOptions[0];
  els.cashflowPeriodLabel.textContent = activeMonth.label.toLocaleUpperCase("id-ID");
  els.cashflowMonthGrid.replaceChildren(...monthOptions.map(({ month, label }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "cashflow-month-option";
    button.textContent = label.slice(0, 3);
    button.dataset.month = month;
    button.classList.toggle("active", month === selectedMonthNumber);
    button.setAttribute("aria-pressed", String(month === selectedMonthNumber));
    button.addEventListener("click", () => {
      els.cashflowMonth.value = `${els.cashflowYear.value}-${month}`;
      closeCashflowPeriodMenu();
      render();
    });
    return button;
  }));

  fillTypeSelect(els.transactionTypeFilter, true);
  fillTypeSelect(els.cashflowType, false);
  fillTypeSelect(els.categoryType, false);
  renderCategoryOptions();
}

function toggleCashflowPeriodMenu() {
  const willOpen = els.cashflowPeriodMenu.hidden;
  els.cashflowPeriodMenu.hidden = !willOpen;
  els.cashflowPeriodButton.setAttribute("aria-expanded", String(willOpen));
  if (willOpen) els.cashflowYear.focus();
}

function closeCashflowPeriodMenu() {
  els.cashflowPeriodMenu.hidden = true;
  els.cashflowPeriodButton.setAttribute("aria-expanded", "false");
}

function fillTypeSelect(select, includeAll) {
  const current = select.value;
  const nodes = includeAll ? [optionNode("", "Semua tipe")] : [];
  Object.entries(TRANSACTION_TYPES).forEach(([value, config]) => nodes.push(optionNode(value, config.label, value === current)));
  select.replaceChildren(...nodes);
  if (current && [...select.options].some((option) => option.value === current)) select.value = current;
}

function renderCategoryOptions() {
  const currentFilter = els.transactionCategoryFilter.value;
  els.transactionCategoryFilter.replaceChildren(
    optionNode("", "Semua kategori"),
    ...state.categories.map((category) => optionNode(category.name, category.name, category.name === currentFilter))
  );
  const currentBudget = els.budgetCategory.value;
  els.budgetCategory.replaceChildren(...state.categories
    .filter((category) => category.type === "expense")
    .map((category) => optionNode(category.name, category.name, category.name === currentBudget)));
  updateTransactionCategories();
}

function updateTransactionCategories() {
  const type = els.cashflowType.value || "income";
  const current = els.cashflowCategory.value;
  let items = state.categories.filter((category) => category.type === type).map((category) => ({
    value: category.name,
    label: category.name,
    id: ""
  }));
  if (type === "bill") items = state.bills.map((item) => ({ value: item.name, label: item.name, id: item.id }));
  if (type === "saving") items = state.savings.map((item) => ({ value: item.name, label: item.name, id: item.id }));
  if (type === "debt") items = state.debts.map((item) => ({ value: item.name, label: item.name, id: item.id }));
  if (!items.length) items = [{ value: "Lainnya", label: "Lainnya", id: "" }];
  els.cashflowCategory.replaceChildren(...items.map((item) => {
    const option = optionNode(item.value, item.label, item.value === current);
    option.dataset.entityId = item.id;
    return option;
  }));
}

function renderCashflow() {
  const monthly = getMonthlyCashflows();
  const income = totalByTypes(monthly, ["income"]);
  const expense = totalByTypes(monthly, ["expense", "bill"]);
  const savings = totalByTypes(monthly, ["saving"]);
  const debt = totalByTypes(monthly, ["debt"]);
  const remaining = income - expense - savings - debt;
  const savingRate = income > 0 ? Math.round(((income - expense - debt) / income) * 100) : 0;

  els.cashflowHeroBalance.textContent = formatCurrency(remaining);
  els.cashflowSavingRate.textContent = `${savingRate}% pendapatan tersisa`;
  els.incomeTotal.textContent = formatCurrency(income);
  els.expenseTotal.textContent = formatCurrency(expense);
  els.balanceTotal.textContent = formatCurrency(remaining);
  els.savingsTotal.textContent = formatCurrency(savings);
  els.debtTotal.textContent = formatCurrency(debt);
  els.monthBalanceLabel.textContent = formatCurrency(remaining);

  renderExpectedActual(monthly);
  renderCategoryChart(monthly);
  renderAnnualChart(getYearlyCashflows());
  renderTransactions();
  renderBudgetPlan();
  renderBills(monthly);
  renderSavings(monthly);
  renderDebts(monthly);
  renderCategories();
}

function renderExpectedActual(entries) {
  const month = els.cashflowMonth.value || formatMonthInput();
  const rows = [
    { label: "Pengeluaran", expected: categoryBudgetTotal(month), actual: totalByTypes(entries, ["expense"]) },
    { label: "Tagihan", expected: sum(monthEntities(state.bills, month), "planned"), actual: totalByTypes(entries, ["bill"]) },
    { label: "Tabungan", expected: sum(monthEntities(state.savings, month), "target"), actual: totalByTypes(entries, ["saving"]) },
    { label: "Utang", expected: sum(monthEntities(state.debts, month), "planned"), actual: totalByTypes(entries, ["debt"]) }
  ];
  const max = Math.max(...rows.flatMap((row) => [row.expected, row.actual]), 1);
  els.expectedActualChart.replaceChildren(...rows.map((row) => {
    const item = document.createElement("div");
    item.className = "expected-row";
    item.innerHTML = `<div class="expected-heading"><strong></strong><span></span></div><div class="dual-bars"><div class="bar-track"><div class="bar planned"></div></div><div class="bar-track"><div class="bar actual"></div></div></div>`;
    item.querySelector("strong").textContent = row.label;
    item.querySelector("span").textContent = `${formatCurrency(row.actual)} / ${formatCurrency(row.expected)}`;
    item.querySelector(".planned").style.width = `${Math.round((row.expected / max) * 100)}%`;
    item.querySelector(".actual").style.width = `${Math.round((row.actual / max) * 100)}%`;
    return item;
  }));
}

function renderCategoryChart(entries) {
  const expenseEntries = entries.filter((entry) => ["expense", "bill"].includes(entry.type));
  const totals = groupByCategory(expenseEntries);
  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((sumValue, [, value]) => sumValue + value, 0);
  els.categoryTotalLabel.textContent = formatCurrency(total);
  const pieLayout = els.expensePieChart.closest(".pie-layout");
  pieLayout?.classList.toggle("is-empty", !total);
  if (!total) {
    els.expensePieChart.style.background = "";
    els.expensePieChart.innerHTML = "";
    return renderEmpty(els.categoryChart, "Belum ada pengeluaran.");
  }
  let cursor = 0;
  els.expensePieChart.innerHTML = "";
  els.expensePieChart.style.background = "transparent";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Pengeluaran per kategori");
  const labelNodes = [];
  sorted.forEach(([name, value], index) => {
    const start = cursor;
    cursor += (value / total) * 100;
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pieSlicePath(50, 50, 43, start / 100, cursor / 100));
    path.setAttribute("fill", categoryColor(name, index));
    path.setAttribute("stroke", "var(--panel-bg)");
    path.setAttribute("stroke-width", "1.8");
    path.setAttribute("stroke-linejoin", "round");
    svg.append(path);

    const percent = cursor - start;
    const middle = start + (percent / 2);
    const label = document.createElement("span");
    label.className = "pie-percentage";
    label.textContent = `${Math.round(percent)}%`;
    label.style.setProperty("--angle", `${middle * 3.6}deg`);
    label.style.setProperty("--distance", percent < 10 ? "34%" : "30%");
    label.title = `${name}: ${formatCurrency(value)}`;
    labelNodes.push(label);
  });
  els.expensePieChart.replaceChildren(svg, ...labelNodes);
  els.categoryChart.replaceChildren(...sorted.map(([name, amount], index) => {
    const row = document.createElement("div");
    row.className = "category-legend-row";
    row.innerHTML = `<span><i></i><span></span></span><strong></strong>`;
    row.querySelector("i").style.background = categoryColor(name, index);
    row.querySelector("span span").textContent = name;
    row.querySelector("strong").textContent = formatCurrency(amount);
    return row;
  }));
}

function pieSlicePath(cx, cy, radius, startRatio, endRatio) {
  if (endRatio - startRatio >= 0.999) {
    return [
      `M ${cx} ${cy}`,
      `L ${cx} ${cy - radius}`,
      `A ${radius} ${radius} 0 1 1 ${cx - 0.01} ${cy - radius}`,
      `A ${radius} ${radius} 0 1 1 ${cx} ${cy - radius}`,
      "Z"
    ].join(" ");
  }
  const startAngle = (startRatio * 360) - 90;
  const endAngle = (endRatio * 360) - 90;
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? "0" : "1";
  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y}`,
    "Z"
  ].join(" ");
}

function polarToCartesian(cx, cy, radius, angleInDegrees) {
  const angleInRadians = (angleInDegrees * Math.PI) / 180;
  return {
    x: cx + (radius * Math.cos(angleInRadians)),
    y: cy + (radius * Math.sin(angleInRadians))
  };
}

function renderAnnualChart(entries) {
  const rows = MONTH_NAMES.map((month, index) => {
    const monthEntries = entries.filter((entry) => new Date(entry.date).getMonth() === index);
    return {
      month,
      income: totalByTypes(monthEntries, ["income"]),
      outflow: totalByTypes(monthEntries, OUTFLOW_TYPES)
    };
  });
  const max = Math.max(...rows.flatMap((row) => [row.income, row.outflow]), 1);
  els.yearIncomeTotal.textContent = `Masuk ${formatCurrency(rows.reduce((sumValue, row) => sumValue + row.income, 0))}`;
  els.yearExpenseTotal.textContent = `Keluar ${formatCurrency(rows.reduce((sumValue, row) => sumValue + row.outflow, 0))}`;
  els.annualChart.replaceChildren(...rows.map((row) => {
    const item = document.createElement("div");
    item.className = "annual-row";
    item.innerHTML = `<span></span><div class="annual-bars"><div class="bar-track"><div class="bar income"></div></div><div class="bar-track"><div class="bar expense"></div></div></div><strong class="annual-value"></strong>`;
    item.querySelector("span").textContent = row.month;
    item.querySelector(".income").style.width = `${Math.round((row.income / max) * 100)}%`;
    item.querySelector(".expense").style.width = `${Math.round((row.outflow / max) * 100)}%`;
    item.querySelector("strong").textContent = formatCurrency(row.income - row.outflow);
    return item;
  }));
}

function renderTransactions() {
  const search = els.transactionSearch.value.trim().toLowerCase();
  const type = els.transactionTypeFilter.value;
  const category = els.transactionCategoryFilter.value;
  const filtered = getMonthlyCashflows()
    .filter((entry) => !type || entry.type === type)
    .filter((entry) => !category || entry.category === category)
    .filter((entry) => !search || `${entry.title} ${entry.category} ${entry.paymentMethod}`.toLowerCase().includes(search))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  if (!filtered.length) return renderEmpty(els.cashflowList, "Tidak ada transaksi yang cocok.");
  const groups = Object.groupBy
    ? Object.groupBy(filtered, (entry) => formatDateInput(entry.date))
    : filtered.reduce((result, entry) => {
        const key = formatDateInput(entry.date);
        (result[key] ||= []).push(entry);
        return result;
      }, {});

  els.cashflowList.replaceChildren(...Object.entries(groups).map(([date, entries]) => {
    const group = document.createElement("section");
    group.className = "transaction-date-group";
    const heading = document.createElement("h4");
    heading.textContent = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long" })
      .format(new Date(`${date}T12:00:00`));
    const list = document.createElement("div");
    list.className = "transaction-list";
    list.replaceChildren(...entries.map(transactionRow));
    group.append(heading, list);
    return group;
  }));
}

function transactionRow(entry) {
  const config = TRANSACTION_TYPES[entry.type];
  const row = document.createElement("article");
  row.className = "transaction-row";
  row.innerHTML = `
    <span class="transaction-type-dot"></span>
    <div class="transaction-copy"><strong></strong><span></span></div>
    <strong class="transaction-amount"></strong>
    <div class="transaction-actions"></div>
  `;
  row.querySelector(".transaction-type-dot").classList.add(config.className);
  row.querySelector(".transaction-copy strong").textContent = entry.title || entry.category;
  row.querySelector(".transaction-copy span").textContent = [config.label, entry.category, entry.paymentMethod].filter(Boolean).join(" · ");
  const amount = row.querySelector(".transaction-amount");
  amount.classList.add(config.className);
  amount.textContent = `${config.sign}${formatCurrency(entry.amount)}`;
  const actions = row.querySelector(".transaction-actions");
  actions.append(
    actionButton("edit", `Edit ${entry.title || entry.category}`, () => openTransactionDialog(entry)),
    actionButton("delete", `Hapus ${entry.title || entry.category}`, () => {
      state.cashflows = state.cashflows.filter((item) => item.id !== entry.id);
      render();
    })
  );
  return row;
}

function renderBudgetPlan() {
  const month = els.budgetPlanMonth.value || formatMonthInput();
  const entries = getCashflowsForMonth(month);
  renderIncomePlans(entries, month);
  renderBudgets(entries, month);
  renderLinkedEntities(els.budgetBillList, monthEntities(state.bills, month), entries, "bill", "planned", (item) => {
    editingBillId = item.id;
    els.budgetBillName.value = item.name;
    els.budgetBillDueDate.value = item.dueDate;
    els.budgetBillAmount.value = item.planned;
  }, (id) => {
    state.bills = state.bills.filter((item) => item.id !== id);
  });
  renderLinkedEntities(els.budgetSavingList, monthEntities(state.savings, month), entries, "saving", "target", (item) => {
    editingSavingId = item.id;
    els.budgetSavingName.value = item.name;
    els.budgetSavingAmount.value = item.target;
  }, (id) => {
    state.savings = state.savings.filter((item) => item.id !== id);
  });
  renderLinkedEntities(els.budgetDebtList, monthEntities(state.debts, month), entries, "debt", "planned", (item) => {
    editingDebtId = item.id;
    els.budgetDebtName.value = item.name;
    els.budgetDebtDueDate.value = item.dueDate;
    els.budgetDebtAmount.value = item.planned;
  }, (id) => {
    state.debts = state.debts.filter((item) => item.id !== id);
  });
}

function renderIncomePlans(entries, month) {
  const plans = state.incomePlans.filter((plan) => plan.month === month);
  const planned = sum(plans, "planned");
  const actual = totalByTypes(entries, ["income"]);
  els.incomePlanDifference.textContent = `Selisih ${formatCurrency(actual - planned)}`;
  if (!plans.length) return renderEmpty(els.incomePlanList, "Belum ada rencana pendapatan.");
  els.incomePlanList.replaceChildren(...plans.map((plan) => {
    const planActual = entries
      .filter((entry) => entry.type === "income" && entry.category === plan.name)
      .reduce((total, entry) => total + Number(entry.amount), 0);
    const percent = plan.planned ? Math.round((planActual / plan.planned) * 100) : 0;
    return progressEntityRow(plan.name, plan.planned, planActual, percent, planActual >= plan.planned ? "paid" : "normal", () => {
      els.incomePlanName.value = plan.name;
      els.incomePlanAmount.value = plan.planned;
      els.incomePlanForm.dataset.editingId = plan.id;
    }, () => {
      state.incomePlans = state.incomePlans.filter((item) => item.id !== plan.id);
      render();
    });
  }));
}

function renderBudgets(entries, month = els.cashflowMonth.value || formatMonthInput()) {
  const totals = groupByCategory(entries.filter((entry) => ["expense", "bill"].includes(entry.type)));
  const budgetedCategories = state.categories.filter((category) => category.type === "expense" && getCategoryBudget(category, month) > 0);
  const remaining = budgetedCategories.reduce((sumValue, category) => sumValue + getCategoryBudget(category, month), 0)
    - budgetedCategories.reduce((sumValue, category) => sumValue + (totals[category.name] || 0), 0);
  els.budgetRemainingTotal.textContent = `Sisa ${formatCurrency(remaining)}`;
  if (!budgetedCategories.length) return renderEmpty(els.budgetList, "Belum ada anggaran kategori.");
  els.budgetList.replaceChildren(...budgetedCategories.map((category) => {
    const planned = getCategoryBudget(category, month);
    const actual = totals[category.name] || 0;
    const percent = planned > 0 ? Math.round((actual / planned) * 100) : 0;
    return progressEntityRow(category.name, planned, actual, percent, budgetStatus(percent), () => {
      els.budgetCategory.value = category.name;
      els.budgetAmount.value = planned;
    }, () => {
      category.monthlyBudgets ||= {};
      category.monthlyBudgets[month] = 0;
      render();
    });
  }));
}

function monthEntities(entities, month) {
  return entities.filter((entity) => !entity.month || entity.month === month);
}

function getCategoryBudget(category, month) {
  return Number(category.monthlyBudgets?.[month] ?? category.budget ?? 0);
}

function renderBills(entries) {
  renderLinkedEntities(els.billList, state.bills, entries, "bill", "planned", (item) => {
    editingBillId = item.id;
    els.billName.value = item.name;
    els.billDueDate.value = item.dueDate;
    els.billPlanned.value = item.planned;
  }, (id) => {
    state.bills = state.bills.filter((item) => item.id !== id);
  });
}

function renderSavings(entries) {
  renderLinkedEntities(els.savingList, state.savings, entries, "saving", "target", (item) => {
    editingSavingId = item.id;
    els.savingName.value = item.name;
    els.savingTarget.value = item.target;
  }, (id) => {
    state.savings = state.savings.filter((item) => item.id !== id);
  });
}

function renderDebts(entries) {
  renderLinkedEntities(els.debtList, state.debts, entries, "debt", "planned", (item) => {
    editingDebtId = item.id;
    els.debtName.value = item.name;
    els.debtDueDate.value = item.dueDate;
    els.debtPlanned.value = item.planned;
  }, (id) => {
    state.debts = state.debts.filter((item) => item.id !== id);
  });
}

function renderLinkedEntities(container, entities, entries, type, targetKey, onEdit, onDelete) {
  if (!entities.length) return renderEmpty(container);
  container.replaceChildren(...entities.map((entity) => {
    const actual = entries
      .filter((entry) => entry.type === type && (entry.linkedEntityId === entity.id || entry.category === entity.name))
      .reduce((sumValue, entry) => sumValue + Number(entry.amount), 0);
    const target = Number(entity[targetKey]) || 0;
    const percent = target > 0 ? Math.round((actual / target) * 100) : 0;
    const status = actual >= target && target > 0 ? "paid" : percent >= 80 ? "near" : "normal";
    return progressEntityRow(entity.name, target, actual, percent, status, () => onEdit(entity), () => {
      onDelete(entity.id);
      render();
    }, entity.dueDate);
  }));
}

function progressEntityRow(name, planned, actual, percent, status, onEdit, onDelete, dueDate = "") {
  const row = document.createElement("article");
  row.className = `entity-row status-${status}`;
  row.innerHTML = `
    <div class="entity-copy"><strong></strong><span></span></div>
    <div class="entity-progress"><div class="bar-track"><div class="bar"></div></div><span></span></div>
    <span class="status-badge"></span>
    <div class="entity-actions"></div>
  `;
  row.querySelector(".entity-copy strong").textContent = name;
  row.querySelector(".entity-copy span").textContent = dueDate ? `Jatuh tempo ${formatShortDate(dueDate)}` : `${formatCurrency(actual)} / ${formatCurrency(planned)}`;
  row.querySelector(".bar").style.width = `${Math.min(percent, 100)}%`;
  row.querySelector(".entity-progress span").textContent = `${percent}%`;
  row.querySelector(".status-badge").textContent = statusLabel(status);
  row.querySelector(".entity-actions").append(
    actionButton("edit", `Edit ${name}`, onEdit),
    actionButton("delete", `Hapus ${name}`, onDelete)
  );
  return row;
}

function renderCategories() {
  if (!state.categories.length) return renderEmpty(els.categoryList);
  els.categoryList.replaceChildren(...state.categories.map((category) => {
    const row = document.createElement("article");
    row.className = "category-management-row";
    row.innerHTML = `<i></i><div><strong></strong><span></span></div><strong></strong><div class="entity-actions"></div>`;
    row.querySelector("i").style.background = category.color;
    row.querySelector("div strong").textContent = category.name;
    row.querySelector("div span").textContent = TRANSACTION_TYPES[category.type]?.label || category.type;
    row.querySelector(":scope > strong").textContent = category.budget ? formatCurrency(category.budget) : "Tanpa anggaran";
    row.querySelector(".entity-actions").append(
      actionButton("edit", `Edit ${category.name}`, () => {
        editingCategoryId = category.id;
        els.categoryName.value = category.name;
        els.categoryType.value = category.type;
        els.categoryBudget.value = category.budget || "";
        els.categoryColor.value = category.color;
      }),
      actionButton("delete", `Hapus ${category.name}`, () => {
        state.categories = state.categories.filter((item) => item.id !== category.id);
        render();
      })
    );
    return row;
  }));
}

function renderHome() {
  const monthly = getMonthlyCashflows();
  const income = totalByTypes(monthly, ["income"]);
  const outflow = totalByTypes(monthly, OUTFLOW_TYPES);
  const openTasks = state.tasks.filter((task) => !task.done);
  const month = els.cashflowMonth.value || formatMonthInput();
  const budget = categoryBudgetTotal(month);
  const budgetActual = totalByTypes(monthly, ["expense"]);
  els.homeBalance.textContent = formatCurrency(income - outflow);
  els.homeBalanceNote.textContent = income ? `${Math.round(((income - outflow) / income) * 100)}% pemasukan tersisa` : "Belum ada pemasukan";
  els.homeTaskCount.textContent = openTasks.length;
  els.homeHabitCount.textContent = `${state.habits.filter((habit) => habit.doneToday).length}/${state.habits.length}`;
  els.homeExpenseTotal.textContent = formatCurrency(totalByTypes(monthly, ["expense", "bill"]));
  els.homeExpenseNote.textContent = `${monthly.filter((entry) => OUTFLOW_TYPES.includes(entry.type)).length} transaksi keluar`;
  els.homeBudgetRemaining.textContent = formatCurrency(budget - budgetActual);
  els.homeBudgetNote.textContent = budgetActual > budget ? "Anggaran terlewati" : "Masih tersedia bulan ini";
  renderHomeTasks(openTasks);
  renderHomeTransactions(monthly);
  renderHomeBudgets(monthly);
}

function renderHomeTasks(tasks) {
  const order = { Tinggi: 0, Sedang: 1, Rendah: 2 };
  const selected = [...tasks].sort((a, b) => order[a.priority] - order[b.priority]).slice(0, 4);
  if (!selected.length) return renderEmpty(els.homeTaskList);
  els.homeTaskList.replaceChildren(...selected.map((task) => {
    const row = document.createElement("div");
    row.className = "home-list-item";
    row.innerHTML = `<div><strong></strong><span></span></div><span class="pill"></span>`;
    row.querySelector("strong").textContent = task.title;
    row.querySelector("div span").textContent = task.time || "Tanpa jam";
    row.querySelector(".pill").textContent = task.priority;
    return row;
  }));
}

function renderHomeTransactions(entries) {
  const selected = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 4);
  if (!selected.length) return renderEmpty(els.homeTransactionList);
  els.homeTransactionList.replaceChildren(...selected.map((entry) => {
    const config = TRANSACTION_TYPES[entry.type];
    const row = document.createElement("div");
    row.className = "home-list-item";
    row.innerHTML = `<div><strong></strong><span></span></div><strong class="amount"></strong>`;
    row.querySelector("div strong").textContent = entry.title || entry.category;
    row.querySelector("div span").textContent = `${config.label} · ${entry.category}`;
    row.querySelector(".amount").textContent = `${config.sign}${formatCurrency(entry.amount)}`;
    row.querySelector(".amount").classList.add(config.className);
    return row;
  }));
}

function renderHomeBudgets(entries) {
  const month = els.cashflowMonth.value || formatMonthInput();
  const totals = groupByCategory(entries.filter((entry) => entry.type === "expense"));
  const categories = state.categories.filter((category) => category.type === "expense" && getCategoryBudget(category, month)).slice(0, 4);
  if (!categories.length) return renderEmpty(els.homeBudgetList);
  els.homeBudgetList.replaceChildren(...categories.map((category) => {
    const planned = getCategoryBudget(category, month);
    const actual = totals[category.name] || 0;
    const percent = planned ? Math.min(100, Math.round((actual / planned) * 100)) : 0;
    const row = document.createElement("div");
    row.className = "home-budget-item";
    row.innerHTML = `<div class="home-budget-heading"><strong></strong><span></span></div><div class="bar-track"><div class="bar expense"></div></div>`;
    row.querySelector("strong").textContent = category.name;
    row.querySelector("span").textContent = `${formatCurrency(actual)} / ${formatCurrency(planned)}`;
    row.querySelector(".bar").style.width = `${percent}%`;
    return row;
  }));
}

function renderReports() {
  const range = getReportRange();
  const entries = state.cashflows.filter((entry) => {
    const time = new Date(entry.date).getTime();
    return time >= range.start.getTime() && time <= range.end.getTime();
  });
  const income = totalByTypes(entries, ["income"]);
  const expense = totalByTypes(entries, ["expense"]);
  const bills = totalByTypes(entries, ["bill"]);
  const savings = totalByTypes(entries, ["saving"]);
  const debt = totalByTypes(entries, ["debt"]);
  const balance = income - expense - bills - savings - debt;
  els.reportPeriodLabel.textContent = range.label;
  els.reportIncome.textContent = formatCurrency(income);
  els.reportExpense.textContent = formatCurrency(expense);
  els.reportBills.textContent = formatCurrency(bills);
  els.reportSavings.textContent = formatCurrency(savings);
  els.reportBalance.textContent = formatCurrency(balance);

  const month = formatMonthInput(range.start);
  const plannedIncome = sum(state.incomePlans.filter((plan) => plan.month === month), "planned");
  const plannedExpense = categoryBudgetTotal(month);
  const plannedBills = sum(monthEntities(state.bills, month), "planned");
  const plannedSavings = sum(monthEntities(state.savings, month), "target");
  const rows = [
    { label: "Pendapatan", expected: plannedIncome, actual: income },
    { label: "Pengeluaran", expected: plannedExpense, actual: expense },
    { label: "Tagihan", expected: plannedBills, actual: bills },
    { label: "Tabungan", expected: plannedSavings, actual: savings }
  ];
  const max = Math.max(...rows.flatMap((row) => [row.expected, row.actual]), 1);
  els.reportPlanDifference.textContent = `Selisih ${formatCurrency(income - expense - bills - plannedIncome + plannedExpense + plannedBills)}`;
  els.reportPlanChart.replaceChildren(...rows.map((row) => reportComparisonRow(row, max)));
  renderReportCategoryList(els.reportExpenseCategories, groupByCategory(entries.filter((entry) => ["expense", "bill"].includes(entry.type))));
  renderReportCategoryList(els.reportIncomeCategories, groupByCategory(entries.filter((entry) => entry.type === "income")));
  renderReportRanking(entries.filter((entry) => ["expense", "bill"].includes(entry.type)));
  renderProductivityReport(range);
}

function getReportRange() {
  const now = new Date();
  let start = new Date(now.getFullYear(), now.getMonth(), 1);
  let end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  let label = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(start);
  if (els.reportPeriod.value === "previous") {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    label = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(start);
  }
  if (els.reportPeriod.value === "custom") {
    const startValue = els.reportStartDate.value || formatDateInput(start);
    const endValue = els.reportEndDate.value || formatDateInput(end);
    start = new Date(`${startValue}T00:00:00`);
    end = new Date(`${endValue}T23:59:59`);
    label = `${formatShortDate(startValue)} - ${formatShortDate(endValue)}`;
  }
  return { start, end, label };
}

function reportComparisonRow(row, max) {
  const item = document.createElement("div");
  item.className = "expected-row";
  item.innerHTML = `<div class="expected-heading"><strong></strong><span></span></div><div class="dual-bars"><div class="bar-track"><div class="bar planned"></div></div><div class="bar-track"><div class="bar actual"></div></div></div>`;
  item.querySelector("strong").textContent = row.label;
  item.querySelector("span").textContent = `${formatCurrency(row.actual)} / ${formatCurrency(row.expected)}`;
  item.querySelector(".planned").style.width = `${Math.round((row.expected / max) * 100)}%`;
  item.querySelector(".actual").style.width = `${Math.round((row.actual / max) * 100)}%`;
  return item;
}

function renderReportCategoryList(container, totals) {
  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const max = sorted[0]?.[1] || 1;
  if (!sorted.length) return renderEmpty(container);
  container.replaceChildren(...sorted.map(([name, amount], index) => {
    const row = document.createElement("div");
    row.className = "report-category-row";
    row.innerHTML = `<div><i></i><strong></strong><span></span></div><div class="bar-track"><div class="bar"></div></div>`;
    row.querySelector("i").style.background = categoryColor(name, index);
    row.querySelector("strong").textContent = name;
    row.querySelector("span").textContent = formatCurrency(amount);
    row.querySelector(".bar").style.width = `${Math.round((amount / max) * 100)}%`;
    row.querySelector(".bar").style.background = categoryColor(name, index);
    return row;
  }));
}

function renderReportRanking(entries) {
  const totals = Object.entries(groupByCategory(entries)).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (!totals.length) return renderEmpty(els.reportTopExpenses);
  els.reportTopExpenses.replaceChildren(...totals.map(([name, amount], index) => {
    const row = document.createElement("div");
    row.className = "ranking-row";
    row.innerHTML = `<span></span><strong></strong><small></small>`;
    row.querySelector("span").textContent = index + 1;
    row.querySelector("strong").textContent = name;
    row.querySelector("small").textContent = formatCurrency(amount);
    return row;
  }));
}

function renderProductivityReport(range) {
  const done = state.tasks.filter((task) => task.done && (!task.completedAt || isDateInRange(task.completedAt, range))).length;
  const open = state.tasks.filter((task) => !task.done).length;
  const total = done + open;
  const sessions = state.focusSessions.filter((session) => isDateInRange(session.date, range));
  const durationMinutes = Math.round(sessions.reduce((totalValue, session) => totalValue + Number(session.duration || 0), 0) / 60);
  const activeDays = new Set(sessions.map((session) => formatDateInput(session.date))).size || 1;
  const bestHabit = [...state.habits].sort((a, b) => Number(b.streak || 0) - Number(a.streak || 0))[0];
  els.reportTasksDone.textContent = done;
  els.reportTasksOpen.textContent = open;
  els.reportCompletionRate.textContent = `${total ? Math.round((done / total) * 100) : 0}%`;
  els.reportFocusSessions.textContent = sessions.length;
  els.reportFocusDuration.textContent = `${durationMinutes} menit`;
  if (bestHabit && bestHabit.streak > 0) {
    els.reportBestHabit.textContent = bestHabit.name;
    els.reportBestHabitStreak.textContent = `${bestHabit.streak} hari beruntun`;
  } else {
    els.reportBestHabit.textContent = "Belum ada data";
    els.reportBestHabitStreak.textContent = "Mulai kebiasaan pertamamu";
  }
  els.reportAverageFocus.textContent = `${Math.round(durationMinutes / activeDays)} menit`;
}

function isDateInRange(value, range) {
  const time = new Date(value).getTime();
  return time >= range.start.getTime() && time <= range.end.getTime();
}

function openTransactionDialog(entry = null) {
  els.cashflowForm.reset();
  els.editingTransactionId.value = entry?.id || "";
  els.transactionDialogTitle.textContent = entry ? "Edit Transaksi" : "Tambah Transaksi";
  els.cashflowType.value = entry?.type || "expense";
  updateTransactionCategories();
  if (entry) els.cashflowCategory.value = entry.category;
  els.cashflowAmount.value = entry?.amount || "";
  els.cashflowDate.value = entry ? formatDateInput(entry.date) : formatDateInput();
  els.cashflowTitle.value = entry?.title || "";
  els.cashflowPaymentMethod.value = entry?.paymentMethod || "";
  if (typeof els.transactionDialog.showModal === "function") els.transactionDialog.showModal();
  else els.transactionDialog.setAttribute("open", "");
}

function closeTransactionDialog() {
  if (typeof els.transactionDialog.close === "function") els.transactionDialog.close();
  else els.transactionDialog.removeAttribute("open");
}

function getMonthlyCashflows() {
  const month = els.cashflowMonth.value || formatMonthInput();
  return getCashflowsForMonth(month);
}

function getCashflowsForMonth(month) {
  return state.cashflows.filter((entry) => formatDateInput(entry.date).slice(0, 7) === month);
}

function getYearlyCashflows() {
  const year = Number(els.cashflowYear.value || new Date().getFullYear());
  return state.cashflows.filter((entry) => new Date(entry.date).getFullYear() === year);
}

function totalByTypes(entries, types) {
  return entries.filter((entry) => types.includes(entry.type)).reduce((sumValue, entry) => sumValue + Number(entry.amount), 0);
}

function groupByCategory(entries) {
  return entries.reduce((result, entry) => {
    result[entry.category] = (result[entry.category] || 0) + Number(entry.amount);
    return result;
  }, {});
}

function sum(entries, key) {
  return entries.reduce((total, entry) => total + Number(entry[key] || 0), 0);
}

function categoryBudgetTotal(month = els.cashflowMonth.value || formatMonthInput()) {
  return state.categories
    .filter((category) => category.type === "expense")
    .reduce((total, category) => total + getCategoryBudget(category, month), 0);
}

function categoryColor(name, index) {
  return state.categories.find((category) => category.name === name)?.color || CHART_COLORS[index % CHART_COLORS.length];
}

function budgetStatus(percent) {
  if (percent > 100) return "over";
  if (percent >= 80) return "near";
  return "normal";
}

function statusLabel(status) {
  return { normal: "Aman", near: "Mendekati limit", over: "Melebihi anggaran", paid: "Tercapai" }[status] || status;
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(new Date(`${date}T12:00:00`));
}

function priorityClass(priority) {
  return { Tinggi: "high", Sedang: "medium", Rendah: "low" }[priority] || "medium";
}

function optionNode(value, label, selected = false) {
  const option = document.createElement("option");
  option.value = String(value);
  option.textContent = label;
  option.selected = selected;
  return option;
}

function actionButton(text, label, handler) {
  const button = document.createElement("button");
  button.className = "icon-button";
  button.type = "button";
  button.innerHTML = iconMarkup(text);
  button.ariaLabel = label;
  button.title = label;
  button.addEventListener("click", handler);
  return button;
}

function iconMarkup(name) {
  const icon = { delete: "trash", edit: "edit", play: "play", pause: "pause" }[name] || name;
  return `<svg class="ui-icon" aria-hidden="true"><use href="#icon-${icon}"></use></svg>`;
}

els.taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.tasks.push({
    id: crypto.randomUUID(),
    title: els.taskTitle.value.trim(),
    time: els.taskTime.value,
    type: els.taskType.value,
    priority: els.taskPriority.value,
    done: false
  });
  els.taskForm.reset();
  els.taskPriority.value = "Sedang";
  render();
});

els.clearDoneTasks.addEventListener("click", () => {
  state.tasks = state.tasks.filter((task) => !task.done);
  render();
});

els.focusPresetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    focusTimer.preset = button.dataset.focusPreset;
    focusTimer.completedWorkSessions = 0;
    resetFocusSession();
    renderFocusTimer();
  });
});

els.startFocusTimer.addEventListener("click", startFocusTimer);
els.pauseFocusTimer.addEventListener("click", pauseFocusTimer);
els.resetFocusTimer.addEventListener("click", () => {
  resetFocusSession();
  renderFocusTimer();
});
els.focusModePause.addEventListener("click", () => {
  if (focusTimer.running) pauseFocusTimer();
  else startFocusTimer();
});
els.focusModeReset.addEventListener("click", () => {
  resetFocusSession();
  renderFocusTimer();
});
els.closeFocusMode.addEventListener("click", closeFocusMode);
els.dismissFocusAlarm.addEventListener("click", dismissFocusAlarm);
els.startBreakButton.addEventListener("click", startNextFocusPhase);
els.settingsAlarmSound.addEventListener("change", () => {
  state.preferences.alarmSound = els.settingsAlarmSound.checked;
  if (state.preferences.alarmSound) primeFocusAudio();
  saveState();
});
els.settingsAlarmVolume.addEventListener("input", () => {
  state.preferences.alarmVolume = Number(els.settingsAlarmVolume.value);
  saveState();
});
els.settingsCurrency.addEventListener("change", () => {
  state.preferences.currency = els.settingsCurrency.value;
  render();
});
els.themeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.preferences.theme = button.dataset.themeOption;
    applyTheme(state.preferences.theme);
    saveState();
  });
});
els.logoutButton.addEventListener("click", async () => {
  stopFocusInterval();
  stopRepeatingFocusAlarm();
  if (serverAuthAvailable) {
    try {
      window.clearTimeout(cloudSaveTimer);
      if (remoteSession && cloudReady && localStorage.getItem(PENDING_SYNC_KEY)) {
        await syncCloudState();
      }
      await apiRequest("/api/logout", { method: "POST", body: "{}" });
    } catch (error) {
      console.error(error);
    }
  }
  remoteSession = false;
  cloudReady = false;
  sessionStorage.removeItem(SESSION_KEY);
  configureAccessGate();
});
els.accessForm.addEventListener("submit", handleAccessSubmit);

els.habitForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.habits.push({ id: crypto.randomUUID(), name: els.habitName.value.trim(), doneToday: false, streak: 0 });
  els.habitForm.reset();
  render();
});

els.cashflowForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const selectedOption = els.cashflowCategory.selectedOptions[0];
  const transaction = {
    id: els.editingTransactionId.value || crypto.randomUUID(),
    type: els.cashflowType.value,
    category: els.cashflowCategory.value,
    amount: Number(els.cashflowAmount.value),
    date: new Date(`${els.cashflowDate.value}T12:00:00`).toISOString(),
    title: els.cashflowTitle.value.trim(),
    paymentMethod: els.cashflowPaymentMethod.value,
    linkedEntityId: selectedOption?.dataset.entityId || ""
  };
  const index = state.cashflows.findIndex((entry) => entry.id === transaction.id);
  if (index >= 0) state.cashflows[index] = transaction;
  else state.cashflows.push(transaction);
  closeTransactionDialog();
  render();
});

els.budgetForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const category = state.categories.find((item) => item.name === els.budgetCategory.value && item.type === "expense");
  if (category) {
    category.monthlyBudgets ||= {};
    category.monthlyBudgets[els.budgetPlanMonth.value || formatMonthInput()] = Number(els.budgetAmount.value);
    category.budget = Number(els.budgetAmount.value);
  }
  els.budgetForm.reset();
  render();
});

els.incomePlanForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const editingId = els.incomePlanForm.dataset.editingId;
  const item = {
    id: editingId || crypto.randomUUID(),
    name: els.incomePlanName.value.trim(),
    planned: Number(els.incomePlanAmount.value),
    month: els.budgetPlanMonth.value || formatMonthInput()
  };
  upsertEntity("incomePlans", item);
  if (!state.categories.some((category) => category.type === "income" && category.name === item.name)) {
    state.categories.push({ id: crypto.randomUUID(), name: item.name, type: "income", budget: 0, color: CHART_COLORS[state.categories.length % CHART_COLORS.length] });
  }
  delete els.incomePlanForm.dataset.editingId;
  els.incomePlanForm.reset();
  render();
});

els.budgetBillForm.addEventListener("submit", (event) => {
  event.preventDefault();
  upsertEntity("bills", {
    id: editingBillId || crypto.randomUUID(),
    name: els.budgetBillName.value.trim(),
    dueDate: els.budgetBillDueDate.value,
    planned: Number(els.budgetBillAmount.value),
    month: els.budgetPlanMonth.value || formatMonthInput()
  });
  editingBillId = "";
  els.budgetBillForm.reset();
  render();
});

els.budgetSavingForm.addEventListener("submit", (event) => {
  event.preventDefault();
  upsertEntity("savings", {
    id: editingSavingId || crypto.randomUUID(),
    name: els.budgetSavingName.value.trim(),
    target: Number(els.budgetSavingAmount.value),
    month: els.budgetPlanMonth.value || formatMonthInput()
  });
  editingSavingId = "";
  els.budgetSavingForm.reset();
  render();
});

els.budgetDebtForm.addEventListener("submit", (event) => {
  event.preventDefault();
  upsertEntity("debts", {
    id: editingDebtId || crypto.randomUUID(),
    name: els.budgetDebtName.value.trim(),
    dueDate: els.budgetDebtDueDate.value,
    planned: Number(els.budgetDebtAmount.value),
    month: els.budgetPlanMonth.value || formatMonthInput()
  });
  editingDebtId = "";
  els.budgetDebtForm.reset();
  render();
});

els.billForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const item = { id: editingBillId || crypto.randomUUID(), name: els.billName.value.trim(), dueDate: els.billDueDate.value, planned: Number(els.billPlanned.value), month: els.cashflowMonth.value || formatMonthInput() };
  upsertEntity("bills", item);
  editingBillId = "";
  els.billForm.reset();
  render();
});

els.savingForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const item = { id: editingSavingId || crypto.randomUUID(), name: els.savingName.value.trim(), target: Number(els.savingTarget.value), month: els.cashflowMonth.value || formatMonthInput() };
  upsertEntity("savings", item);
  editingSavingId = "";
  els.savingForm.reset();
  render();
});

els.debtForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const item = { id: editingDebtId || crypto.randomUUID(), name: els.debtName.value.trim(), dueDate: els.debtDueDate.value, planned: Number(els.debtPlanned.value), month: els.cashflowMonth.value || formatMonthInput() };
  upsertEntity("debts", item);
  editingDebtId = "";
  els.debtForm.reset();
  render();
});

els.categoryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const item = {
    id: editingCategoryId || crypto.randomUUID(),
    name: els.categoryName.value.trim(),
    type: els.categoryType.value,
    budget: Number(els.categoryBudget.value) || 0,
    color: els.categoryColor.value
  };
  upsertEntity("categories", item);
  editingCategoryId = "";
  els.categoryForm.reset();
  els.categoryColor.value = "#2f6f5e";
  render();
});

function upsertEntity(key, item) {
  const index = state[key].findIndex((entry) => entry.id === item.id);
  if (index >= 0) state[key][index] = item;
  else state[key].push(item);
}

els.cashflowMonth.addEventListener("change", render);
els.budgetPlanMonth.addEventListener("change", render);
els.cashflowPeriodButton.addEventListener("click", toggleCashflowPeriodMenu);
els.cashflowYear.addEventListener("change", () => {
  const month = (els.cashflowMonth.value || formatMonthInput()).slice(5, 7);
  els.cashflowMonth.value = `${els.cashflowYear.value}-${month}`;
  render();
});
document.addEventListener("click", (event) => {
  if (!els.cashflowPeriodMenu.hidden && !event.target.closest(".cashflow-period-picker")) {
    closeCashflowPeriodMenu();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeCashflowPeriodMenu();
});
els.reportPeriod.addEventListener("change", () => {
  const custom = els.reportPeriod.value === "custom";
  els.reportStartDate.hidden = !custom;
  els.reportEndDate.hidden = !custom;
  renderReports();
});
els.reportStartDate.addEventListener("change", renderReports);
els.reportEndDate.addEventListener("change", renderReports);
els.transactionSearch.addEventListener("input", renderTransactions);
els.transactionTypeFilter.addEventListener("change", renderTransactions);
els.transactionCategoryFilter.addEventListener("change", renderTransactions);
els.cashflowType.addEventListener("change", updateTransactionCategories);
els.openTransactionButtons.forEach((button) => button.addEventListener("click", () => openTransactionDialog()));
els.closeTransactionDialog.addEventListener("click", closeTransactionDialog);
els.transactionDialog.addEventListener("click", (event) => {
  if (event.target === els.transactionDialog) closeTransactionDialog();
});
els.workspaceNavButtons.forEach((button) => button.addEventListener("click", () => navigateWorkspace(button.dataset.workspaceTarget)));
els.homeActionButtons.forEach((button) => button.addEventListener("click", () => navigateWorkspace(button.dataset.homeAction)));
els.tabButtons.forEach((button) => button.addEventListener("click", () => setActiveTab(button.dataset.tab)));
els.cashflowTabButtons.forEach((button) => button.addEventListener("click", () => setActiveCashflowTab(button.dataset.cashflowTab)));

async function initializeApp() {
  const localDevelopmentHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  const allowLocalAccess = localDevelopmentHosts.has(window.location.hostname);
  restoreFocusTimer();
  setActiveTab("home");
  setActiveCashflowTab(localStorage.getItem(`${STORAGE_KEY}.activeCashflowTab`) || "overview");
  applyTheme(state.preferences.theme);
  render();

  try {
    const response = await fetch("/api/session", {
      credentials: "same-origin",
      cache: "no-store"
    });
    if (response.status !== 404) {
      serverAuthAvailable = true;
      const session = await response.json();
      remoteSession = session.authenticated === true;
      if (remoteSession) {
        if (session.username) localStorage.setItem(ACCESS_KEY, JSON.stringify({ username: session.username }));
        unlockWorkspace();
        hydrateCloudState().catch((error) => {
          console.error(error);
          cloudReady = false;
          cloudSyncStatus = "Cloud sedang lambat. Data lokal tetap bisa dibuka.";
          renderSettings();
        });
      } else {
        configureAccessGate();
      }
    } else if (allowLocalAccess) {
      configureAccessGate();
    } else {
      serverAuthAvailable = true;
      configureAccessGate();
      els.accessError.textContent = "Layanan login belum terhubung. Periksa konfigurasi deployment.";
    }
  } catch {
    if (!allowLocalAccess) serverAuthAvailable = true;
    configureAccessGate();
    if (!allowLocalAccess) {
      els.accessError.textContent = "Layanan login tidak dapat dijangkau. Coba lagi sebentar.";
    }
  }

  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    navigator.serviceWorker.register("/sw.js").catch((error) => console.error(error));
  }
}

initializeApp();
window.setInterval(updateHeaderClock, 1000);
document.addEventListener("visibilitychange", () => {
  if (focusTimer.running) tickFocusTimer();
});
window.addEventListener("focus", () => {
  if (focusTimer.running) tickFocusTimer();
});
window.addEventListener("online", () => {
  if (remoteSession && cloudReady) syncCloudState();
});
window.addEventListener("pagehide", () => {
  if (!remoteSession || !cloudReady || !localStorage.getItem(PENDING_SYNC_KEY)) return;
  fetch("/api/state", {
    method: "PUT",
    credentials: "same-origin",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state })
  }).catch(() => {});
});

window.matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
  if (state.preferences.theme === "system") applyTheme("system");
});

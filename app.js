"use strict";

const STORAGE_KEYS = {
  products: "sales-accounting.products",
  currentSales: "sales-accounting.current-sales",
  shifts: "sales-accounting.shifts",
};

const PAYMENT_METHODS = {
  eqv: "экв",
  cash: "нал",
  transfer: "пер",
};
const DEFAULT_PAYMENT_METHOD = "cash";
const PAYMENT_ORDER = ["eqv", "cash", "transfer"];

const state = {
  products: loadFromStorage(STORAGE_KEYS.products, []),
  currentSales: loadFromStorage(STORAGE_KEYS.currentSales, []),
  shifts: loadFromStorage(STORAGE_KEYS.shifts, []),
  saleDraft: [],
  activeReport: "day",
};

const elements = {
  currentDate: document.querySelector("#currentDate"),
  currentShiftTotal: document.querySelector("#currentShiftTotal"),
  currentShiftMeta: document.querySelector("#currentShiftMeta"),
  dayTotal: document.querySelector("#dayTotal"),
  dayMeta: document.querySelector("#dayMeta"),
  weekTotal: document.querySelector("#weekTotal"),
  weekMeta: document.querySelector("#weekMeta"),
  monthTotal: document.querySelector("#monthTotal"),
  monthMeta: document.querySelector("#monthMeta"),
  saleForm: document.querySelector("#saleForm"),
  productInput: document.querySelector("#productInput"),
  priceInput: document.querySelector("#priceInput"),
  quantityInput: document.querySelector("#quantityInput"),
  paymentInputs: document.querySelectorAll('input[name="paymentMethod"]'),
  saleCartBody: document.querySelector("#saleCartBody"),
  saleCartTotal: document.querySelector("#saleCartTotal"),
  emptySaleCart: document.querySelector("#emptySaleCart"),
  commitSaleButton: document.querySelector("#commitSaleButton"),
  clearSaleButton: document.querySelector("#clearSaleButton"),
  productsDatalist: document.querySelector("#productsDatalist"),
  productsCounter: document.querySelector("#productsCounter"),
  productsList: document.querySelector("#productsList"),
  formMessage: document.querySelector("#formMessage"),
  shiftSubtitle: document.querySelector("#shiftSubtitle"),
  closeShiftButton: document.querySelector("#closeShiftButton"),
  currentSalesBody: document.querySelector("#currentSalesBody"),
  emptyShift: document.querySelector("#emptyShift"),
  tabs: document.querySelectorAll("[data-report]"),
  reportRangeLabel: document.querySelector("#reportRangeLabel"),
  reportTotal: document.querySelector("#reportTotal"),
  reportShiftCount: document.querySelector("#reportShiftCount"),
  reportLineCount: document.querySelector("#reportLineCount"),
  reportQuantity: document.querySelector("#reportQuantity"),
  reportEqvTotal: document.querySelector("#reportEqvTotal"),
  reportCashTotal: document.querySelector("#reportCashTotal"),
  reportTransferTotal: document.querySelector("#reportTransferTotal"),
  closedShiftsBody: document.querySelector("#closedShiftsBody"),
  productReportBody: document.querySelector("#productReportBody"),
};

const moneyFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("ru-RU", {
  hour: "2-digit",
  minute: "2-digit",
});

elements.saleForm.addEventListener("submit", addDraftItem);
elements.productInput.addEventListener("change", fillPriceFromProduct);
elements.productInput.addEventListener("blur", fillPriceFromProduct);
elements.paymentInputs.forEach((input) => {
  input.addEventListener("change", () => selectPaymentMethod(input));
});
elements.saleCartBody.addEventListener("click", handleSaleDraftClick);
elements.commitSaleButton.addEventListener("click", commitSaleDraft);
elements.clearSaleButton.addEventListener("click", clearSaleDraft);
elements.productsList.addEventListener("click", handleProductClick);
elements.currentSalesBody.addEventListener("click", handleCurrentSaleClick);
elements.closeShiftButton.addEventListener("click", closeShift);
elements.tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    state.activeReport = tab.dataset.report;
    render();
  });
});

render();

function loadFromStorage(key, fallback) {
  try {
    const rawValue = localStorage.getItem(key);
    return rawValue ? JSON.parse(rawValue) : fallback;
  } catch (error) {
    console.warn(`Не удалось прочитать ${key}`, error);
    return fallback;
  }
}

function saveToStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function render() {
  elements.currentDate.textContent = dateFormatter.format(new Date());
  renderMetrics();
  renderProducts();
  renderSaleDraft();
  renderCurrentSales();
  renderReport();
}

function renderMetrics() {
  const currentSummary = summarizeSales(state.currentSales);
  const daySummary = summarizeShifts(getShiftsForPeriod("day"));
  const weekSummary = summarizeShifts(getShiftsForPeriod("week"));
  const monthSummary = summarizeShifts(getShiftsForPeriod("month"));

  elements.currentShiftTotal.textContent = formatMoney(currentSummary.total);
  elements.currentShiftMeta.textContent = formatMeta(
    currentSummary.lineCount,
    currentSummary.quantity,
  );

  elements.dayTotal.textContent = formatMoney(daySummary.total);
  elements.dayMeta.textContent = formatShiftMeta(daySummary.shiftCount);

  elements.weekTotal.textContent = formatMoney(weekSummary.total);
  elements.weekMeta.textContent = formatShiftMeta(weekSummary.shiftCount);

  elements.monthTotal.textContent = formatMoney(monthSummary.total);
  elements.monthMeta.textContent = formatShiftMeta(monthSummary.shiftCount);
}

function renderProducts() {
  elements.productsCounter.textContent = String(state.products.length);
  elements.productsDatalist.innerHTML = "";
  elements.productsList.innerHTML = "";

  if (state.products.length === 0) {
    elements.productsList.innerHTML = `<div class="empty-state is-visible">Список товаров пуст</div>`;
    return;
  }

  state.products.forEach((product) => {
    const option = document.createElement("option");
    option.value = product.name;
    option.label = formatMoney(product.price);
    elements.productsDatalist.append(option);

    const row = document.createElement("div");
    row.className = "product-row";
    row.innerHTML = `
      <button class="product-pick" type="button" data-product="${escapeAttribute(product.name)}">
        <span class="product-name">${escapeHtml(product.name)}</span>
        <span class="product-price">${formatMoney(product.price)}</span>
      </button>
      <button class="product-delete" type="button" data-delete-product="${escapeAttribute(product.name)}" aria-label="Удалить товар">×</button>
    `;
    elements.productsList.append(row);
  });
}

function renderSaleDraft() {
  const summary = summarizeSales(state.saleDraft);
  elements.saleCartBody.innerHTML = "";
  elements.saleCartTotal.textContent = formatMoney(summary.total);
  elements.emptySaleCart.classList.toggle("is-visible", state.saleDraft.length === 0);
  elements.commitSaleButton.disabled = state.saleDraft.length === 0;
  elements.clearSaleButton.disabled = state.saleDraft.length === 0;

  state.saleDraft.forEach((item) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(item.productName)}</td>
      <td class="number">${formatMoney(item.price)}</td>
      <td class="number">${formatNumber(item.quantity)}</td>
      <td class="number">${formatMoney(item.total)}</td>
      <td class="number">
        <button class="icon-button" type="button" data-delete-draft-item="${escapeAttribute(item.id)}" aria-label="Удалить позицию">×</button>
      </td>
    `;
    elements.saleCartBody.append(row);
  });
}

function renderCurrentSales() {
  const summary = summarizeSales(state.currentSales);
  elements.currentSalesBody.innerHTML = "";
  elements.closeShiftButton.disabled = state.currentSales.length === 0;
  elements.emptyShift.classList.toggle("is-visible", state.currentSales.length === 0);

  if (state.currentSales.length === 0) {
    elements.shiftSubtitle.textContent = "Продажи еще не добавлены";
    return;
  }

  const firstSale = state.currentSales[0];
  elements.shiftSubtitle.textContent = `${formatMeta(summary.lineCount, summary.quantity)}, ${formatMoney(summary.total)}, начало ${timeFormatter.format(new Date(firstSale.createdAt))}`;

  state.currentSales.forEach((sale) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${formatSaleNumber(sale.saleNumber)}</td>
      <td>${timeFormatter.format(new Date(sale.createdAt))}</td>
      <td>${escapeHtml(sale.productName)}</td>
      <td class="number">${formatMoney(sale.price)}</td>
      <td class="number">${formatNumber(sale.quantity)}</td>
      <td>${getPaymentLabel(sale.paymentMethod)}</td>
      <td class="number">${formatMoney(sale.total)}</td>
      <td class="number">
        <button class="icon-button" type="button" data-delete-sale="${escapeAttribute(sale.id)}" aria-label="Удалить продажу">×</button>
      </td>
    `;
    elements.currentSalesBody.append(row);
  });
}

function renderReport() {
  const range = getRange(state.activeReport);
  const shifts = getShiftsForPeriod(state.activeReport);
  const summary = summarizeShifts(shifts);

  elements.reportRangeLabel.textContent = range.label;
  elements.reportTotal.textContent = formatMoney(summary.total);
  elements.reportShiftCount.textContent = String(summary.shiftCount);
  elements.reportLineCount.textContent = String(summary.lineCount);
  elements.reportQuantity.textContent = formatNumber(summary.quantity);
  elements.reportEqvTotal.textContent = formatMoney(summary.paymentTotals.eqv);
  elements.reportCashTotal.textContent = formatMoney(summary.paymentTotals.cash);
  elements.reportTransferTotal.textContent = formatMoney(summary.paymentTotals.transfer);

  elements.tabs.forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.report === state.activeReport);
  });

  renderClosedShifts(shifts);
  renderProductReport(summary.products);
}

function renderClosedShifts(shifts) {
  elements.closedShiftsBody.innerHTML = "";

  if (shifts.length === 0) {
    elements.closedShiftsBody.innerHTML = `<tr class="muted-row"><td colspan="7">Закрытых смен нет</td></tr>`;
    return;
  }

  shifts.forEach((shift) => {
    const shiftSummary = summarizeSales(shift.sales || []);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${dateTimeFormatter.format(new Date(shift.closedAt))}</td>
      <td class="number">${formatMoney(shift.total)}</td>
      <td class="number">${shift.lineCount}</td>
      <td class="number">${formatNumber(shift.quantity)}</td>
      <td class="number">${formatMoney(shiftSummary.paymentTotals.eqv)}</td>
      <td class="number">${formatMoney(shiftSummary.paymentTotals.cash)}</td>
      <td class="number">${formatMoney(shiftSummary.paymentTotals.transfer)}</td>
    `;
    elements.closedShiftsBody.append(row);
  });
}

function renderProductReport(products) {
  elements.productReportBody.innerHTML = "";

  if (products.length === 0) {
    elements.productReportBody.innerHTML = `<tr class="muted-row"><td colspan="3">Продаж нет</td></tr>`;
    return;
  }

  products.forEach((product) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(product.name)}</td>
      <td class="number">${formatNumber(product.quantity)}</td>
      <td class="number">${formatMoney(product.total)}</td>
    `;
    elements.productReportBody.append(row);
  });
}

function addDraftItem(event) {
  event.preventDefault();

  try {
    const productName = normalizeName(elements.productInput.value);
    const price = parsePositiveNumber(elements.priceInput.value, "Укажите цену");
    const quantity = parsePositiveNumber(elements.quantityInput.value, "Укажите количество");

    if (!productName) {
      throw new Error("Укажите товар");
    }

    const item = {
      id: createId(),
      productName,
      price,
      quantity,
      total: roundMoney(price * quantity),
      createdAt: new Date().toISOString(),
    };

    state.saleDraft.push(item);
    upsertProduct(productName, price);

    clearProductInputs();
    elements.productInput.focus();
    showMessage(`Позиция добавлена: ${productName}, ${formatMoney(item.total)}`);
    render();
  } catch (error) {
    showMessage(error.message, true);
  }
}

function commitSaleDraft() {
  if (state.saleDraft.length === 0) {
    showMessage("Добавьте хотя бы один товар", true);
    return;
  }

  const paymentMethod = getSelectedPaymentMethod();
  const saleGroupId = createId();
  const saleNumber = getNextSaleNumber();
  const createdAt = new Date().toISOString();
  const committedItems = state.saleDraft.map((item) => ({
    ...item,
    id: createId(),
    saleGroupId,
    saleNumber,
    paymentMethod,
    createdAt,
  }));
  const summary = summarizeSales(committedItems);

  state.currentSales.push(...committedItems);
  state.saleDraft = [];
  saveToStorage(STORAGE_KEYS.currentSales, state.currentSales);
  resetPaymentMethod();
  elements.productInput.focus();
  showMessage(`Продажа №${saleNumber} добавлена: ${formatMeta(summary.lineCount, summary.quantity)}, ${formatMoney(summary.total)}, ${getPaymentLabel(paymentMethod)}`);
  render();
}

function clearSaleDraft() {
  state.saleDraft = [];
  showMessage("Позиции продажи очищены");
  render();
}

function closeShift() {
  if (state.currentSales.length === 0) {
    showMessage("В смене нет продаж", true);
    return;
  }

  const summary = summarizeSales(state.currentSales);
  const now = new Date();
  const shift = {
    id: createId(),
    openedAt: state.currentSales[0].createdAt,
    closedAt: now.toISOString(),
    dateKey: getDateKey(now),
    total: summary.total,
    quantity: summary.quantity,
    lineCount: summary.lineCount,
    paymentTotals: { ...summary.paymentTotals },
    sales: state.currentSales.map((sale) => ({ ...sale })),
  };

  state.shifts.unshift(shift);
  state.currentSales = [];
  saveToStorage(STORAGE_KEYS.shifts, state.shifts);
  saveToStorage(STORAGE_KEYS.currentSales, state.currentSales);
  state.activeReport = "day";
  showMessage(`Смена закрыта: ${formatMoney(shift.total)}`);
  render();
}

function handleProductClick(event) {
  const pickButton = event.target.closest("[data-product]");
  const deleteButton = event.target.closest("[data-delete-product]");

  if (pickButton) {
    const product = findProduct(pickButton.dataset.product);
    if (!product) {
      return;
    }

    elements.productInput.value = product.name;
    elements.priceInput.value = String(product.price);
    elements.quantityInput.focus();
    return;
  }

  if (deleteButton) {
    const productName = deleteButton.dataset.deleteProduct;
    const shouldDelete = confirm(`Удалить товар "${productName}" из списка? Продажи не изменятся.`);

    if (!shouldDelete) {
      return;
    }

    state.products = state.products.filter((product) => {
      return product.name.toLocaleLowerCase("ru-RU") !== productName.toLocaleLowerCase("ru-RU");
    });
    saveToStorage(STORAGE_KEYS.products, state.products);
    render();
  }
}

function handleCurrentSaleClick(event) {
  const deleteButton = event.target.closest("[data-delete-sale]");

  if (!deleteButton) {
    return;
  }

  state.currentSales = state.currentSales.filter((sale) => sale.id !== deleteButton.dataset.deleteSale);
  saveToStorage(STORAGE_KEYS.currentSales, state.currentSales);
  render();
}

function handleSaleDraftClick(event) {
  const deleteButton = event.target.closest("[data-delete-draft-item]");

  if (!deleteButton) {
    return;
  }

  state.saleDraft = state.saleDraft.filter((item) => item.id !== deleteButton.dataset.deleteDraftItem);
  render();
}

function fillPriceFromProduct() {
  const product = findProduct(elements.productInput.value);

  if (product) {
    elements.priceInput.value = String(product.price);
  }
}

function upsertProduct(name, price) {
  const product = findProduct(name);

  if (product) {
    product.price = price;
    product.updatedAt = new Date().toISOString();
  } else {
    state.products.push({
      id: createId(),
      name,
      price,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  state.products.sort((firstProduct, secondProduct) => {
    return firstProduct.name.localeCompare(secondProduct.name, "ru-RU");
  });
  saveToStorage(STORAGE_KEYS.products, state.products);
}

function clearProductInputs() {
  elements.productInput.value = "";
  elements.priceInput.value = "";
  elements.quantityInput.value = "1";
}

function findProduct(name) {
  const normalizedName = normalizeName(name).toLocaleLowerCase("ru-RU");
  return state.products.find((product) => {
    return product.name.toLocaleLowerCase("ru-RU") === normalizedName;
  });
}

function getNextSaleNumber() {
  return state.currentSales.reduce((maxNumber, sale) => {
    return Math.max(maxNumber, Number(sale.saleNumber) || 0);
  }, 0) + 1;
}

function getShiftsForPeriod(period) {
  if (period === "all") {
    return [...state.shifts];
  }

  const range = getRange(period);
  return state.shifts.filter((shift) => {
    const closedAt = new Date(shift.closedAt);
    return closedAt >= range.start && closedAt <= range.end;
  });
}

function getRange(period) {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (period === "week") {
    const dayNumber = start.getDay() === 0 ? 7 : start.getDay();
    start.setDate(start.getDate() - dayNumber + 1);
  }

  if (period === "month") {
    start.setDate(1);
  }

  if (period === "all") {
    const firstShift = state.shifts[state.shifts.length - 1];
    return {
      start: firstShift ? new Date(firstShift.closedAt) : start,
      end: now,
      label: "Все закрытые смены",
    };
  }

  const labels = {
    day: "Сегодня",
    week: `Неделя с ${dateFormatter.format(start)}`,
    month: dateFormatter.format(start).replace(/^01 /, ""),
  };

  return {
    start,
    end: now,
    label: labels[period],
  };
}

function summarizeSales(sales) {
  return sales.reduce(
    (summary, sale) => {
      const paymentMethod = getPaymentMethod(sale.paymentMethod);
      summary.total = roundMoney(summary.total + sale.total);
      summary.quantity += sale.quantity;
      summary.lineCount += 1;
      summary.paymentTotals[paymentMethod] = roundMoney(
        summary.paymentTotals[paymentMethod] + sale.total,
      );
      return summary;
    },
    { total: 0, quantity: 0, lineCount: 0, paymentTotals: createPaymentTotals() },
  );
}

function summarizeShifts(shifts) {
  const productMap = new Map();
  const summary = shifts.reduce(
    (result, shift) => {
      result.total = roundMoney(result.total + shift.total);
      result.quantity += shift.quantity;
      result.lineCount += shift.lineCount;
      result.shiftCount += 1;

      const shiftSummary = summarizeSales(shift.sales || []);
      PAYMENT_ORDER.forEach((paymentMethod) => {
        result.paymentTotals[paymentMethod] = roundMoney(
          result.paymentTotals[paymentMethod] + shiftSummary.paymentTotals[paymentMethod],
        );
      });

      (shift.sales || []).forEach((sale) => {
        const key = sale.productName.toLocaleLowerCase("ru-RU");
        const item = productMap.get(key) || {
          name: sale.productName,
          quantity: 0,
          total: 0,
        };
        item.quantity += sale.quantity;
        item.total = roundMoney(item.total + sale.total);
        productMap.set(key, item);
      });

      return result;
    },
    {
      total: 0,
      quantity: 0,
      lineCount: 0,
      shiftCount: 0,
      paymentTotals: createPaymentTotals(),
      products: [],
    },
  );

  summary.products = [...productMap.values()].sort((firstProduct, secondProduct) => {
    return secondProduct.total - firstProduct.total;
  });
  return summary;
}

function createPaymentTotals() {
  return PAYMENT_ORDER.reduce((totals, paymentMethod) => {
    totals[paymentMethod] = 0;
    return totals;
  }, {});
}

function selectPaymentMethod(selectedInput) {
  if (!selectedInput.checked) {
    selectedInput.checked = true;
    return;
  }

  elements.paymentInputs.forEach((input) => {
    if (input !== selectedInput) {
      input.checked = false;
    }
  });
}

function resetPaymentMethod() {
  elements.paymentInputs.forEach((input) => {
    input.checked = input.value === DEFAULT_PAYMENT_METHOD;
  });
}

function getSelectedPaymentMethod() {
  const selectedInput = [...elements.paymentInputs].find((input) => input.checked);
  return getPaymentMethod(selectedInput?.value);
}

function getPaymentMethod(paymentMethod) {
  return Object.hasOwn(PAYMENT_METHODS, paymentMethod)
    ? paymentMethod
    : DEFAULT_PAYMENT_METHOD;
}

function getPaymentLabel(paymentMethod) {
  return PAYMENT_METHODS[getPaymentMethod(paymentMethod)];
}

function parsePositiveNumber(value, message) {
  const number = Number(String(value).replace(",", "."));

  if (!Number.isFinite(number) || number <= 0) {
    throw new Error(message);
  }

  return number;
}

function normalizeName(value) {
  return value.trim().replace(/\s+/g, " ");
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function formatMoney(value) {
  return moneyFormatter.format(value);
}

function formatNumber(value) {
  return numberFormatter.format(value);
}

function formatMeta(lineCount, quantity) {
  return `${lineCount} поз., ${formatNumber(quantity)} шт.`;
}

function formatShiftMeta(shiftCount) {
  return `${shiftCount} смен`;
}

function formatSaleNumber(saleNumber) {
  return saleNumber ? `№${saleNumber}` : "—";
}

function showMessage(message, isError = false) {
  elements.formMessage.textContent = message;
  elements.formMessage.classList.toggle("is-error", isError);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

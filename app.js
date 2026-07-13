"use strict";

const STORAGE_KEYS = {
  products: "sales-accounting.products",
  currentSales: "sales-accounting.current-sales",
  shifts: "sales-accounting.shifts",
  settings: "sales-accounting.settings",
};

const DEFAULT_SETTINGS = {
  theme: "light",
  companyName: "",
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
  settings: normalizeSettings(loadFromStorage(STORAGE_KEYS.settings, DEFAULT_SETTINGS)),
  saleDraft: [],
  activeReport: "day",
};

const elements = {
  currentDate: document.querySelector("#currentDate"),
  companyDisplay: document.querySelector("#companyDisplay"),
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
  categoriesDatalist: document.querySelector("#categoriesDatalist"),
  productsCounter: document.querySelector("#productsCounter"),
  productsList: document.querySelector("#productsList"),
  productBaseForm: document.querySelector("#productBaseForm"),
  productBaseCategoryInput: document.querySelector("#productBaseCategoryInput"),
  productBaseNameInput: document.querySelector("#productBaseNameInput"),
  productBasePriceInput: document.querySelector("#productBasePriceInput"),
  productBaseList: document.querySelector("#productBaseList"),
  formMessage: document.querySelector("#formMessage"),
  shiftSubtitle: document.querySelector("#shiftSubtitle"),
  closeShiftButton: document.querySelector("#closeShiftButton"),
  receiptSaleSelect: document.querySelector("#receiptSaleSelect"),
  printReceiptButton: document.querySelector("#printReceiptButton"),
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
  themeInputs: document.querySelectorAll('input[name="theme"]'),
  companyNameInput: document.querySelector("#companyNameInput"),
  settingsMessage: document.querySelector("#settingsMessage"),
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
elements.productBaseForm.addEventListener("submit", addProductFromBase);
elements.productsList.addEventListener("click", handleProductClick);
elements.productBaseList.addEventListener("click", handleProductClick);
elements.currentSalesBody.addEventListener("click", handleCurrentSaleClick);
elements.closeShiftButton.addEventListener("click", closeShift);
elements.printReceiptButton.addEventListener("click", printSelectedReceipt);
elements.themeInputs.forEach((input) => {
  input.addEventListener("change", () => updateTheme(input.value));
});
elements.companyNameInput.addEventListener("input", updateCompanyName);
elements.tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    state.activeReport = tab.dataset.report;
    render();
  });
});

applySettings();
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
  elements.categoriesDatalist.innerHTML = "";
  elements.productsList.innerHTML = "";
  elements.productBaseList.innerHTML = "";

  if (state.products.length === 0) {
    elements.productsList.innerHTML = `<div class="empty-state is-visible">Список товаров пуст</div>`;
    elements.productBaseList.innerHTML = `<div class="empty-state is-visible">База товаров пустая</div>`;
    return;
  }

  const categories = getProductCategories();
  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    elements.categoriesDatalist.append(option);
  });

  getProductsByCategory().forEach((group) => {
    const section = document.createElement("details");
    section.className = "product-category";
    section.open = false;
    section.innerHTML = `
      <summary class="accordion-summary">
        <span class="accordion-arrow" aria-hidden="true"></span>
        <span>${escapeHtml(group.category)}</span>
        <small>${group.products.length}</small>
      </summary>
      <div class="product-category-list"></div>
    `;
    const categoryList = section.querySelector(".product-category-list");

    group.products.forEach((product) => {
      const row = createProductRow(product);
      categoryList.append(row);
    });

    elements.productsList.append(section);
  });

  state.products.forEach((product) => {
    const option = document.createElement("option");
    option.value = product.name;
    option.label = formatMoney(product.price);
    elements.productsDatalist.append(option);
  });

  renderProductBaseList();
}

function renderProductBaseList() {
  const groups = getProductsByCategory();

  elements.productBaseList.innerHTML = groups.map((group) => {
    const rows = group.products.map((product) => {
      return `
        <div class="product-base-row">
          <div>
            <strong>${escapeHtml(product.name)}</strong>
            <span>${formatMoney(product.price)}</span>
          </div>
          <button class="product-delete" type="button" data-delete-product="${escapeAttribute(product.name)}" aria-label="Удалить товар">×</button>
        </div>
      `;
    }).join("");

    return `
      <section class="product-base-category">
        <h3>${escapeHtml(group.category)}</h3>
        <div class="product-base-category-list">${rows}</div>
      </section>
    `;
  }).join("");
}

function createProductRow(product) {
  const row = document.createElement("div");
  row.className = "product-row";
  row.innerHTML = `
    <button class="product-pick" type="button" data-product="${escapeAttribute(product.name)}">
      <span class="product-name">${escapeHtml(product.name)}</span>
      <span class="product-price">${formatMoney(product.price)}</span>
    </button>
    <button class="product-delete" type="button" data-delete-product="${escapeAttribute(product.name)}" aria-label="Удалить товар">×</button>
  `;
  return row;
}

function getProductsByCategory() {
  const groups = new Map();

  [...state.products]
    .sort((firstProduct, secondProduct) => {
      const firstCategory = getProductCategory(firstProduct);
      const secondCategory = getProductCategory(secondProduct);
      return firstCategory.localeCompare(secondCategory, "ru-RU")
        || firstProduct.name.localeCompare(secondProduct.name, "ru-RU");
    })
    .forEach((product) => {
      const category = getProductCategory(product);
      const group = groups.get(category) || { category, products: [] };
      group.products.push(product);
      groups.set(category, group);
    });

  return [...groups.values()];
}

function getProductCategories() {
  return [...new Set(state.products.map(getProductCategory))]
    .sort((firstCategory, secondCategory) => firstCategory.localeCompare(secondCategory, "ru-RU"));
}

function getProductCategory(product) {
  return normalizeName(product.category || "") || "Без категории";
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
  renderReceiptSelector();

  if (state.currentSales.length === 0) {
    elements.shiftSubtitle.textContent = "Продажи еще не добавлены";
    return;
  }

  const firstSale = state.currentSales[0];
  elements.shiftSubtitle.textContent = `${formatMeta(summary.lineCount, summary.quantity)}, ${formatMoney(summary.total)}, начало ${timeFormatter.format(new Date(firstSale.createdAt))}`;

  getCurrentSaleGroups().forEach((group) => {
    const groupSummary = summarizeSales(group.sales);
    const details = document.createElement("details");
    details.className = "sale-group";
    details.innerHTML = `
      <summary class="sale-group-summary">
        <span class="accordion-arrow" aria-hidden="true"></span>
        <span class="sale-group-title">${formatSaleNumber(group.saleNumber)}</span>
        <span class="sale-group-meta sale-group-time">${timeFormatter.format(new Date(group.createdAt))}</span>
        <span class="sale-group-meta sale-group-count">${formatMeta(groupSummary.lineCount, groupSummary.quantity)}</span>
        <span class="sale-group-meta sale-group-payment">${getPaymentLabel(group.paymentMethod)}</span>
        <strong>${formatMoney(groupSummary.total)}</strong>
        <button class="icon-button" type="button" data-delete-sale-group="${escapeAttribute(group.id)}" aria-label="Удалить продажу">×</button>
      </summary>
      <div class="sale-group-items"></div>
    `;
    const items = details.querySelector(".sale-group-items");

    group.sales.forEach((sale) => {
      const item = document.createElement("div");
      item.className = "sale-group-item";
      item.innerHTML = `
        <span class="sale-item-product">${escapeHtml(sale.productName)}</span>
        <span>${formatMoney(sale.price)}</span>
        <span>${formatNumber(sale.quantity)} шт.</span>
        <strong>${formatMoney(sale.total)}</strong>
        <button class="icon-button" type="button" data-delete-sale="${escapeAttribute(sale.id)}" aria-label="Удалить товар из продажи">×</button>
      `;
      items.append(item);
    });

    elements.currentSalesBody.append(details);
  });
}

function renderReceiptSelector() {
  const previousValue = elements.receiptSaleSelect.value;
  const groups = getCurrentSaleGroups();
  elements.receiptSaleSelect.innerHTML = "";
  elements.receiptSaleSelect.disabled = groups.length === 0;
  elements.printReceiptButton.disabled = groups.length === 0;

  if (groups.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Нет продаж";
    elements.receiptSaleSelect.append(option);
    return;
  }

  groups.forEach((group) => {
    const summary = summarizeSales(group.sales);
    const option = document.createElement("option");
    option.value = group.id;
    option.textContent = `Продажа ${formatSaleNumber(group.saleNumber)} — ${formatMoney(summary.total)}`;
    elements.receiptSaleSelect.append(option);
  });

  const hasPreviousValue = groups.some((group) => group.id === previousValue);
  elements.receiptSaleSelect.value = hasPreviousValue
    ? previousValue
    : groups[groups.length - 1].id;
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

function addProductFromBase(event) {
  event.preventDefault();

  try {
    const productName = normalizeName(elements.productBaseNameInput.value);
    const price = parsePositiveNumber(elements.productBasePriceInput.value, "Укажите цену товара");
    const category = normalizeName(elements.productBaseCategoryInput.value);

    if (!productName) {
      throw new Error("Укажите название товара");
    }

    upsertProduct(productName, price, category);
    elements.productBaseNameInput.value = "";
    elements.productBasePriceInput.value = "";
    elements.productBaseNameInput.focus();
    showSettingsMessage(`Товар добавлен в базу: ${productName}`);
    render();
  } catch (error) {
    showSettingsMessage(error.message);
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

function printSelectedReceipt() {
  const group = getCurrentSaleGroups().find((item) => {
    return item.id === elements.receiptSaleSelect.value;
  });

  if (!group) {
    showMessage("Выберите продажу для печати", true);
    return;
  }

  const receiptWindow = window.open("", "receipt-print", "width=760,height=900");

  if (!receiptWindow) {
    showMessage("Разрешите всплывающие окна для печати чека", true);
    return;
  }

  receiptWindow.document.open();
  receiptWindow.document.write(buildReceiptHtml(group));
  receiptWindow.document.close();
  receiptWindow.focus();

  setTimeout(() => {
    receiptWindow.print();
  }, 250);
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
  const groupDeleteButton = event.target.closest("[data-delete-sale-group]");
  const deleteButton = event.target.closest("[data-delete-sale]");

  if (groupDeleteButton) {
    event.preventDefault();
    event.stopPropagation();
    state.currentSales = state.currentSales.filter((sale) => {
      return (sale.saleGroupId || sale.id) !== groupDeleteButton.dataset.deleteSaleGroup;
    });
    saveToStorage(STORAGE_KEYS.currentSales, state.currentSales);
    render();
    return;
  }

  if (!deleteButton) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
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

function upsertProduct(name, price, category = null) {
  const product = findProduct(name);
  const normalizedCategory = category === null
    ? null
    : normalizeName(category);

  if (product) {
    product.price = price;
    if (normalizedCategory !== null) {
      product.category = normalizedCategory;
    }
    product.updatedAt = new Date().toISOString();
  } else {
    state.products.push({
      id: createId(),
      name,
      price,
      category: normalizedCategory || "",
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

function getCurrentSaleGroups() {
  const groups = new Map();

  state.currentSales.forEach((sale) => {
    const groupId = sale.saleGroupId || sale.id;
    const group = groups.get(groupId) || {
      id: groupId,
      saleNumber: Number(sale.saleNumber) || groups.size + 1,
      createdAt: sale.createdAt,
      paymentMethod: getPaymentMethod(sale.paymentMethod),
      sales: [],
    };

    group.sales.push(sale);
    groups.set(groupId, group);
  });

  return [...groups.values()].sort((firstGroup, secondGroup) => {
    return firstGroup.saleNumber - secondGroup.saleNumber
      || new Date(firstGroup.createdAt) - new Date(secondGroup.createdAt);
  });
}

function buildReceiptHtml(group) {
  const summary = summarizeSales(group.sales);
  const companyName = state.settings.companyName || "Компания не указана";
  const paymentMethod = getPaymentLabel(group.paymentMethod);
  const createdAt = dateTimeFormatter.format(new Date(group.createdAt));
  const rows = group.sales.map((sale, index) => {
    return `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(sale.productName)}</td>
        <td class="number">${formatNumber(sale.quantity)}</td>
        <td class="number">${formatMoney(sale.price)}</td>
        <td class="number">${formatMoney(sale.total)}</td>
      </tr>
    `;
  }).join("");

  return `
    <!doctype html>
    <html lang="ru">
      <head>
        <meta charset="UTF-8" />
        <title>Товарный чек ${formatSaleNumber(group.saleNumber)}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            background: #f4f4f4;
            color: #111;
            font-family: Arial, sans-serif;
            font-size: 14px;
          }
          .receipt {
            width: min(720px, calc(100% - 32px));
            margin: 20px auto;
            background: #fff;
            border: 1px solid #d0d0d0;
            padding: 28px;
          }
          h1 {
            margin: 0 0 12px;
            font-size: 24px;
            text-align: center;
            text-transform: uppercase;
          }
          .company {
            margin-bottom: 18px;
            text-align: center;
            font-size: 18px;
            font-weight: 700;
          }
          .meta {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px 18px;
            margin-bottom: 18px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 18px;
          }
          th,
          td {
            border: 1px solid #c8c8c8;
            padding: 8px;
            text-align: left;
          }
          th {
            background: #efefef;
          }
          .number {
            text-align: right;
            white-space: nowrap;
          }
          .totals {
            display: grid;
            justify-content: end;
            gap: 8px;
            margin-bottom: 24px;
          }
          .total-line {
            display: grid;
            grid-template-columns: 150px 150px;
            gap: 12px;
            font-weight: 700;
          }
          .signature {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 28px;
            margin-top: 34px;
          }
          .signature-line {
            border-top: 1px solid #111;
            padding-top: 6px;
            text-align: center;
          }
          @media print {
            body { background: #fff; }
            .receipt {
              width: 100%;
              margin: 0;
              border: 0;
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <main class="receipt">
          <h1>Товарный чек ${formatSaleNumber(group.saleNumber)}</h1>
          <div class="company">${escapeHtml(companyName)}</div>
          <div class="meta">
            <div><strong>Дата:</strong> ${escapeHtml(createdAt)}</div>
            <div><strong>Оплата:</strong> ${escapeHtml(paymentMethod)}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>№</th>
                <th>Наименование товара</th>
                <th>Кол-во</th>
                <th>Цена</th>
                <th>Сумма</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="totals">
            <div class="total-line">
              <span>Итого:</span>
              <span class="number">${formatMoney(summary.total)}</span>
            </div>
          </div>
          <div class="signature">
            <div class="signature-line">Продавец</div>
            <div class="signature-line">Подпись</div>
          </div>
        </main>
      </body>
    </html>
  `;
}

function normalizeSettings(settings) {
  const theme = settings?.theme === "dark" ? "dark" : "light";
  const companyName = typeof settings?.companyName === "string"
    ? settings.companyName.trim()
    : "";

  return { theme, companyName };
}

function saveSettings() {
  saveToStorage(STORAGE_KEYS.settings, state.settings);
}

function applySettings(options = {}) {
  const shouldSyncInputs = options.syncInputs !== false;
  document.documentElement.dataset.theme = state.settings.theme;
  elements.companyDisplay.textContent = state.settings.companyName;
  elements.companyDisplay.hidden = !state.settings.companyName;

  if (shouldSyncInputs) {
    elements.themeInputs.forEach((input) => {
      input.checked = input.value === state.settings.theme;
    });
    elements.companyNameInput.value = state.settings.companyName;
  }
}

function updateTheme(theme) {
  state.settings.theme = theme === "dark" ? "dark" : "light";
  saveSettings();
  applySettings();
  showSettingsMessage("Тема сохранена");
}

function updateCompanyName() {
  state.settings.companyName = normalizeName(elements.companyNameInput.value);
  saveSettings();
  applySettings({ syncInputs: false });
  showSettingsMessage("Название компании сохранено");
}

function showSettingsMessage(message) {
  elements.settingsMessage.textContent = message;
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

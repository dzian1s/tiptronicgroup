const CATALOG_URL = "../data/catalog.json";
const FALLBACK_IMAGE = "../assets/images/automatic-transmission-4.jpg";

const state = {
  rawItems: [],
  items: [],
  filters: {
    search: "",
    group: "",
    type: "",
    brand: "",
    inStockOnly: false,
    sort: "group-asc",
  },
};

const elements = {
  grid: document.getElementById("catalogGrid"),
  state: document.getElementById("catalogState"),
  resultsCount: document.getElementById("resultsCount"),
  searchInput: document.getElementById("searchInput"),
  groupFilter: document.getElementById("groupFilter"),
  typeFilter: document.getElementById("typeFilter"),
  brandFilter: document.getElementById("brandFilter"),
  inStockOnly: document.getElementById("inStockOnly"),
  sortSelect: document.getElementById("sortSelect"),
  resetFiltersBtn: document.getElementById("resetFiltersBtn"),
};

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeItem(item, index) {
  const stocks = Array.isArray(item.stocks) ? item.stocks : [];
  const totalStock = stocks.reduce((sum, stockItem) => sum + Number(stockItem.qty || 0), 0);

  return {
    id: item.id || `${item.article || "item"}-${index}`,
    group: normalizeText(item.group),
    type: normalizeText(item.type),
    brand: normalizeText(item.brand),
    article: normalizeText(item.article),
    name: normalizeText(item.name),
    image: normalizeText(item.image),
    description: normalizeText(item.description),
    price: Number(item.price || 0),
    currency: normalizeText(item.currency) || "EUR",
    stocks,
    totalStock,
    available: totalStock > 0,
  };
}

async function loadCatalog() {
  try {
    showState("Loading catalog...");

    const response = await fetch(CATALOG_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to load catalog data.");
    }

    const data = await response.json();
    state.rawItems = Array.isArray(data) ? data.map(normalizeItem) : [];

    populateFilterOptions();
    applyFilters();
  } catch (error) {
    showState(error.message || "Could not load catalog.");
  }
}

function uniqueSortedValues(items, key) {
  return [...new Set(items.map((item) => item[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function populateSelect(selectElement, values, placeholder = "All") {
  const currentValue = selectElement.value;
  selectElement.innerHTML = `<option value="">${placeholder}</option>` + values
    .map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
    .join("");
  selectElement.value = values.includes(currentValue) ? currentValue : "";
}

function populateFilterOptions() {
  populateSelect(elements.groupFilter, uniqueSortedValues(state.rawItems, "group"), "All");
  populateSelect(elements.typeFilter, uniqueSortedValues(state.rawItems, "type"), "All");
  populateSelect(elements.brandFilter, uniqueSortedValues(state.rawItems, "brand"), "All");
}

function sortItems(items) {
  const sorted = [...items];
  const { sort } = state.filters;

  if (sort === "price-asc") {
    sorted.sort((a, b) => a.price - b.price);
  } else if (sort === "price-desc") {
    sorted.sort((a, b) => b.price - a.price);
  } else if (sort === "name-asc") {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    sorted.sort((a, b) => {
      const groupCompare = a.group.localeCompare(b.group);
      if (groupCompare !== 0) return groupCompare;
      return a.name.localeCompare(b.name);
    });
  }

  return sorted;
}

function applyFilters() {
  const { search, group, type, brand, inStockOnly } = state.filters;
  const query = search.toLowerCase();

  const filtered = state.rawItems.filter((item) => {
    const matchesSearch = !query || [item.article, item.name, item.group, item.type, item.brand]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(query));

    const matchesGroup = !group || item.group === group;
    const matchesType = !type || item.type === type;
    const matchesBrand = !brand || item.brand === brand;
    const matchesStock = !inStockOnly || item.available;

    return matchesSearch && matchesGroup && matchesType && matchesBrand && matchesStock;
  });

  state.items = sortItems(filtered);
  renderCatalog();
}

function renderCatalog() {
  const items = state.items;
  elements.resultsCount.textContent = `${items.length} item${items.length === 1 ? "" : "s"}`;

  if (!items.length) {
    elements.grid.hidden = true;
    showState("No items match the selected filters.");
    return;
  }

  elements.state.hidden = true;
  elements.grid.hidden = false;
  elements.grid.innerHTML = items.map(renderCard).join("");
}

function showState(message) {
  elements.state.hidden = false;
  elements.state.textContent = message;
  elements.grid.hidden = true;
  elements.grid.innerHTML = "";
  elements.resultsCount.textContent = "0 items";
}

function renderWarehouseList(stocks) {
  if (!stocks.length) {
    return `<li class="catalog-warehouse-item"><span class="catalog-warehouse-name">No warehouse data</span><span class="catalog-warehouse-qty">0</span></li>`;
  }

  return stocks.map((stockItem) => `
    <li class="catalog-warehouse-item">
      <span class="catalog-warehouse-name">${escapeHtml(stockItem.warehouse || "Warehouse")}</span>
      <span class="catalog-warehouse-qty">Qty: ${escapeHtml(stockItem.qty ?? 0)}</span>
    </li>
  `).join("");
}

function renderCard(item) {
  const imageSrc = item.image || FALLBACK_IMAGE;
  const stockClass = item.available ? "in-stock" : "out-of-stock";
  const stockLabel = item.available ? `In stock: ${item.totalStock}` : "Out of stock";

  return `
    <article class="catalog-card catalog-panel">
      <div class="catalog-card-media">
        <img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(item.name)}" loading="lazy" onerror="this.src='${FALLBACK_IMAGE}'" />
      </div>
      <div class="catalog-card-body">
        <div class="catalog-meta-row">
          ${item.group ? `<span class="catalog-pill">${escapeHtml(item.group)}</span>` : ""}
          ${item.type ? `<span class="catalog-pill">${escapeHtml(item.type)}</span>` : ""}
          ${item.brand ? `<span class="catalog-pill">${escapeHtml(item.brand)}</span>` : ""}
        </div>

        <h3 class="catalog-card-title">${escapeHtml(item.name)}</h3>
        <p class="catalog-card-article">Article: ${escapeHtml(item.article || "—")}</p>
        ${item.description ? `<p class="catalog-card-description">${escapeHtml(item.description)}</p>` : ""}

        <div class="catalog-price-row">
          <div class="catalog-price">${escapeHtml(item.currency)} ${item.price.toFixed(2)}</div>
          <div class="catalog-stock-badge ${stockClass}">${stockLabel}</div>
        </div>

        <ul class="catalog-warehouse-list">
          ${renderWarehouseList(item.stocks)}
        </ul>

        <div class="catalog-card-actions">
          <a class="btn btn-primary catalog-btn-small" href="../index.html#order">Request this item</a>
          <a class="btn btn-secondary catalog-btn-small" href="../index.html#contacts">Contact us</a>
        </div>
      </div>
    </article>
  `;
}

function resetFilters() {
  state.filters = {
    search: "",
    group: "",
    type: "",
    brand: "",
    inStockOnly: false,
    sort: "group-asc",
  };

  elements.searchInput.value = "";
  elements.groupFilter.value = "";
  elements.typeFilter.value = "";
  elements.brandFilter.value = "";
  elements.inStockOnly.checked = false;
  elements.sortSelect.value = "group-asc";

  applyFilters();
}

function attachEvents() {
  elements.searchInput.addEventListener("input", (event) => {
    state.filters.search = event.target.value.trim();
    applyFilters();
  });

  elements.groupFilter.addEventListener("change", (event) => {
    state.filters.group = event.target.value;
    applyFilters();
  });

  elements.typeFilter.addEventListener("change", (event) => {
    state.filters.type = event.target.value;
    applyFilters();
  });

  elements.brandFilter.addEventListener("change", (event) => {
    state.filters.brand = event.target.value;
    applyFilters();
  });

  elements.inStockOnly.addEventListener("change", (event) => {
    state.filters.inStockOnly = event.target.checked;
    applyFilters();
  });

  elements.sortSelect.addEventListener("change", (event) => {
    state.filters.sort = event.target.value;
    applyFilters();
  });

  elements.resetFiltersBtn.addEventListener("click", resetFilters);
}

attachEvents();
loadCatalog();

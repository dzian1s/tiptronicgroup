const FALLBACK_IMAGE = "../assets/images/automatic-transmission-4.jpg";

const CATALOG_URL = "../data/catalog.json";

const state = {
  items: [],
  filtered: [],
  filters: {
    group: "",
    type: "",
    brand: "",
    inStockOnly: false,
    query: ""
  }
};

const els = {
  grid: document.getElementById("catalog-grid"),
  empty: document.getElementById("catalog-empty"),
  count: document.getElementById("catalog-count"),
  search: document.getElementById("catalog-search"),
  group: document.getElementById("filter-group"),
  type: document.getElementById("filter-type"),
  brand: document.getElementById("filter-brand"),
  inStockOnly: document.getElementById("filter-instock"),
  reset: document.getElementById("catalog-reset")
};

function normalizeText(value) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatPrice(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "Price on request";
  return `EUR ${num.toFixed(2)}`;
}

function uniqueSorted(values) {
  return [...new Set(values.map(normalizeText).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "en")
  );
}

function getDisplayType(item) {
  return normalizeText(item.displayType || item.type);
}

function stockBadgeText(item) {
  return item.totalStock > 0 ? `In stock: ${item.totalStock}` : "Out of stock";
}

function buildBadges(item) {
  return [item.group, getDisplayType(item)].filter(Boolean);
}

function buildWarehouseRows(item) {
  if (!Array.isArray(item.stocks) || item.stocks.length === 0) {
    return `
      <div class="warehouse-row">
        <span>Warehouse</span>
        <span>Qty: 0</span>
      </div>
    `;
  }

  return item.stocks
    .map(
      (stock) => `
        <div class="warehouse-row">
          <span>${escapeHtml(stock.warehouse || "Unknown")}</span>
          <span>Qty: ${Number(stock.qty) || 0}</span>
        </div>
      `
    )
    .join("");
}

function buildCard(item) {
  const badges = buildBadges(item);
  const imageSrc = normalizeText(item.image) || "../images/placeholder.jpg";
  const brandLine = item.brand
    ? `<div class="catalog-card__meta">${escapeHtml(item.brand)}</div>`
    : "";

  return `
    <article class="catalog-card">
      <div class="catalog-card__image-wrap">
        <img
          class="catalog-card__image"
          src="${escapeHtml(imageSrc)}"
          alt="${escapeHtml(item.name || item.article || "Product")}"
          loading="lazy"
        />
      </div>

      <div class="catalog-card__body">
        <div class="card-badges">
          ${badges
            .map((badge) => `<span class="card-badge">${escapeHtml(badge)}</span>`)
            .join("")}
        </div>

        <h3 class="catalog-card__title">${escapeHtml(item.name || "Unnamed item")}</h3>

        <div class="catalog-card__article">Article: ${escapeHtml(item.article || "-")}</div>

        ${brandLine}

        <div class="catalog-card__price-row">
          <div class="catalog-card__price">${formatPrice(item.price)}</div>
          <div class="catalog-card__stock ${item.totalStock > 0 ? "is-instock" : "is-outstock"}">
            ${escapeHtml(stockBadgeText(item))}
          </div>
        </div>

        <div class="catalog-card__warehouses">
          ${buildWarehouseRows(item)}
        </div>

        <div class="catalog-card__actions">
          <a class="btn btn-primary" href="../#order">Request this item</a>
          <a class="btn btn-secondary" href="../#contacts">Contact us</a>
        </div>
      </div>
    </article>
  `;
}

function renderCatalog(items) {
  els.grid.innerHTML = items.map(buildCard).join("");
  els.count.textContent = String(items.length);

  const isEmpty = items.length === 0;
  els.empty.hidden = !isEmpty;
  els.grid.hidden = isEmpty;
}

function applyFilters() {
  const query = normalizeText(state.filters.query).toLowerCase();

  state.filtered = state.items.filter((item) => {
    const itemType = getDisplayType(item);

    const matchesGroup =
      !state.filters.group || normalizeText(item.group) === state.filters.group;

    const matchesType =
      !state.filters.type || normalizeText(itemType) === state.filters.type;

    const matchesBrand =
      !state.filters.brand || normalizeText(item.brand) === state.filters.brand;

    const matchesStock = !state.filters.inStockOnly || Number(item.totalStock) > 0;

    const haystack = [
      item.group,
      itemType,
      item.brand,
      item.article,
      item.name
    ]
      .map(normalizeText)
      .join(" ")
      .toLowerCase();

    const matchesQuery = !query || haystack.includes(query);

    return (
      matchesGroup &&
      matchesType &&
      matchesBrand &&
      matchesStock &&
      matchesQuery
    );
  });

  renderCatalog(state.filtered);
}

function refillSelect(selectEl, values, placeholder, selectedValue = "") {
  selectEl.innerHTML = "";

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = placeholder;
  selectEl.appendChild(defaultOption);

  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    if (value === selectedValue) {
      option.selected = true;
    }
    selectEl.appendChild(option);
  });
}

function updateFilterOptions() {
  const selectedGroup = state.filters.group;
  const selectedType = state.filters.type;
  const selectedBrand = state.filters.brand;

  const groupValues = uniqueSorted(state.items.map((item) => item.group));

  const itemsForType = selectedGroup
    ? state.items.filter((item) => normalizeText(item.group) === selectedGroup)
    : state.items;

  const typeValues = uniqueSorted(itemsForType.map((item) => getDisplayType(item)));

  const itemsForBrand = state.items.filter((item) => {
    const itemType = getDisplayType(item);

    const matchesGroup = !selectedGroup || normalizeText(item.group) === selectedGroup;
    const matchesType = !selectedType || normalizeText(itemType) === selectedType;

    return matchesGroup && matchesType;
  });

  const brandValues = uniqueSorted(itemsForBrand.map((item) => item.brand));

  if (selectedType && !typeValues.includes(selectedType)) {
    state.filters.type = "";
  }

  if (selectedBrand && !brandValues.includes(selectedBrand)) {
    state.filters.brand = "";
  }

  refillSelect(els.group, groupValues, "All transmissions", state.filters.group);
  refillSelect(els.type, typeValues, "All part types", state.filters.type);
  refillSelect(els.brand, brandValues, "All brands", state.filters.brand);
}

function bindEvents() {
  els.search.addEventListener("input", (event) => {
    state.filters.query = event.target.value;
    applyFilters();
  });

  els.group.addEventListener("change", (event) => {
    state.filters.group = event.target.value;
    updateFilterOptions();
    applyFilters();
  });

  els.type.addEventListener("change", (event) => {
    state.filters.type = event.target.value;
    updateFilterOptions();
    applyFilters();
  });

  els.brand.addEventListener("change", (event) => {
    state.filters.brand = event.target.value;
    applyFilters();
  });

  els.inStockOnly.addEventListener("change", (event) => {
    state.filters.inStockOnly = event.target.checked;
    applyFilters();
  });

  els.reset.addEventListener("click", () => {
    state.filters = {
      group: "",
      type: "",
      brand: "",
      inStockOnly: false,
      query: ""
    };

    els.search.value = "";
    els.inStockOnly.checked = false;

    updateFilterOptions();
    applyFilters();
  });
}

async function loadCatalog() {
  try {
    const response = await fetch(CATALOG_URL, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Failed to load catalog: ${response.status}`);
    }

    const data = await response.json();

    state.items = Array.isArray(data) ? data : [];
    updateFilterOptions();
    applyFilters();
  } catch (error) {
    console.error(error);
    els.grid.hidden = true;
    els.empty.hidden = false;
    els.empty.textContent = "Catalog failed to load.";
    els.count.textContent = "0";
  }
}

bindEvents();
loadCatalog();

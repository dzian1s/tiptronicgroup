import { addToCart, getCartCount, getCartItemQty, getCartTotal } from "./cart.js";

const FALLBACK_IMAGE = "../assets/images/Noimageyet.png";
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
  },
  sort: "group-asc"
};

const els = {
  grid: document.getElementById("catalogGrid"),
  state: document.getElementById("catalogState"),
  count: document.getElementById("resultsCount"),
  search: document.getElementById("searchInput"),
  group: document.getElementById("groupFilter"),
  type: document.getElementById("typeFilter"),
  brand: document.getElementById("brandFilter"),
  inStockOnly: document.getElementById("inStockOnly"),
  cartBadge: document.getElementById("cartBadge"),
  cartTotalBadge: document.getElementById("cartTotalBadge"),
  reset: document.getElementById("resetFiltersBtn"),
  sort: document.getElementById("sortSelect")
};

function updateCartBadge() {
  if (els.cartBadge) {
    els.cartBadge.textContent = String(getCartCount());
  }

  if (els.cartTotalBadge) {
    els.cartTotalBadge.textContent = `EUR ${getCartTotal().toFixed(2)}`;
  }
}

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

function resolveImageSrc(item) {
  const raw = normalizeText(item.image);
  if (!raw) return FALLBACK_IMAGE;
  return raw;
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
  const imageSrc = resolveImageSrc(item);
  const brandLine = item.brand
    ? `<div class="catalog-card__meta">${escapeHtml(item.brand)}</div>`
    : "";

  const inCartQty = getCartItemQty(item.id);
  const availableQty = Math.max(0, Number(item.totalStock) || 0);
  const canAddMore = availableQty > 0 && inCartQty < availableQty;

  const actionBlock =
    availableQty > 0
      ? `
        <div class="catalog-card__actions">
          <button
            class="btn btn-primary"
            type="button"
            data-add-to-cart="${escapeHtml(item.id)}"
            ${canAddMore ? "" : "disabled"}
          >
            ${canAddMore ? "Add to cart" : "Max in cart"}
          </button>
          <a class="btn btn-secondary" href="../#contacts">Contact us</a>
        </div>
      `
      : `
        <div class="catalog-card__actions">
          <a class="btn btn-primary" href="../#contacts">Notify me</a>
          <a class="btn btn-secondary" href="../#contacts">Request on order</a>
        </div>
      `;

  return `
    <article class="catalog-card">
      <div class="catalog-card__image-wrap">
        <img
          class="catalog-card__image"
          src="${escapeHtml(imageSrc)}"
          alt="${escapeHtml(item.name || item.article || "Product")}"
          loading="lazy"
          onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'"
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

        ${actionBlock}
      </div>
    </article>
  `;
}

function renderCatalog(items) {
  els.grid.innerHTML = items.map(buildCard).join("");
  els.count.textContent = `${items.length} items`;

  els.grid.querySelectorAll("[data-add-to-cart]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = state.items.find((x) => x.id === btn.dataset.addToCart);
      if (!item) return;

      const added = addToCart(item);
      updateCartBadge();

      if (!added) {
        btn.textContent = "Max in cart";
        btn.disabled = true;
        return;
      }

      const inCartQty = getCartItemQty(item.id);
      const availableQty = Math.max(0, Number(item.totalStock) || 0);

      if (inCartQty >= availableQty) {
        btn.textContent = "Max in cart";
        btn.disabled = true;
      }
    });
  });

  const isEmpty = items.length === 0;
  els.state.hidden = !isEmpty;
  els.grid.hidden = isEmpty;

  if (isEmpty) {
    els.state.textContent = "No items match the selected filters.";
  }
}

function sortItems(items) {
  const arr = [...items];

  switch (state.sort) {
    case "price-asc":
      arr.sort((a, b) => Number(a.price) - Number(b.price));
      break;
    case "price-desc":
      arr.sort((a, b) => Number(b.price) - Number(a.price));
      break;
    case "name-asc":
      arr.sort((a, b) =>
        normalizeText(a.name).localeCompare(normalizeText(b.name), "en")
      );
      break;
    case "group-asc":
    default:
      arr.sort((a, b) => {
        return (
          normalizeText(a.group).localeCompare(normalizeText(b.group), "en") ||
          normalizeText(getDisplayType(a)).localeCompare(normalizeText(getDisplayType(b)), "en") ||
          normalizeText(a.name).localeCompare(normalizeText(b.name), "en")
        );
      });
      break;
  }

  return arr;
}

function applyFilters() {
  const query = normalizeText(state.filters.query).toLowerCase();

  const filtered = state.items.filter((item) => {
    const itemType = getDisplayType(item);

    const matchesGroup =
      !state.filters.group || normalizeText(item.group) === state.filters.group;

    const matchesType =
      !state.filters.type || normalizeText(itemType) === state.filters.type;

    const matchesBrand =
      !state.filters.brand || normalizeText(item.brand) === state.filters.brand;

    const matchesStock =
      !state.filters.inStockOnly || Number(item.totalStock) > 0;

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

  state.filtered = sortItems(filtered);
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

    const matchesGroup =
      !selectedGroup || normalizeText(item.group) === selectedGroup;
    const matchesType =
      !selectedType || normalizeText(itemType) === selectedType;

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

  els.sort.addEventListener("change", (event) => {
    state.sort = event.target.value;
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
    state.sort = "group-asc";

    els.search.value = "";
    els.inStockOnly.checked = false;
    els.sort.value = "group-asc";

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
    els.state.hidden = false;
    els.state.textContent = "Catalog failed to load.";
    els.count.textContent = "0 items";
  }
}

bindEvents();
window.addEventListener("cart:updated", updateCartBadge);
updateCartBadge();
loadCatalog();

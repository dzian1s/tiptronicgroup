import {
  getCart,
  removeFromCart,
  updateCartQty,
  clearCart,
  getCartCount,
  getCartTotal
} from "./cart.js";

const FALLBACK_IMAGE = "../assets/images/automatic-transmission-4.jpg";

const els = {
  list: document.getElementById("cartList"),
  empty: document.getElementById("cartEmpty"),
  count: document.getElementById("cartCount"),
  itemsCount: document.getElementById("cartItemsCount"),
  total: document.getElementById("cartTotal"),
  clearBtn: document.getElementById("clearCartBtn")
};

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
  if (!Number.isFinite(num)) return "EUR 0.00";
  return `EUR ${num.toFixed(2)}`;
}

function render() {
  const cart = getCart();
  const count = getCartCount();
  const total = getCartTotal();

  els.count.textContent = `${count} item${count === 1 ? "" : "s"}`;
  els.itemsCount.textContent = String(count);
  els.total.textContent = formatPrice(total);

  if (!cart.length) {
    els.list.innerHTML = "";
    els.empty.hidden = false;
    return;
  }

  els.empty.hidden = true;

  els.list.innerHTML = cart
    .map((item) => {
      const image = item.image || FALLBACK_IMAGE;
      return `
        <article class="cart-item">
          <div class="cart-item__image-wrap">
            <img
              class="cart-item__image"
              src="${escapeHtml(image)}"
              alt="${escapeHtml(item.name)}"
              onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'"
            />
          </div>

          <div class="cart-item__body">
            <div class="cart-item__badges">
              ${item.group ? `<span class="cart-badge">${escapeHtml(item.group)}</span>` : ""}
              ${item.type ? `<span class="cart-badge">${escapeHtml(item.type)}</span>` : ""}
            </div>

            <h3 class="cart-item__title">${escapeHtml(item.name)}</h3>
            <div class="cart-item__meta">Article: ${escapeHtml(item.article || "-")}</div>
            ${item.brand ? `<div class="cart-item__meta">${escapeHtml(item.brand)}</div>` : ""}

            <div class="cart-item__controls">
              <label class="cart-qty">
                <span>Qty</span>
                <input
                  type="number"
                  min="1"
                  value="${Number(item.qty) || 1}"
                  data-qty-id="${escapeHtml(item.id)}"
                />
              </label>

              <div class="cart-item__price">${formatPrice(item.price)}</div>

              <button
                type="button"
                class="btn btn-secondary cart-remove-btn"
                data-remove-id="${escapeHtml(item.id)}"
              >
                Remove
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  bindItemEvents();
}

function bindItemEvents() {
  document.querySelectorAll("[data-remove-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      removeFromCart(btn.dataset.removeId);
      render();
    });
  });

  document.querySelectorAll("[data-qty-id]").forEach((input) => {
    input.addEventListener("change", () => {
      updateCartQty(input.dataset.qtyId, input.value);
      render();
    });
  });
}

els.clearBtn.addEventListener("click", () => {
  clearCart();
  render();
});

window.addEventListener("cart:updated", render);

render();

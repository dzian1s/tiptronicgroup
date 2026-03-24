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
      const maxQty = Math.max(1, Number(item.maxQty) || 1);
      const currentQty = Number(item.qty) || 1;

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
            <div class="cart-item__meta">Available: ${maxQty}</div>

            <div class="cart-item__controls">
              <label class="cart-qty">
                <span>Qty</span>
                <div class="cart-qty-control">
                  <button
                    type="button"
                    class="cart-qty-btn"
                    data-qty-decrease="${escapeHtml(item.id)}"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>

                  <input
                    type="number"
                    min="1"
                    max="${maxQty}"
                    value="${currentQty}"
                    data-qty-id="${escapeHtml(item.id)}"
                  />

                  <button
                    type="button"
                    class="cart-qty-btn"
                    data-qty-increase="${escapeHtml(item.id)}"
                    aria-label="Increase quantity"
                    ${currentQty >= maxQty ? "disabled" : ""}
                  >
                    +
                  </button>
                </div>
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
      const cart = getCart();
      const item = cart.find((x) => x.id === input.dataset.qtyId);
      if (!item) return;

      const maxQty = Math.max(1, Number(item.maxQty) || 1);
      const nextQty = Math.max(1, Math.min(Number(input.value) || 1, maxQty));

      updateCartQty(input.dataset.qtyId, nextQty);
      render();
    });
  });

  document.querySelectorAll("[data-qty-decrease]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.qtyDecrease;
      const cart = getCart();
      const item = cart.find((x) => x.id === id);
      if (!item) return;

      const nextQty = Math.max(1, (Number(item.qty) || 1) - 1);
      btn.blur();
      updateCartQty(id, nextQty);
      render();
    });
  });

  document.querySelectorAll("[data-qty-increase]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.qtyIncrease;
      const cart = getCart();
      const item = cart.find((x) => x.id === id);
      if (!item) return;

      const maxQty = Math.max(1, Number(item.maxQty) || 1);
      const nextQty = Math.min((Number(item.qty) || 1) + 1, maxQty);

      btn.blur();
      updateCartQty(id, nextQty);
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

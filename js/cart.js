const CART_KEY = "tiptronic_cart";

function readCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  window.dispatchEvent(new CustomEvent("cart:updated"));
}

export function getCart() {
  return readCart();
}

export function saveCart(cart) {
  writeCart(cart);
}

export function getCartCount() {
  return readCart().reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
}

export function getCartTotal() {
  return readCart().reduce((sum, item) => {
    const qty = Number(item.qty) || 0;
    const price = Number(item.price) || 0;
    return sum + qty * price;
  }, 0);
}

export function getCartItemQty(id) {
  const item = readCart().find((x) => x.id === id);
  return item ? Number(item.qty) || 0 : 0;
}

export function addToCart(item) {
  const cart = readCart();
  const existing = cart.find((x) => x.id === item.id);

  const maxQty = Math.max(0, Number(item.totalStock) || 0);

  if (maxQty <= 0) {
    return false;
  }

  if (existing) {
    const nextQty = Math.min(existing.qty + 1, maxQty);

    if (nextQty === existing.qty) {
      return false;
    }

    existing.qty = nextQty;
  } else {
    cart.push({
      id: item.id,
      article: item.article || "",
      name: item.name || "",
      price: Number(item.price) || 0,
      image: item.image || "",
      group: item.group || "",
      type: item.displayType || item.type || "",
      brand: item.brand || "",
      qty: 1,
      maxQty
    });
  }

  writeCart(cart);
  return true;
}

export function removeFromCart(id) {
  const cart = readCart().filter((item) => item.id !== id);
  writeCart(cart);
}

export function updateCartQty(id, qty) {
  const cart = readCart().map((item) => {
    if (item.id !== id) return item;

    const maxQty = Math.max(1, Number(item.maxQty) || 1);
    const normalizedQty = Math.max(1, Math.min(Number(qty) || 1, maxQty));

    return {
      ...item,
      qty: normalizedQty
    };
  });

  writeCart(cart);
}

export function clearCart() {
  writeCart([]);
}

export function isInCart(id) {
  return readCart().some((item) => item.id === id);
}

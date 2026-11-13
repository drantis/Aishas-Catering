(function () {
  const KEY = "aishas-catering-cart-v1";
  const menu = () => (window.AISHA_MENU && window.AISHA_MENU.items) || [];

  function read() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "{}");
    } catch {
      return {};
    }
  }

  function write(cart) {
    localStorage.setItem(KEY, JSON.stringify(cart));
    window.dispatchEvent(new CustomEvent("aisha:cart", { detail: cart }));
  }

  function lines(cart) {
    return Object.entries(cart)
      .map(([id, qty]) => {
        const item = menu().find((m) => m.id === id);
        if (!item || qty < 1) return null;
        return { ...item, qty, lineTotal: item.price * qty };
      })
      .filter(Boolean);
  }

  function total(cart) {
    return lines(cart).reduce((sum, line) => sum + line.lineTotal, 0);
  }

  // Counted from the lines, so a dish that is no longer on the menu (left over
  // in a returning visitor's saved order) never inflates the badge.
  function count(cart) {
    return lines(cart).reduce((sum, line) => sum + line.qty, 0);
  }

  function money(n) {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      maximumFractionDigits: 0,
    }).format(n);
  }

  window.AishaCart = {
    read,
    write,
    lines,
    total,
    count,
    money,
    add(id, qty = 1) {
      const cart = read();
      cart[id] = (cart[id] || 0) + qty;
      if (cart[id] <= 0) delete cart[id];
      write(cart);
      return cart;
    },
    set(id, qty) {
      const cart = read();
      if (qty <= 0) delete cart[id];
      else cart[id] = qty;
      write(cart);
      return cart;
    },
    clear() {
      write({});
    },
  };
})();

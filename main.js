(function () {
  "use strict";

  const data = window.AISHA_MENU || { items: [] };
  const Cart = window.AishaCart;
  const biz = data.business || {};
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const plural = (n, word) => n + " " + word + (n === 1 ? "" : "s");
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => [...(root || document).querySelectorAll(sel)];

  $$("[data-year]").forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });

  /* ---------- Business details (set once in menu-data.js) ---------- */

  const phone = (biz.phone || "").trim();
  const email = (biz.email || "").trim();
  const area = (biz.area || "").trim();

  $$('[data-biz="phone"]').forEach((el) => {
    if (!phone) return;
    el.textContent = phone;
    el.href = "tel:" + phone.replace(/[^\d+]/g, "");
    el.hidden = false;
  });
  $$('[data-biz="email"]').forEach((el) => {
    if (!email) return;
    el.textContent = email;
    el.href = "mailto:" + email;
    el.hidden = false;
  });
  $$('[data-biz="area"]').forEach((el) => {
    if (!area) return;
    el.textContent = area;
    el.hidden = false;
  });
  $$("[data-biz-contact]").forEach((el) => {
    el.hidden = !(phone || email);
  });

  if (!Cart) return;

  /* ---------- Shared pieces ---------- */

  function photo(item, eager) {
    const wrap = document.createElement("div");
    wrap.className = "photo";
    const img = document.createElement("img");
    img.src = item.image;
    img.alt = item.name;
    img.decoding = "async";
    img.loading = eager ? "eager" : "lazy";
    img.draggable = false;
    wrap.appendChild(img);
    return wrap;
  }

  // Minus / quantity / plus. `key` lets focus survive a re-render.
  function stepper(item, key) {
    const wrap = document.createElement("div");
    wrap.className = "stepper";
    const make = (label, text, action) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = text;
      btn.setAttribute("aria-label", label + " " + item.name);
      if (key) btn.dataset.focusKey = key + ":" + action;
      return btn;
    };
    const minus = make("Remove one", "−", "minus");
    const plus = make("Add one", "+", "plus");
    const qty = document.createElement("span");
    qty.className = "stepper-qty";
    minus.addEventListener("click", () => Cart.add(item.id, -1));
    plus.addEventListener("click", () => Cart.add(item.id, 1));
    wrap.append(minus, qty, plus);
    return { wrap, minus, plus, qty };
  }

  function orderLine(line, scope) {
    const row = document.createElement("div");
    row.className = "order-line";

    const info = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = line.name;
    const meta = document.createElement("p");
    meta.className = "muted";
    meta.textContent = Cart.money(line.price) + " each · " + line.serves;
    info.append(name, meta);

    const side = document.createElement("div");
    side.className = "order-line-side";
    const step = stepper(line, scope + ":" + line.id);
    step.qty.textContent = String(line.qty);
    const total = document.createElement("span");
    total.className = "order-line-total";
    total.textContent = Cart.money(line.lineTotal);
    side.append(step.wrap, total);

    row.append(info, side);
    return row;
  }

  // Re-rendering a list destroys the button that was just pressed. Put focus
  // back on its replacement so keyboard users keep their place.
  function rerender(container, build) {
    const focused = document.activeElement;
    const key = focused && container.contains(focused) ? focused.dataset.focusKey : null;
    container.innerHTML = "";
    build();
    if (!key) return;
    const again = container.querySelector('[data-focus-key="' + key + '"]');
    if (again) again.focus({ preventScroll: true });
  }

  /* ---------- Order drawer + bottom bar ---------- */

  const drawer = $("[data-cart-drawer]");
  const cartBody = $("[data-cart-body]");
  const cartFoot = $("[data-cart-foot]");
  const orderBar = $("[data-order-bar]");
  const live = $("[data-cart-live]");
  let lastOpener = null;

  function openCart(event) {
    if (!drawer) return;
    lastOpener = event && event.currentTarget ? event.currentTarget : null;
    drawer.inert = false;
    drawer.setAttribute("aria-hidden", "false");
    document.body.classList.add("cart-open");
    const close = $("[data-cart-close]", drawer);
    if (close) close.focus({ preventScroll: true });
  }

  function closeCart() {
    if (!drawer || drawer.getAttribute("aria-hidden") === "true") return;
    drawer.setAttribute("aria-hidden", "true");
    drawer.inert = true;
    document.body.classList.remove("cart-open");
    if (lastOpener && document.contains(lastOpener) && !lastOpener.closest("[hidden]")) {
      lastOpener.focus({ preventScroll: true });
    }
  }

  if (drawer) {
    drawer.inert = true;
    $$("[data-cart-open]").forEach((el) => el.addEventListener("click", openCart));
    $$("[data-cart-close]").forEach((el) => el.addEventListener("click", closeCart));
    drawer.addEventListener("click", (event) => {
      if (event.target === drawer) closeCart();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeCart();
    });
  }

  function renderOrder() {
    const cart = Cart.read();
    const lines = Cart.lines(cart);
    const count = Cart.count(cart);
    const total = Cart.money(Cart.total(cart));

    $$("[data-cart-count]").forEach((el) => {
      el.textContent = String(count);
      el.hidden = count === 0;
    });
    $$("[data-cart-total]").forEach((el) => {
      el.textContent = total;
    });
    $$("[data-header-checkout]").forEach((el) => {
      el.hidden = count === 0;
    });
    $$("[data-cart-open]").forEach((el) => {
      if (el.classList.contains("order-btn")) {
        el.setAttribute("aria-label", "Your order, " + plural(count, "item"));
      }
    });

    if (cartBody) {
      rerender(cartBody, () => {
        if (!lines.length) {
          const empty = document.createElement("p");
          empty.className = "cart-empty";
          empty.textContent = "Your order is empty. Add a dish from the menu to get started.";
          cartBody.appendChild(empty);
          return;
        }
        lines.forEach((line) => cartBody.appendChild(orderLine(line, "cart")));
      });
      // The pressed button is gone once a dish drops to zero
      if (drawer && !drawer.inert && !drawer.contains(document.activeElement)) {
        const close = $("[data-cart-close]", drawer);
        if (close) close.focus({ preventScroll: true });
      }
    }
    if (cartFoot) cartFoot.hidden = lines.length === 0;

    if (orderBar) {
      orderBar.hidden = count === 0;
      document.body.classList.toggle("has-order", count > 0);
      const barCount = $("[data-order-bar-count]", orderBar);
      if (barCount) barCount.textContent = plural(count, "item");
    }

    const summary = $("[data-checkout-lines]");
    if (summary) {
      rerender(summary, () => {
        if (!lines.length) {
          const empty = document.createElement("p");
          empty.className = "muted";
          empty.textContent = "Your order is empty. Add dishes from the menu to continue.";
          summary.appendChild(empty);
          return;
        }
        lines.forEach((line) => summary.appendChild(orderLine(line, "summary")));
      });
      const totalRow = $("[data-checkout-total-row]");
      if (totalRow) totalRow.hidden = lines.length === 0;
      const submit = $("[data-submit]");
      if (submit) submit.disabled = lines.length === 0;
    }
  }

  window.addEventListener("aisha:cart", renderOrder);
  // Keep a second tab (menu in one, checkout in another) in step
  window.addEventListener("storage", renderOrder);

  /* ---------- Menu carousel ---------- */

  // A native horizontal scroller with scroll snapping. Swiping sideways moves
  // between dishes; swiping up or down scrolls the page as usual, because the
  // scroller has nothing to scroll vertically. The 3D tilt is drawn on the card
  // inside each slide, so the slides themselves (and their snap points) never
  // move.
  const scroller = $("[data-deck-scroller]");
  if (scroller && data.items.length) {
    const prevBtn = $("[data-deck-prev]");
    const nextBtn = $("[data-deck-next]");
    const dotsEl = $("[data-deck-dots]");
    const ambient = $$("[data-ambient]");
    const items = data.items;
    const total = items.length;
    let active = -1;
    let step = 1;
    let wide = false;
    let raf = 0;
    let ambientOn = 0;
    let ambientTimer = 0;

    const slides = items.map((item, i) => {
      const el = document.createElement("li");
      el.className = "slide";
      el.dataset.index = String(i);

      const card = document.createElement("article");
      card.className = "card";
      card.setAttribute("aria-label", item.name + ", dish " + (i + 1) + " of " + total);
      card.appendChild(photo(item, i < 2));

      const body = document.createElement("div");
      body.className = "card-body";
      body.innerHTML =
        '<p class="card-tag"></p>' +
        '<div class="card-title"><h2></h2><p class="price"></p></div>' +
        '<p class="card-blurb"></p>' +
        '<p class="card-meta"></p>' +
        '<div class="card-action"></div>';
      $(".card-tag", body).textContent = item.category;
      $("h2", body).textContent = item.name;
      $(".price", body).textContent = Cart.money(item.price);
      $(".card-blurb", body).textContent = item.blurb;
      $(".card-meta", body).textContent = item.serves;

      const action = $(".card-action", body);
      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "btn btn-primary btn-block";
      addBtn.textContent = "Add to order";
      addBtn.setAttribute("aria-label", "Add " + item.name + " to your order");
      const qty = stepper(item);
      qty.wrap.classList.add("stepper--card");
      const inOrder = document.createElement("span");
      inOrder.className = "stepper-label";
      inOrder.textContent = "in your order";
      qty.qty.after(inOrder);
      addBtn.addEventListener("click", () => {
        Cart.add(item.id, 1);
        qty.plus.focus({ preventScroll: true });
        if (live) live.textContent = item.name + " added to your order.";
      });
      action.append(addBtn, qty.wrap);
      card.appendChild(body);

      const shade = document.createElement("div");
      shade.className = "card-shade";
      card.appendChild(shade);

      el.appendChild(card);
      scroller.appendChild(el);

      let dot = null;
      if (dotsEl) {
        dot = document.createElement("button");
        dot.type = "button";
        dot.className = "deck-dot";
        dot.setAttribute("aria-label", item.name);
        dot.addEventListener("click", () => goTo(i));
        dotsEl.appendChild(dot);
      }

      return { item, el, card, shade, addBtn, qty, dot, center: 0 };
    });

    function syncActions() {
      const cart = Cart.read();
      slides.forEach((s) => {
        const n = cart[s.item.id] || 0;
        // Focus would be lost with the stepper when the last one is removed
        if (n === 0 && s.qty.wrap.contains(document.activeElement)) {
          s.addBtn.hidden = false;
          s.addBtn.focus({ preventScroll: true });
        }
        s.addBtn.hidden = n > 0;
        s.qty.wrap.hidden = n === 0;
        s.qty.qty.textContent = String(n);
      });
    }

    function measure() {
      slides.forEach((s) => {
        s.center = s.el.offsetLeft + s.el.offsetWidth / 2;
      });
      step = total > 1 ? slides[1].center - slides[0].center : slides[0].el.offsetWidth;
      wide = window.innerWidth >= 900;
    }

    function setActive(i) {
      active = i;
      slides.forEach((s, n) => {
        const on = n === i;
        s.el.classList.toggle("is-active", on);
        if (s.dot) {
          if (on) s.dot.setAttribute("aria-current", "true");
          else s.dot.removeAttribute("aria-current");
        }
      });
      if (prevBtn) prevBtn.disabled = i <= 0;
      if (nextBtn) nextBtn.disabled = i >= total - 1;

      // Swap the room light once the deck settles on a dish
      clearTimeout(ambientTimer);
      ambientTimer = setTimeout(() => {
        const item = items[active];
        if (!item || ambient.length < 2) return;
        ambientOn = 1 - ambientOn;
        ambient[ambientOn].style.backgroundImage = 'url("' + item.image + '")';
        ambient[ambientOn].classList.add("is-on");
        ambient[1 - ambientOn].classList.remove("is-on");
      }, 140);
    }

    function draw() {
      raf = 0;
      const mid = scroller.scrollLeft + scroller.clientWidth / 2;
      // The tilt stays on with "reduce motion": it is a layout that only moves
      // under the visitor's own finger, not an animation that plays by itself.
      const angle = wide ? 34 : 20;
      const pull = wide ? 15 : 6; // % of card width neighbours tuck in by
      const shrink = wide ? 0.1 : 0.06;
      let nearest = 0;
      let best = Infinity;

      for (let i = 0; i < total; i++) {
        const s = slides[i];
        const d = (s.center - mid) / step;
        const a = Math.abs(d);
        if (a < best) {
          best = a;
          nearest = i;
        }
        const t = clamp(d, -1, 1);
        const side = Math.abs(t);
        s.card.style.transform =
          "translate3d(" + (-t * pull).toFixed(2) + "%,0,0) " +
          "rotateY(" + (-t * angle).toFixed(2) + "deg) " +
          "scale(" + (1 - side * shrink).toFixed(3) + ")";
        s.el.style.zIndex = String(10 - Math.min(9, Math.round(a * 3)));
        s.shade.style.opacity = (clamp(a, 0, 1) * 0.55).toFixed(3);
      }

      if (nearest !== active) setActive(nearest);
    }

    function schedule() {
      if (!raf) raf = requestAnimationFrame(draw);
    }

    function goTo(i, instant) {
      const s = slides[clamp(i, 0, total - 1)];
      scroller.scrollTo({
        left: s.center - scroller.clientWidth / 2,
        // Browsers drop the glide themselves when "reduce motion" is on
        behavior: instant ? "auto" : "smooth",
      });
    }

    scroller.addEventListener("scroll", schedule, { passive: true });

    if (prevBtn) prevBtn.addEventListener("click", () => goTo(active - 1));
    if (nextBtn) nextBtn.addEventListener("click", () => goTo(active + 1));

    // Tap or click a side card to bring that dish forward
    scroller.addEventListener("click", (event) => {
      const el = event.target.closest(".slide");
      if (!el) return;
      const i = Number(el.dataset.index);
      if (i !== active) goTo(i);
    });

    // Tabbing onto a side card's button brings that dish forward too
    scroller.addEventListener("focusin", (event) => {
      const el = event.target.closest(".slide");
      if (!el) return;
      const i = Number(el.dataset.index);
      if (i !== active) goTo(i);
    });

    // Left / right step one dish. Handling the keys here also stops a browser
    // text cursor (Chrome caret browsing, F7) from walking through the page.
    document.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (document.body.classList.contains("cart-open")) return;
      const el = event.target;
      if (el && el.closest && el.closest("input, textarea, select, [contenteditable]")) return;
      event.preventDefault();
      goTo(active + (event.key === "ArrowRight" ? 1 : -1));
    });

    let resizeRaf = 0;
    function onResize() {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        const keep = Math.max(0, active);
        measure();
        goTo(keep, true);
        draw();
      });
    }
    window.addEventListener("resize", onResize);
    window.addEventListener("load", onResize);
    window.addEventListener("aisha:cart", syncActions);
    window.addEventListener("storage", syncActions);

    syncActions();
    measure();
    draw();
  }

  /* ---------- Checkout ---------- */

  const form = $("#checkout-form");
  if (form) {
    const errorEl = $("[data-form-error]", form);
    const submit = $("[data-submit]", form);
    const addressWrap = $("[data-delivery-only]", form);
    const addressInput = form.elements.address;
    const whenInput = form.elements.when;
    const whenLabel = $("[data-when-label]", form);

    // Earliest selectable time is now, in the visitor's own time zone
    if (whenInput) {
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      whenInput.min = now.toISOString().slice(0, 16);
    }

    function syncFulfillment() {
      const delivery = form.elements.fulfillment.value === "delivery";
      if (addressWrap) addressWrap.hidden = !delivery;
      if (addressInput) addressInput.required = delivery;
      if (whenLabel) whenLabel.textContent = (delivery ? "Delivery" : "Pickup") + " date and time";
    }
    $$('input[name="fulfillment"]', form).forEach((el) => el.addEventListener("change", syncFulfillment));
    syncFulfillment();

    function showError(message) {
      if (!errorEl) return;
      errorEl.textContent = message;
      errorEl.hidden = !message;
    }

    function showDone(payload, orderId) {
      const done = $("[data-checkout-done]");
      const layout = $("[data-checkout]");
      const head = $("[data-checkout-head]");
      if (!done) return;
      const first = payload.name.trim().split(/\s+/)[0];
      $("[data-done-name]", done).textContent = first ? ", " + first : "";
      $("[data-done-ref]", done).textContent = orderId
        ? " (reference " + String(orderId).slice(0, 8).toUpperCase() + ")"
        : "";
      $("[data-done-phone]", done).textContent = payload.phone;
      if (layout) layout.hidden = true;
      if (head) head.hidden = true;
      done.hidden = false;
      done.focus({ preventScroll: true });
      window.scrollTo(0, 0);
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      showError("");

      const lines = Cart.lines(Cart.read());
      if (!lines.length) {
        showError("Your order is empty. Add dishes from the menu to continue.");
        return;
      }
      if (!form.checkValidity()) {
        form.reportValidity();
        showError("Please complete the required fields.");
        return;
      }

      const fields = Object.fromEntries(new FormData(form).entries());
      const payload = {
        name: fields.name || "",
        phone: fields.phone || "",
        email: fields.email || "",
        fulfillment: fields.fulfillment === "delivery" ? "delivery" : "pickup",
        address: fields.fulfillment === "delivery" ? fields.address || "" : "",
        when: fields.when || "",
        notes: fields.notes || "",
        items: lines.map((line) => ({ id: line.id, qty: line.qty })),
      };

      const label = submit.textContent;
      submit.disabled = true;
      submit.textContent = "Sending your order…";

      fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(async (res) => {
          const body = await res.json().catch(() => ({}));
          if (!res.ok || !body.ok) {
            const problem = new Error("Order rejected");
            // Only a 4xx reply carries a message written for the customer
            problem.forCustomer = res.status >= 400 && res.status < 500 && body.error ? body.error : "";
            throw problem;
          }
          Cart.clear();
          showDone(payload, body.orderId);
        })
        .catch((err) => {
          // The order did not reach the kitchen, so say so. The dishes and the
          // form stay exactly as they were for another try.
          const reason = (err && err.forCustomer) || "We could not send your order.";
          const fallback = phone ? "Please try again, or call us at " + phone + "." : "Please try again.";
          showError(reason + " " + fallback);
        })
        .finally(() => {
          submit.textContent = label;
          submit.disabled = Cart.count(Cart.read()) === 0;
        });
    });
  }

  renderOrder();
})();

(function () {
  const menu = window.AISHA_MENU || { categories: [], items: [] };
  const Cart = window.AishaCart;

  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });

  const toggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("[data-nav]");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  function photo(label, src) {
    if (src) {
      const wrap = document.createElement("div");
      wrap.className = "photo";
      const img = document.createElement("img");
      img.src = src;
      img.alt = label;
      img.loading = "lazy";
      img.decoding = "async";
      wrap.appendChild(img);
      return wrap;
    }
    const el = document.createElement("div");
    el.className = "photo placeholder-photo";
    el.setAttribute("data-label", label);
    el.setAttribute("role", "img");
    el.setAttribute("aria-label", label + " placeholder");
    return el;
  }

  function renderCartUI() {
    if (!Cart) return;
    const cart = Cart.read();
    const list = Cart.lines(cart);
    const countEls = document.querySelectorAll("[data-cart-count]");
    const totalEls = document.querySelectorAll("[data-cart-total]");
    const body = document.querySelector("[data-cart-body]");

    countEls.forEach((el) => {
      el.textContent = String(Cart.count(cart));
    });
    totalEls.forEach((el) => {
      el.textContent = Cart.money(Cart.total(cart));
    });

    if (body) {
      body.innerHTML = "";
      if (!list.length) {
        const empty = document.createElement("p");
        empty.className = "cart-empty";
        empty.textContent = "Your order is empty. Add something from the menu.";
        body.appendChild(empty);
      } else {
        list.forEach((line) => {
          const row = document.createElement("div");
          row.className = "cart-item";
          row.innerHTML =
            "<div><strong></strong><p class=\"muted\"></p></div><div class=\"qty-row\"></div>";
          row.querySelector("strong").textContent = line.name;
          row.querySelector("p").textContent =
            Cart.money(line.lineTotal) + " · " + line.serves;
          const qty = row.querySelector(".qty-row");
          const minus = document.createElement("button");
          minus.type = "button";
          minus.textContent = "−";
          minus.setAttribute("aria-label", "Fewer " + line.name);
          minus.addEventListener("click", () => Cart.add(line.id, -1));
          const n = document.createElement("span");
          n.textContent = String(line.qty);
          const plus = document.createElement("button");
          plus.type = "button";
          plus.textContent = "+";
          plus.setAttribute("aria-label", "More " + line.name);
          plus.addEventListener("click", () => Cart.add(line.id, 1));
          qty.append(minus, n, plus);
          body.appendChild(row);
        });
      }
    }

    const checkoutLines = document.querySelector("[data-checkout-lines]");
    const checkoutTotal = document.querySelector("[data-checkout-total]");
    if (checkoutLines) {
      checkoutLines.innerHTML = "";
      if (!list.length) {
        checkoutLines.innerHTML = '<p class="muted">No dishes yet. <a href="menu.html">Open the menu</a>.</p>';
      } else {
        list.forEach((line) => {
          const row = document.createElement("div");
          row.className = "summary-line";
          row.innerHTML = "<div><strong></strong><p class=\"muted\"></p></div><div></div>";
          row.querySelector("strong").textContent = line.name;
          row.querySelector("p").textContent = line.qty + " × " + Cart.money(line.price);
          row.children[1].textContent = Cart.money(line.lineTotal);
          checkoutLines.appendChild(row);
        });
      }
    }
    if (checkoutTotal) checkoutTotal.textContent = Cart.money(Cart.total(cart));
  }

  const drawer = document.querySelector("[data-cart-drawer]");
  function openCart() {
    if (!drawer) return;
    drawer.setAttribute("aria-hidden", "false");
    document.body.classList.add("cart-open");
  }
  function closeCart() {
    if (!drawer) return;
    drawer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("cart-open");
  }

  document.querySelectorAll("[data-cart-open]").forEach((el) => {
    el.addEventListener("click", openCart);
  });
  document.querySelectorAll("[data-cart-close]").forEach((el) => {
    el.addEventListener("click", closeCart);
  });
  if (drawer) {
    drawer.addEventListener("click", (e) => {
      if (e.target === drawer) closeCart();
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeCart();
  });

  window.addEventListener("aisha:cart", renderCartUI);
  renderCartUI();

  const featured = document.querySelector("[data-featured-menu]");
  if (featured) {
    menu.items
      .filter((item) => item.featured)
      .slice(0, 3)
      .forEach((item) => {
        const card = document.createElement("article");
        card.className = "dish-card";
        card.appendChild(photo(item.name, item.image));
        const body = document.createElement("div");
        body.className = "body";
        body.innerHTML =
          "<h3></h3><p class=\"muted\"></p><div class=\"dish-meta\"></div><button class=\"btn btn-soft\" type=\"button\">Add to order</button>";
        body.querySelector("h3").textContent = item.name;
        body.querySelector("p").textContent = item.blurb;
        body.querySelector(".dish-meta").textContent =
          item.serves + " · " + Cart.money(item.price);
        body.querySelector("button").addEventListener("click", () => {
          Cart.add(item.id, 1);
          openCart();
        });
        card.appendChild(body);
        featured.appendChild(card);
      });
  }

  const filters = document.querySelector("[data-menu-filters]");
  const journey = document.querySelector("[data-menu-journey]");
  const track = document.querySelector("[data-journey-track]");
  const viewport = document.querySelector("[data-journey-viewport]");
  const indexEl = document.querySelector("[data-journey-index]");
  const totalEl = document.querySelector("[data-journey-total]");
  const progressEl = document.querySelector("[data-journey-progress]");

  // 3D menu stage. The page scrollbar is the only thing that moves the deck:
  // scroll position -> dish position -> one transform per card. Arrow keys,
  // swipes, and clicks on side cards all work by moving that same scrollbar.
  if (filters && journey && track && viewport && Cart) {
    const sticky = journey.querySelector(".menu-journey-sticky");
    const ambient = [...journey.querySelectorAll("[data-ambient]")];
    const heroStage = document.querySelector(".loop-stage");
    const heroPhoto = document.querySelector(".loop-photo");
    const heroCopy = document.querySelector(".loop-copy");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

    const cats = ["All", ...menu.categories];
    let active = "All";
    let items = [];
    let cards = [];
    const m = { top: 0, per: 1, vh: 1, cardW: 0, wide: false, heroH: 0, w: 0, h: 0 };

    // `to` is where the scrollbar says we are, `at` eases toward it.
    const pos = { at: 0, to: 0 };
    const enter = { at: 1, to: 1 };
    const tilt = { x: 0, y: 0, toX: 0, toY: 0 };
    let activeIdx = -1;
    let ambientOn = 0;
    let ambientTimer = 0;
    let raf = 0;
    let nav = { index: 0, time: -1e9 };
    let resting = true;
    let restTimer = 0;

    function renderFilters() {
      filters.innerHTML = "";
      cats.forEach((cat) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "cat-pill";
        btn.textContent = cat;
        btn.setAttribute("aria-selected", cat === active ? "true" : "false");
        btn.addEventListener("click", () => {
          if (cat === active) return;
          active = cat;
          filters.querySelectorAll(".cat-pill").forEach((pill) => {
            pill.setAttribute("aria-selected", pill === btn ? "true" : "false");
          });
          renderTrack();
          // A new list starts on its first dish
          if (window.scrollY > m.top) window.scrollTo(0, Math.ceil(m.top));
          snap();
        });
        filters.appendChild(btn);
      });
    }

    function renderTrack() {
      items =
        active === "All" ? menu.items.slice() : menu.items.filter((i) => i.category === active);
      track.innerHTML = "";
      if (totalEl) totalEl.textContent = String(items.length || 0);

      cards = items.map((item, i) => {
        const el = document.createElement("article");
        el.className = "journey-card";
        el.dataset.index = String(i);

        const pic = photo(item.name, item.image);
        const img = pic.querySelector("img");
        if (img) img.loading = "eager";
        el.appendChild(pic);

        const body = document.createElement("div");
        body.className = "body";
        body.innerHTML =
          '<div class="top"><div><h3></h3><p class="muted"></p></div><div class="price"></div></div><p class="dish-meta"></p><button class="btn btn-primary" type="button">Add to order</button>';
        body.querySelector("h3").textContent = item.name;
        body.querySelector("p.muted").textContent = item.blurb;
        body.querySelector(".price").textContent = Cart.money(item.price);
        body.querySelector(".dish-meta").textContent = item.serves + " · " + item.category;
        body.querySelector("button").addEventListener("click", () => {
          Cart.add(item.id, 1);
          openCart();
        });
        el.appendChild(body);

        const shade = document.createElement("div");
        shade.className = "card-shade";
        const sheen = document.createElement("div");
        sheen.className = "card-sheen";
        el.append(shade, sheen);

        track.appendChild(el);
        return { el, img, shade, off: false };
      });

      activeIdx = -1;
      measure();
      snap();
    }

    function measure() {
      const vh = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
      m.w = window.innerWidth;
      m.h = vh;
      m.vh = vh;
      m.wide = m.w >= 900;
      // Scroll distance per dish
      m.per = Math.max(1, Math.round(vh * (m.wide ? 0.6 : 0.5)));
      journey.style.height = Math.round(vh + Math.max(0, items.length - 1) * m.per) + "px";
      m.top = journey.getBoundingClientRect().top + window.scrollY;
      m.cardW = cards.length ? cards[0].el.offsetWidth : 0;
      m.heroH = heroStage ? heroStage.offsetHeight : 0;
    }

    // Scrollbar -> targets
    function read() {
      const n = items.length;
      const y = window.scrollY;
      const raw = n > 1 ? clamp((y - m.top) / m.per, 0, n - 1) : 0;
      if (resting) {
        // Scrolling has stopped: centre the nearest dish. Only the deck moves,
        // the scrollbar is left exactly where the visitor put it.
        pos.to = Math.round(raw);
      } else {
        // Linger on each dish and move quicker between them
        const i = Math.floor(raw);
        const f = raw - i;
        pos.to = i + f - (0.55 * Math.sin(2 * Math.PI * f)) / (2 * Math.PI);
      }
      // 0 while the stage is still below the fold, 1 once it has arrived
      enter.to = reduce.matches ? 1 : clamp((y - (m.top - m.vh)) / (m.vh * 0.85), 0, 1);
    }

    function setActive(idx) {
      activeIdx = idx;
      cards.forEach((c, i) => c.el.classList.toggle("is-active", i === idx));
      if (indexEl) indexEl.textContent = String(idx + 1);

      // Swap the room light once the deck settles on a dish
      clearTimeout(ambientTimer);
      ambientTimer = setTimeout(() => {
        const item = items[activeIdx];
        if (!item || !item.image || ambient.length < 2) return;
        ambientOn = 1 - ambientOn;
        ambient[ambientOn].style.backgroundImage = 'url("' + item.image + '")';
        ambient[ambientOn].classList.add("is-on");
        ambient[1 - ambientOn].classList.remove("is-on");
      }, 160);
    }

    function draw() {
      const n = cards.length;
      // "Reduce motion" keeps the 3D layout (it only moves when you scroll) and
      // drops the extras: fly-in, pointer tilt, and parallax.
      const calm = reduce.matches;
      const W = m.cardW;
      const gapNear = W * (m.wide ? 0.9 : 0.93); // centre card to its neighbour
      const gapFar = W * (m.wide ? 0.36 : 0.3); // cards fanned behind that
      const angle = m.wide ? 48 : 38;
      const depth = m.wide ? 260 : 190;
      const reach = m.wide ? 3.4 : 1.9; // how many cards out stay visible
      const intro = 1 - enter.at;

      for (let i = 0; i < n; i++) {
        const c = cards[i];
        const d = i - pos.at;
        const a = Math.abs(d);
        const off = a > reach;
        if (off !== c.off) {
          c.off = off;
          c.el.classList.toggle("is-off", off);
        }
        if (off) continue;

        const t = clamp(d, -1, 1);
        const side = Math.abs(t);
        const front = 1 - side;
        const x = t * gapNear + (d - t) * gapFar;
        const y = intro * 70;
        const z = front * 40 - side * depth - Math.max(0, a - 1) * 110 - intro * 420;
        const ry = -t * angle + front * tilt.x * 7;
        const rx = intro * 14 - front * tilt.y * 5;
        const s = 1 - side * 0.06;

        c.el.style.transform =
          "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px," + z.toFixed(1) + "px) " +
          "rotateX(" + rx.toFixed(2) + "deg) rotateY(" + ry.toFixed(2) + "deg) " +
          "scale(" + s.toFixed(3) + ")";
        c.el.style.zIndex = String(100 - Math.round(a * 10));
        c.el.style.opacity = (a > reach - 0.8 ? clamp((reach - a) / 0.8, 0, 1) : 1).toFixed(3);
        c.shade.style.opacity = (clamp(a / 1.6, 0, 1) * 0.6).toFixed(3);
        // Photo drifts against the card's travel, so the plate sits "inside" the frame
        if (c.img) {
          c.img.style.transform =
            "translate3d(" + (calm ? 0 : -t * 6).toFixed(2) + "%,0,0) scale(1.16)";
        }
      }

      const idx = n ? clamp(Math.round(pos.at), 0, n - 1) : -1;
      if (idx !== activeIdx) setActive(idx);
      if (progressEl) {
        progressEl.style.width = (n > 1 ? (pos.at / (n - 1)) * 100 : 100).toFixed(2) + "%";
      }

      if (!calm) {
        // Moving the vanishing point with the pointer lets you look around the deck
        track.style.perspectiveOrigin =
          (50 + tilt.x * 5).toFixed(2) + "% " + (42 + tilt.y * 4).toFixed(2) + "%";
        const frontCard = cards[idx];
        if (frontCard) {
          frontCard.el.style.setProperty("--mx", (50 + tilt.x * 45).toFixed(1) + "%");
          frontCard.el.style.setProperty("--my", (20 + tilt.y * 50).toFixed(1) + "%");
        }

        // Hero photo falls away slower than the page
        if (heroPhoto && m.heroH) {
          const y = Math.min(window.scrollY, m.heroH + 80);
          heroPhoto.style.transform =
            "translate3d(0," + (y * 0.28).toFixed(1) + "px,0) scale(" + (1.06 + y * 0.00022).toFixed(4) + ")";
          if (heroCopy) {
            heroCopy.style.transform = "translate3d(0," + (y * 0.14).toFixed(1) + "px,0)";
            heroCopy.style.opacity = clamp(1 - y / (m.heroH * 0.8), 0, 1).toFixed(3);
          }
        }
      }
    }

    function frame() {
      raf = 0;
      // Easing stays on even with "reduce motion": browsers turn off their own
      // smooth scrolling in that mode, so without it the deck moves in hard steps.
      const k = 0.16;
      let moving = false;
      const ease = (cur, to, eps) => {
        const d = to - cur;
        if (Math.abs(d) < eps) return to;
        moving = true;
        return cur + d * k;
      };
      pos.at = ease(pos.at, pos.to, 0.0006);
      enter.at = ease(enter.at, enter.to, 0.001);
      tilt.x = ease(tilt.x, tilt.toX, 0.002);
      tilt.y = ease(tilt.y, tilt.toY, 0.002);
      draw();
      if (moving) schedule();
    }

    function schedule() {
      if (!raf) raf = requestAnimationFrame(frame);
    }

    // Jump straight to the scrollbar's position, no easing
    function snap() {
      read();
      pos.at = pos.to;
      enter.at = enter.to;
      draw();
    }

    function current() {
      if (performance.now() - nav.time < 700) return nav.index;
      const n = items.length;
      return n > 1 ? clamp(Math.round((window.scrollY - m.top) / m.per), 0, n - 1) : 0;
    }

    function goTo(i) {
      const n = items.length;
      if (!n) return;
      const idx = clamp(i, 0, n - 1);
      nav = { index: idx, time: performance.now() };
      window.scrollTo({
        top: Math.ceil(m.top + idx * m.per),
        behavior: reduce.matches ? "auto" : "smooth",
      });
    }

    // Click a side card to bring that dish forward
    track.addEventListener("click", (event) => {
      const el = event.target.closest(".journey-card");
      if (!el) return;
      const i = Number(el.dataset.index);
      if (i !== activeIdx) goTo(i);
    });

    // Tabbing onto a side card's button brings that dish forward too
    track.addEventListener("focusin", (event) => {
      const el = event.target.closest(".journey-card");
      if (!el) return;
      const i = Number(el.dataset.index);
      if (i !== current()) goTo(i);
    });

    // Left / right step one dish. Handling them here also stops a browser text
    // cursor (Chrome caret browsing, F7) from walking through the page instead.
    document.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (document.body.classList.contains("cart-open")) return;
      const el = event.target;
      if (el && el.closest && el.closest("input, textarea, select, [contenteditable]")) return;
      event.preventDefault();
      const dir = event.key === "ArrowRight" ? 1 : -1;
      const cur = current();
      // Already on the first dish and not yet in the stage: nothing to step back to
      if (dir < 0 && cur === 0 && window.scrollY < m.top - 2) return;
      goTo(cur + dir);
    });

    if (sticky) {
      sticky.addEventListener("pointermove", (event) => {
        if (event.pointerType !== "mouse" || reduce.matches) return;
        tilt.toX = clamp((event.clientX / window.innerWidth - 0.5) * 2, -1, 1);
        tilt.toY = clamp((event.clientY / window.innerHeight - 0.5) * 2, -1, 1);
        schedule();
      });
      sticky.addEventListener("pointerleave", () => {
        tilt.toX = 0;
        tilt.toY = 0;
        schedule();
      });

      // Sideways swipe on touch steps one dish
      let touch = null;
      sticky.addEventListener(
        "touchstart",
        (event) => {
          const t = event.touches[0];
          const onPills = event.target.closest && event.target.closest(".cat-pills");
          touch = t && !onPills ? { x: t.clientX, y: t.clientY } : null;
        },
        { passive: true }
      );
      sticky.addEventListener(
        "touchend",
        (event) => {
          const t = event.changedTouches[0];
          if (!touch || !t) return;
          const dx = t.clientX - touch.x;
          const dy = t.clientY - touch.y;
          touch = null;
          if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            goTo(current() + (dx < 0 ? 1 : -1));
          }
        },
        { passive: true }
      );
    }

    window.addEventListener(
      "scroll",
      () => {
        resting = false;
        read();
        schedule();
        clearTimeout(restTimer);
        restTimer = setTimeout(() => {
          resting = true;
          read();
          schedule();
        }, 160);
      },
      { passive: true }
    );

    let resizeRaf = 0;
    function onResize(force) {
      const vh = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
      // A phone's address bar sliding away changes the height a little on every
      // scroll. Re-measuring for that would make the deck jump mid-scroll.
      if (force !== true && window.innerWidth === m.w && Math.abs(vh - m.h) < 160) return;
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        measure();
        snap();
      });
    }
    window.addEventListener("resize", onResize);
    if (window.visualViewport) window.visualViewport.addEventListener("resize", onResize);
    window.addEventListener("load", () => onResize(true));

    renderFilters();
    renderTrack();
  }

  const checkoutForm = document.getElementById("checkout-form");
  if (checkoutForm && Cart) {
    const error = checkoutForm.querySelector("[data-form-error]");
    const success = checkoutForm.querySelector("[data-form-success]");

    checkoutForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (error) {
        error.hidden = true;
        error.textContent = "";
      }
      if (success) success.hidden = true;

      const cart = Cart.read();
      if (!Cart.count(cart)) {
        if (error) {
          error.hidden = false;
          error.textContent = "Your order is empty. Add dishes from the menu first.";
        }
        return;
      }

      if (!checkoutForm.checkValidity()) {
        checkoutForm.reportValidity();
        if (error) {
          error.hidden = false;
          error.textContent = "Fill the required fields so we can cook this order.";
        }
        return;
      }

      const data = Object.fromEntries(new FormData(checkoutForm).entries());
      const payload = {
        name: data.name,
        phone: data.phone,
        email: data.email,
        notes: data.notes,
        address: data.address,
        fulfillment: data.fulfillment || "pickup",
        items: Cart.lines(cart).map((line) => ({ id: line.id, qty: line.qty })),
      };

      const submitBtn = checkoutForm.querySelector('[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(async (res) => {
          const body = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(body.error || "Order failed");
          try {
            const key = "aishas-catering-orders";
            const prev = JSON.parse(localStorage.getItem(key) || "[]");
            prev.push({ ...payload, orderId: body.orderId, placedAt: new Date().toISOString() });
            localStorage.setItem(key, JSON.stringify(prev));
          } catch (_) {}
          Cart.clear();
          checkoutForm.reset();
          if (success) {
            success.hidden = false;
            success.textContent =
              "Order received" + (body.orderId ? " · #" + String(body.orderId).slice(0, 8) : "") + ". We'll confirm by phone.";
          }
        })
        .catch((err) => {
          if (error) {
            error.hidden = false;
            error.textContent = err.message || "Could not place order. Try again.";
          }
        })
        .finally(() => {
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }
})();

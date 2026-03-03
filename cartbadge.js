/* ============================================================
   Stallion.B – Shared Cart + Badge + Navbar Toggle (One File)
   Storage key: sb_cart_v1
   Exposes: window.Cart
   ============================================================ */
(function (window, document) {
  'use strict';

  const STORAGE_KEY = 'sb_cart_v1';

  // -----------------------------
  // NAVBAR TOGGLE (your code)
  // -----------------------------
  function initNavbarToggle() {
    const bar = document.getElementById('bar');
    const close = document.getElementById('close');
    const nav = document.getElementById('navbar');

    if (bar && nav) {
      bar.addEventListener('click', () => {
        nav.classList.add('active');
      });
    }
    if (close && nav) {
      close.addEventListener('click', () => {
        nav.classList.remove('active');
      });
    }
  }

  // -----------------------------
  // Utilities
  // -----------------------------
  function load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }
  function save(cart) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    return cart;
  }
  function moneyPKR(n) {
    return 'Rs ' + Number(n || 0).toLocaleString('en-PK');
  }
  function findIndex(cart, id, variant) {
    return cart.findIndex(p => p.id === id && (p.variant || null) === (variant || null));
  }

  // -----------------------------
  // Core Cart API (global)
  // -----------------------------
  const Cart = {
    // Read-only helpers
    items() {
      return load();
    },
    count() {
      return load().reduce((s, it) => s + (Number(it.qty) || 0), 0);
    },
    subtotal() {
      return load().reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 0), 0);
    },

    // Mutations
    add(item) {
      // item: {id, title, price, image, variant?, qty?}
      if (!item || !item.id) return;
      const cart = load();
      const idx = findIndex(cart, item.id, item.variant || null);

      if (idx > -1) {
        cart[idx].qty = (Number(cart[idx].qty) || 0) + (Number(item.qty) || 1);
      } else {
        cart.push({
          id: item.id,
          title: item.title || 'Product',
          price: Number(item.price) || 0,
          image: item.image || '',
          variant: item.variant || null,
          qty: Number(item.qty) || 1
        });
      }
      save(cart);
      Cart.updateBadges();
      Cart._emit('change', cart);
    },

    remove(id, variant = null) {
      let cart = load();
      cart = cart.filter(p => !(p.id === id && (p.variant || null) === (variant || null)));
      save(cart);
      Cart.updateBadges();
      Cart._emit('change', cart);
    },

    changeQty(id, delta, variant = null) {
      const cart = load();
      const i = findIndex(cart, id, variant);
      if (i === -1) return;
      cart[i].qty = Math.max(1, (Number(cart[i].qty) || 1) + Number(delta || 0));
      save(cart);
      Cart.updateBadges();
      Cart._emit('change', cart);
    },

    setQty(id, qty, variant = null) {
      const cart = load();
      const i = findIndex(cart, id, variant);
      if (i === -1) return;
      const n = Math.max(1, Math.min(999, Number(qty) || 1));
      cart[i].qty = n;
      save(cart);
      Cart.updateBadges();
      Cart._emit('change', cart);
    },

    clear() {
      save([]);
      Cart.updateBadges();
      Cart._emit('change', []);
    },

    // -----------------------------
    // Badges
    // -----------------------------
    updateBadges() {
      const count = Cart.count();
      // update all badges on the page (desktop + mobile)
      const badges = document.querySelectorAll('.cart-badge');
      badges.forEach(badge => { badge.textContent = count; });
    },
    initBadges() {
      Cart.updateBadges();
    },

    // -----------------------------
    // Cart page renderer (call on Cart.html only)
    // -----------------------------
    renderCartPage(opts = {}) {
      const {
        itemsContainer = '#cart-items',
        emptyState = '#cart-empty',
        countEl = '#cart-count',
        subtotalTopEl = '#cart-subtotal',
        summarySubtotalEl = '#summary-subtotal',
        summaryTotalEl = '#summary-total',
        clearBtn = '#clear-cart-btn',
        checkoutBtn = '#checkout-btn'
      } = opts;

      const els = {
        items: document.querySelector(itemsContainer),
        empty: document.querySelector(emptyState),
        count: document.querySelector(countEl),
        subtotalTop: document.querySelector(subtotalTopEl),
        subtotal: document.querySelector(summarySubtotalEl),
        total: document.querySelector(summaryTotalEl),
        clearBtn: document.querySelector(clearBtn),
        checkoutBtn: document.querySelector(checkoutBtn)
      };

      function render() {
        const cart = load();

        // Counts + totals
        const count = cart.reduce((s, it) => s + (Number(it.qty) || 0), 0);
        if (els.count) els.count.textContent = count;

        const sub = Cart.subtotal();
        if (els.subtotalTop) els.subtotalTop.textContent = moneyPKR(sub);
        if (els.subtotal) els.subtotal.textContent = moneyPKR(sub);
        if (els.total) els.total.textContent = moneyPKR(sub); // add shipping/taxes if needed

        // Items/empty state
        if (els.items) els.items.innerHTML = '';
        if (!cart.length) {
          if (els.empty) els.empty.hidden = false;
          Cart.updateBadges();
          return;
        }
        if (els.empty) els.empty.hidden = true;

        // Render items
        if (els.items) {
          cart.forEach(it => {
            const row = document.createElement('div');
            row.className = 'cart-item';
            row.dataset.id = it.id;
            if (it.variant != null) row.dataset.variant = it.variant;

            row.innerHTML = `
              <img class="thumb" src="${it.image || 'Images/placeholder.png'}" alt="">
              <div class="item-info">
                <div class="item-title">${it.title}</div>
                <div class="item-meta">${it.variant || ''}</div>
              </div>
              <div class="item-actions">
                <div class="price">${moneyPKR(it.price)}</div>
                <div class="qty" aria-label="Quantity">
                  <button class="qty-minus" aria-label="Decrease">–</button>
                  <input class="qty-input" type="text" value="${it.qty}" inputmode="numeric" />
                  <button class="qty-plus" aria-label="Increase">+</button>
                </div>
                <button class="remove-item" aria-label="Remove">Remove</button>
              </div>
            `;
            els.items.appendChild(row);
          });
        }

        Cart.updateBadges();
      }

      // Delegated events for qty/remove
      document.addEventListener('click', (e) => {
        const itemEl = e.target.closest('.cart-item');
        if (!itemEl) return;
        const id = itemEl.dataset.id;
        const variant = itemEl.dataset.variant || null;

        if (e.target.matches('.qty-plus')) { Cart.changeQty(id, +1, variant); render(); }
        if (e.target.matches('.qty-minus')) { Cart.changeQty(id, -1, variant); render(); }
        if (e.target.matches('.remove-item')) { Cart.remove(id, variant); render(); }
      });

      document.addEventListener('input', (e) => {
        if (!e.target.matches('.qty-input')) return;
        const itemEl = e.target.closest('.cart-item');
        if (!itemEl) return;
        const id = itemEl.dataset.id;
        const variant = itemEl.dataset.variant || null;
        Cart.setQty(id, e.target.value, variant);
        render();
      });

      if (els.clearBtn) {
        els.clearBtn.addEventListener('click', () => { Cart.clear(); render(); });
      }
      if (els.checkoutBtn) {
        els.checkoutBtn.addEventListener('click', () => {
          alert('Proceeding to checkout… (hook your gateway here)');
        });
      }

      render();

      // Re-render if cart changes across tabs or via API
      Cart.on('change', render);
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY) render();
      });
    },

    // -----------------------------
    // Auto-hook generic "Add to cart" buttons
    // .add-to-cart + data-id data-title data-price data-image [data-variant] [data-qty]
    // -----------------------------
    autoHookAddButtons() {
      document.addEventListener('click', (e) => {
        const btn = e.target.closest('.add-to-cart');
        if (!btn) return;

        // Stop parent card navigation if any (e.g., onclick redirect)
        e.preventDefault();
        e.stopPropagation();

        const item = {
          id: btn.dataset.id,
          title: btn.dataset.title,
          price: Number(btn.dataset.price),
          image: btn.dataset.image,
          variant: btn.dataset.variant || null,
          qty: Number(btn.dataset.qty || 1)
        };
        Cart.add(item);
        try { console.log('Added to cart:', item.title || item.id); } catch {}
      });
    },

    // -----------------------------
    // Tiny event system (internal)
    // -----------------------------
    _listeners: {},
    on(evt, fn) {
      (Cart._listeners[evt] ||= []).push(fn);
    },
    _emit(evt, payload) {
      (Cart._listeners[evt] || []).forEach(fn => {
        try { fn(payload); } catch {}
      });
    },

    // -----------------------------
    // Bootstrapping for every page
    // -----------------------------
    init() {
      // Navbar toggle (your snippet)
      function readyNav() { initNavbarToggle(); }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', readyNav, { once: true });
      } else {
        readyNav();
      }

      // Badges on load
      function readyBadges() { Cart.initBadges(); }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', readyBadges, { once: true });
      } else {
        readyBadges();
      }

      // Sync badges across tabs
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY) Cart.updateBadges();
      });

      // Hook add-to-cart buttons globally
      Cart.autoHookAddButtons();
    }
  };

  // Expose globally
  window.Cart = Cart;

  // Auto-init
  Cart.init();

})(window, document);
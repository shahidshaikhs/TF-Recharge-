import { Component } from '@theme/component';

const RECHARGE_TOKEN = 'strfnt_472024372209ef3edd01aa9f01631acc8ea24024a9d41e00f2e2ce524de076ba';

/**
 * @typedef {Object} BundleSelection
 * @property {string} externalProductId
 * @property {string} externalVariantId
 * @property {string} collectionId
 * @property {number} quantity
 * @property {string} title
 * @property {string} image
 * @property {string} variantTitle
 * @property {number} price
 */

class BundleBuilderSection extends Component {
  /** @type {Object|null} */
  bundle = null;
  /** @type {Object|null} */
  selectedVariant = null;
  /** @type {BundleSelection[]} */
  selections = [];
  /** @type {string|null} */
  activeCollectionId = null;
  /** @type {string} */
  frequencyMode = 'onetime';
  /** @type {Object|null} */
  selectedSellingPlan = null;
  /** @type {boolean} */
  isAddingToCart = false;
  /** @type {string} */
  pricingType = 'FIXED';

  connectedCallback() {
    super.connectedCallback();
    this.productId = this.dataset.productId;
    this.productHandle = this.dataset.productHandle;
    this.headingText = this.dataset.headingText || 'Build Your Box';
    this.columnsDesktop = parseInt(this.dataset.columnsDesktop, 10) || 4;
    this.columnsMobile = parseInt(this.dataset.columnsMobile, 10) || 2;
    this.initRecharge();
  }

  async initRecharge() {
    try {
      await this.ensureSDK();
      window.recharge.init({
        storeIdentifier: Shopify.shop,
        storefrontAccessToken: RECHARGE_TOKEN,
        appName: 'bundle-builder',
        appVersion: '1.0.0',
      });

      const bundle = await window.recharge.bundleData.loadBundleData(
        Number(this.productId),
        { source: 'online_store', country_code: Shopify?.country || 'US' }
      );

      if (!bundle || !bundle.id) {
        this.renderError('Could not load bundle data. Please check your bundle configuration.');
        return;
      }

      console.log(bundle);
      this.bundle = bundle;
      this.pricingType = (bundle.bundle_settings?.price_rule || 'FIXED').toUpperCase();

      if (bundle.variants && bundle.variants.length > 0) {
        this.selectedVariant = bundle.variants[0];
      }

      this.render();
    } catch (error) {
      console.error('Bundle builder init error:', error);
      this.renderError('Failed to initialize the bundle builder. Please try again later.');
    }
  }

  async ensureSDK() {
    if (window.recharge && window.recharge.bundleData && typeof window.recharge.bundleData.loadBundleData === 'function') {
      return;
    }
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const check = () => {
        if (window.recharge && window.recharge.bundleData && typeof window.recharge.bundleData.loadBundleData === 'function') {
          resolve();
        } else if (attempts > 50) {
          reject(new Error('Recharge SDK not available'));
        } else {
          attempts++;
          setTimeout(check, 200);
        }
      };
      check();
    });
  }

  renderError(message) {
    const container = this.refs.mainContent;
    if (container) {
      container.innerHTML = `<div class="bundle-builder__error"><p>${message}</p></div>`;
    }
  }

  /**
   * Format a price value — handles both cents (integers > 100) and dollar values.
   * @param {number} price
   * @returns {string}
   */
  formatPrice(price) {
    if (price == null) return '$0.00';
    const dollars = Number.isInteger(price) && price > 100 ? price / 100 : price;
    return `$${dollars.toFixed(2)}`;
  }

  getItemCount() {
    if (!this.selectedVariant) return 0;
    const ranges = this.selectedVariant.ranges;
    if (Array.isArray(ranges) && ranges.length > 0) {
      return ranges[0].max || 0;
    }
    return 0;
  }

  getTotalSelectedQty() {
    let total = 0;
    for (const s of this.selections) {
      total += s.quantity;
    }
    return total;
  }

  getCollectionConstraints(collectionId) {
    if (!this.selectedVariant || !Array.isArray(this.selectedVariant.collections)) {
      return { min: 0, max: null };
    }
    const match = this.selectedVariant.collections.find(c => String(c.id) === String(collectionId));
    return match || { min: 0, max: null };
  }

  getCollectionSelectedQty(collectionId) {
    let qty = 0;
    for (const s of this.selections) {
      if (String(s.collectionId) === String(collectionId)) {
        qty += s.quantity;
      }
    }
    return qty;
  }

  getSubtotal() {
    if (this.pricingType === 'FIXED') {
      if (!this.selectedVariant) return 0;
      if (this.frequencyMode === 'subscribe' && this.selectedSellingPlan) {
        return this.selectedSellingPlan.price || this.selectedVariant.price || 0;
      }
      return this.selectedVariant.price || 0;
    }
    let total = 0;
    for (const s of this.selections) {
      total += s.price * s.quantity;
    }
    return total;
  }

  render() {
    if (!this.bundle) return;
    this.renderHeading();
    this.renderCollectionTabs();
    this.renderProductGrid();
    this.renderSizeSelector();
    this.renderFrequencySelector();
    this.renderProgress();
    this.renderSelections();
    this.renderSubtotal();
    this.renderAddToCart();
  }

  renderHeading() {
    const el = this.refs.heading;
    if (!el) return;
    const itemCount = this.getItemCount();
    const headingStr = itemCount > 0 ? `${this.headingText} — Choose ${itemCount} Items` : this.headingText;
    el.textContent = headingStr;
  }

  renderCollectionTabs() {
    const container = this.refs.collectionTabs;
    if (!container || !this.bundle.collections) return;

    const collectionIds = Object.keys(this.bundle.collections);
    if (collectionIds.length === 0) return;

    if (!this.activeCollectionId) {
      this.activeCollectionId = collectionIds[0];
    }

    let html = '';
    for (const id of collectionIds) {
      const col = this.bundle.collections[id];
      const isActive = String(id) === String(this.activeCollectionId);
      html += `<button
        class="bundle-builder__tab${isActive ? ' bundle-builder__tab--active' : ''}"
        data-collection-id="${id}"
        on:click="/handleTabClick/${id}"
        type="button"
      >${col.title || 'Collection'}</button>`;
    }
    container.innerHTML = html;
  }

  handleTabClick(event, collectionId) {
    this.activeCollectionId = collectionId;
    this.renderCollectionTabs();
    this.renderProductGrid();
  }

  renderProductGrid() {
    const container = this.refs.productGrid;
    if (!container || !this.bundle.collections) return;

    const collection = this.bundle.collections[this.activeCollectionId];
    if (!collection || !collection.products) {
      container.innerHTML = '<p class="bundle-builder__empty">No products available in this collection.</p>';
      return;
    }

    let html = '';
    for (const product of collection.products) {
      const variant = product.variants && product.variants.length > 0 ? product.variants[0] : null;
      const variantId = variant ? variant.id || variant.external_variant_id || variant.shopify_variant_id : '';
      const productId = product.id || product.external_product_id || product.shopify_product_id;
      const imgSrc = product.image?.src || product.image || product.images?.[0]?.src || '';
      const title = product.title || '';
      const variantTitle = variant ? (variant.title || '') : '';
      const price = variant ? (variant.price || product.price || 0) : (product.price || 0);
      const existingSel = this.findSelection(String(productId), String(variantId));
      const currentQty = existingSel ? existingSel.quantity : 0;

      html += `<div class="bundle-builder__product-card" data-product-id="${productId}" data-variant-id="${variantId}">
        <div class="bundle-builder__product-image-wrap">
          ${imgSrc ? `<img class="bundle-builder__product-image" src="${imgSrc}" alt="${title}" loading="lazy">` : '<div class="bundle-builder__product-image-placeholder"></div>'}
          <button class="bundle-builder__quick-view-btn" type="button"
            on:click="/handleQuickView"
            data-product-id="${productId}"
            data-variant-id="${variantId}"
            data-title="${title}"
            data-image="${imgSrc}"
            data-variant-title="${variantTitle}"
            data-price="${price}"
            data-handle="${product.handle || ''}"
          >Quick view</button>
        </div>
        <div class="bundle-builder__product-info">
          <h3 class="bundle-builder__product-title">${title}</h3>
          ${variantTitle && variantTitle !== 'Default Title' ? `<p class="bundle-builder__product-variant">${variantTitle}</p>` : ''}
          <p class="bundle-builder__product-price">${this.formatPrice(price)}</p>
        </div>
        <div class="bundle-builder__product-actions">
          ${currentQty === 0
            ? `<button class="button bundle-builder__add-btn" type="button"
                on:click="/handleAddProduct"
                data-product-id="${productId}"
                data-variant-id="${variantId}"
                data-collection-id="${this.activeCollectionId}"
                data-title="${title}"
                data-image="${imgSrc}"
                data-variant-title="${variantTitle}"
                data-price="${price}"
              >+ Add to Bundle</button>`
            : `<div class="bundle-builder__stepper">
                <button class="bundle-builder__stepper-btn" type="button"
                  on:click="/handleDecrement"
                  data-product-id="${productId}"
                  data-variant-id="${variantId}"
                  aria-label="Decrease quantity"
                >&minus;</button>
                <span class="bundle-builder__stepper-qty">${currentQty}</span>
                <button class="bundle-builder__stepper-btn" type="button"
                  on:click="/handleIncrement"
                  data-product-id="${productId}"
                  data-variant-id="${variantId}"
                  data-collection-id="${this.activeCollectionId}"
                  data-title="${title}"
                  data-image="${imgSrc}"
                  data-variant-title="${variantTitle}"
                  data-price="${price}"
                  aria-label="Increase quantity"
                >+</button>
              </div>`
          }
        </div>
      </div>`;
    }
    container.innerHTML = html;
    container.style.setProperty('--columns-desktop', this.columnsDesktop);
    container.style.setProperty('--columns-mobile', this.columnsMobile);
  }

  findSelection(productId, variantId) {
    return this.selections.find(
      s => String(s.externalProductId) === String(productId) && String(s.externalVariantId) === String(variantId)
    );
  }

  canAddMore(collectionId) {
    const itemCount = this.getItemCount();
    const totalQty = this.getTotalSelectedQty();
    if (totalQty >= itemCount) return false;

    const constraints = this.getCollectionConstraints(collectionId);
    if (constraints.max !== null && constraints.max !== undefined) {
      const colQty = this.getCollectionSelectedQty(collectionId);
      if (colQty >= constraints.max) return false;
    }
    return true;
  }

  handleAddProduct(event) {
    const btn = event.target;
    const productId = btn.dataset.productId;
    const variantId = btn.dataset.variantId;
    const collectionId = btn.dataset.collectionId;
    const title = btn.dataset.title;
    const image = btn.dataset.image;
    const variantTitle = btn.dataset.variantTitle;
    const price = parseFloat(btn.dataset.price) || 0;

    if (!this.canAddMore(collectionId)) return;

    this.selections.push({
      externalProductId: productId,
      externalVariantId: variantId,
      collectionId,
      quantity: 1,
      title,
      image,
      variantTitle,
      price,
    });

    this.updateAfterSelectionChange();
  }

  handleIncrement(event) {
    const btn = event.target;
    const productId = btn.dataset.productId;
    const variantId = btn.dataset.variantId;
    const collectionId = btn.dataset.collectionId;

    if (!this.canAddMore(collectionId)) return;

    const sel = this.findSelection(productId, variantId);
    if (sel) {
      sel.quantity += 1;
    } else {
      this.selections.push({
        externalProductId: productId,
        externalVariantId: variantId,
        collectionId: collectionId || this.activeCollectionId,
        quantity: 1,
        title: btn.dataset.title || '',
        image: btn.dataset.image || '',
        variantTitle: btn.dataset.variantTitle || '',
        price: parseFloat(btn.dataset.price) || 0,
      });
    }
    this.updateAfterSelectionChange();
  }

  handleDecrement(event) {
    const btn = event.target;
    const productId = btn.dataset.productId;
    const variantId = btn.dataset.variantId;

    const idx = this.selections.findIndex(
      s => String(s.externalProductId) === String(productId) && String(s.externalVariantId) === String(variantId)
    );
    if (idx === -1) return;

    this.selections[idx].quantity -= 1;
    if (this.selections[idx].quantity <= 0) {
      this.selections.splice(idx, 1);
    }
    this.updateAfterSelectionChange();
  }

  handleRemoveSelection(event) {
    const btn = event.target;
    const productId = btn.dataset.productId;
    const variantId = btn.dataset.variantId;

    const idx = this.selections.findIndex(
      s => String(s.externalProductId) === String(productId) && String(s.externalVariantId) === String(variantId)
    );
    if (idx !== -1) {
      this.selections.splice(idx, 1);
    }
    this.updateAfterSelectionChange();
  }

  updateAfterSelectionChange() {
    this.syncSelectionsToBundle();
    this.renderProductGrid();
    this.renderProgress();
    this.renderSelections();
    this.renderSubtotal();
    this.renderAddToCart();
  }

  syncSelectionsToBundle() {
    if (!this.selectedVariant) return;
    this.selectedVariant.selections = this.selections.map(s => ({
      collectionId: s.collectionId,
      externalProductId: s.externalProductId,
      externalVariantId: s.externalVariantId,
      quantity: s.quantity,
    }));
  }

  renderSizeSelector() {
    const container = this.refs.sizeSelector;
    if (!container || !this.bundle.variants) return;

    let html = '<h4 class="bundle-builder__rail-title">Box Size</h4>';
    for (const variant of this.bundle.variants) {
      const isSelected = this.selectedVariant && String(this.selectedVariant.id) === String(variant.id);
      const itemCount = Array.isArray(variant.ranges) && variant.ranges.length > 0 ? variant.ranges[0].max : 0;
      const price = variant.price || 0;
      const title = variant.title || `${itemCount} Items`;
      const description = variant.description || '';

      html += `<button
        class="bundle-builder__size-card${isSelected ? ' bundle-builder__size-card--selected' : ''}"
        type="button"
        on:click="/handleSizeSelect"
        data-variant-id="${variant.id}"
      >
        <div class="bundle-builder__size-card-info">
          <span class="bundle-builder__size-card-title">${title}</span>
          ${description ? `<span class="bundle-builder__size-card-desc">${description}</span>` : ''}
        </div>
        <div class="bundle-builder__size-card-meta">
          ${this.pricingType === 'FIXED' ? `<span class="bundle-builder__size-card-price">${this.formatPrice(price)}</span>` : ''}
          <span class="bundle-builder__size-card-count">${itemCount} items</span>
        </div>
      </button>`;
    }
    container.innerHTML = html;
  }

  handleSizeSelect(event) {
    const btn = event.target;
    const variantId = btn.dataset.variantId;
    this.selectedVariant = this.bundle.variants.find(v => String(v.id) === String(variantId)) || this.selectedVariant;
    this.selections = [];
    this.updateAfterSelectionChange();
    this.renderSizeSelector();
    this.renderHeading();
    this.renderFrequencySelector();
  }

  renderFrequencySelector() {
    const container = this.refs.frequencySelector;
    if (!container || !this.selectedVariant) return;

    const allocations = this.selectedVariant.selling_plan_allocations || [];

    let html = '<h4 class="bundle-builder__rail-title">Frequency</h4>';
    html += '<div class="bundle-builder__frequency">';

    html += `<button
      class="bundle-builder__freq-option${this.frequencyMode === 'onetime' ? ' bundle-builder__freq-option--selected' : ''}"
      type="button"
      on:click="/handleFrequencyChange/onetime"
    >
      <span class="bundle-builder__freq-radio${this.frequencyMode === 'onetime' ? ' bundle-builder__freq-radio--checked' : ''}"></span>
      <span>One-time Purchase</span>
      <span class="bundle-builder__freq-price">${this.formatPrice(this.selectedVariant.price || 0)}</span>
    </button>`;

    if (allocations.length > 0) {
      const firstAlloc = allocations[0];
      const basePrice = this.selectedVariant.price || 0;
      const subscribePrice = firstAlloc.price || basePrice;
      const adjustments = firstAlloc.selling_plan?.price_adjustments || [];
      let discountPct = 0;
      if (adjustments.length > 0 && adjustments[0].value) {
        discountPct = adjustments[0].value;
      } else if (basePrice > 0 && subscribePrice < basePrice) {
        const normalizedBase = Number.isInteger(basePrice) && basePrice > 100 ? basePrice / 100 : basePrice;
        const normalizedSub = Number.isInteger(subscribePrice) && subscribePrice > 100 ? subscribePrice / 100 : subscribePrice;
        discountPct = Math.round(((normalizedBase - normalizedSub) / normalizedBase) * 100);
      }

      html += `<button
        class="bundle-builder__freq-option${this.frequencyMode === 'subscribe' ? ' bundle-builder__freq-option--selected' : ''}"
        type="button"
        on:click="/handleFrequencyChange/subscribe"
      >
        <span class="bundle-builder__freq-radio${this.frequencyMode === 'subscribe' ? ' bundle-builder__freq-radio--checked' : ''}"></span>
        <span>Subscribe & Save${discountPct > 0 ? ` ${discountPct}%` : ''}</span>
        <span class="bundle-builder__freq-price">
          ${basePrice !== subscribePrice ? `<s>${this.formatPrice(basePrice)}</s> ` : ''}${this.formatPrice(subscribePrice)}
        </span>
      </button>`;

      if (this.frequencyMode === 'subscribe') {
        html += '<div class="bundle-builder__freq-intervals">';
        html += '<span class="bundle-builder__freq-intervals-label">Delivered every</span>';
        html += '<div class="bundle-builder__freq-pills">';
        for (const alloc of allocations) {
          const plan = alloc.selling_plan || {};
          const isSelected = this.selectedSellingPlan && String(this.selectedSellingPlan.id) === String(plan.id);
          const name = plan.name || plan.title || 'Plan';
          html += `<button
            class="bundle-builder__freq-pill${isSelected ? ' bundle-builder__freq-pill--selected' : ''}"
            type="button"
            on:click="/handlePlanSelect"
            data-plan-index="${allocations.indexOf(alloc)}"
          >${name}</button>`;
        }
        html += '</div></div>';
      }
    }
    html += '</div>';
    container.innerHTML = html;
  }

  handleFrequencyChange(event, mode) {
    this.frequencyMode = mode;
    if (mode === 'subscribe' && this.selectedVariant) {
      const allocations = this.selectedVariant.selling_plan_allocations || [];
      if (allocations.length > 0) {
        this.selectedSellingPlan = allocations[0].selling_plan || null;
      }
    } else {
      this.selectedSellingPlan = null;
    }
    this.renderFrequencySelector();
    this.renderSubtotal();
    this.renderAddToCart();
  }

  handlePlanSelect(event) {
    const idx = parseInt(event.target.dataset.planIndex, 10);
    const allocations = this.selectedVariant?.selling_plan_allocations || [];
    if (allocations[idx]) {
      this.selectedSellingPlan = allocations[idx].selling_plan || null;
    }
    this.renderFrequencySelector();
    this.renderSubtotal();
  }

  renderProgress() {
    const container = this.refs.progress;
    if (!container) return;

    const itemCount = this.getItemCount();
    const totalQty = this.getTotalSelectedQty();
    const remaining = Math.max(0, itemCount - totalQty);
    const pct = itemCount > 0 ? Math.min(100, (totalQty / itemCount) * 100) : 0;

    let html = '<h4 class="bundle-builder__rail-title">Progress</h4>';
    html += `<div class="bundle-builder__progress">
      <div class="bundle-builder__progress-bar">
        <div class="bundle-builder__progress-fill" style="width: ${pct}%"></div>
      </div>
      <p class="bundle-builder__progress-text">${
        remaining > 0
          ? `Add ${remaining} more item${remaining !== 1 ? 's' : ''}`
          : 'Box is full!'
      }</p>
      <p class="bundle-builder__progress-count">${totalQty} / ${itemCount}</p>
    </div>`;
    container.innerHTML = html;
  }

  renderSelections() {
    const container = this.refs.selectionsList;
    if (!container) return;

    let html = '<h4 class="bundle-builder__rail-title">Your Selections</h4>';
    if (this.selections.length === 0) {
      html += '<p class="bundle-builder__empty-selections">No items selected yet.</p>';
    } else {
      html += '<div class="bundle-builder__selections">';
      for (const sel of this.selections) {
        html += `<div class="bundle-builder__selection-item">
          ${sel.image ? `<img class="bundle-builder__selection-thumb" src="${sel.image}" alt="${sel.title}" loading="lazy">` : '<div class="bundle-builder__selection-thumb-placeholder"></div>'}
          <div class="bundle-builder__selection-info">
            <span class="bundle-builder__selection-name">${sel.title}</span>
            <span class="bundle-builder__selection-qty">Qty: ${sel.quantity}</span>
          </div>
          <button class="bundle-builder__selection-remove" type="button"
            on:click="/handleRemoveSelection"
            data-product-id="${sel.externalProductId}"
            data-variant-id="${sel.externalVariantId}"
            aria-label="Remove ${sel.title}"
          >Remove</button>
        </div>`;
      }
      html += '</div>';
    }
    container.innerHTML = html;
  }

  renderSubtotal() {
    const container = this.refs.subtotal;
    if (!container) return;

    const subtotal = this.getSubtotal();
    container.innerHTML = `<div class="bundle-builder__subtotal">
      <span class="bundle-builder__subtotal-label">Subtotal</span>
      <span class="bundle-builder__subtotal-value">${this.formatPrice(subtotal)}</span>
    </div>`;
  }

  renderAddToCart() {
    const container = this.refs.addToCartWrap;
    if (!container) return;

    const itemCount = this.getItemCount();
    const totalQty = this.getTotalSelectedQty();
    const isFull = totalQty >= itemCount && itemCount > 0;

    container.innerHTML = `<button
      class="button bundle-builder__add-to-cart"
      type="button"
      on:click="/handleAddToCart"
      ${!isFull || this.isAddingToCart ? 'disabled' : ''}
    >${this.isAddingToCart ? 'Adding...' : 'Add to Cart'}</button>`;
  }

  async handleAddToCart() {
    if (this.isAddingToCart) return;
    this.isAddingToCart = true;
    this.renderAddToCart();

    try {
      this.syncSelectionsToBundle();

      if (this.pricingType === 'FIXED') {
        const validation = await window.recharge.bundle.validateBundle(this.bundle);
        if (validation !== true) {
          console.error('Bundle validation failed:', validation);
          alert(typeof validation === 'string' ? validation : 'Bundle validation failed. Please check your selections.');
          this.isAddingToCart = false;
          this.renderAddToCart();
          return;
        }

        const rbId = await window.recharge.bundle.getBundleId(this.bundle);
        const properties = { _rb_id: rbId };

        const body = {
          id: this.selectedVariant.shopify_variant_id || this.selectedVariant.external_variant_id || this.selectedVariant.id,
          quantity: 1,
          properties,
        };

        if (this.frequencyMode === 'subscribe' && this.selectedSellingPlan) {
          body.selling_plan = this.selectedSellingPlan.id;
        }

        const response = await fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.description || 'Failed to add to cart');
        }
      } else {
        const validation = await window.recharge.bundle.validateDynamicBundle(this.bundle);
        if (validation !== true) {
          console.error('Dynamic bundle validation failed:', validation);
          alert(typeof validation === 'string' ? validation : 'Bundle validation failed. Please check your selections.');
          this.isAddingToCart = false;
          this.renderAddToCart();
          return;
        }

        const items = window.recharge.bundle.getDynamicBundleItems(this.bundle, this.productHandle);

        const response = await fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.description || 'Failed to add to cart');
        }
      }

      this.dispatchEvent(new CustomEvent('cart:updated', { bubbles: true }));
      this.selections = [];
      this.updateAfterSelectionChange();
      this.renderHeading();

    } catch (error) {
      console.error('Add to cart error:', error);
      alert(error.message || 'Something went wrong. Please try again.');
    } finally {
      this.isAddingToCart = false;
      this.renderAddToCart();
    }
  }

  handleQuickView(event) {
    const btn = event.target;
    const drawer = this.refs.quickViewDrawer;
    if (!drawer) return;

    const title = btn.dataset.title || '';
    const image = btn.dataset.image || '';
    const variantTitle = btn.dataset.variantTitle || '';
    const price = btn.dataset.price || '0';
    const handle = btn.dataset.handle || '';
    const productId = btn.dataset.productId || '';
    const variantId = btn.dataset.variantId || '';

    const existingSel = this.findSelection(productId, variantId);
    const currentQty = existingSel ? existingSel.quantity : 0;

    let html = `<div class="bundle-builder__quick-view-overlay" on:click="/handleCloseQuickView"></div>
    <div class="bundle-builder__quick-view-panel">
      <button class="bundle-builder__quick-view-close" type="button" on:click="/handleCloseQuickView" aria-label="Close quick view">&times;</button>
      ${image ? `<img class="bundle-builder__quick-view-image" src="${image}" alt="${title}" loading="lazy">` : ''}
      <div class="bundle-builder__quick-view-details">
        <h3 class="bundle-builder__quick-view-title">${title}</h3>
        ${variantTitle && variantTitle !== 'Default Title' ? `<p class="bundle-builder__quick-view-variant">${variantTitle}</p>` : ''}
        <p class="bundle-builder__quick-view-price">${this.formatPrice(parseFloat(price))}</p>
        <div class="bundle-builder__quick-view-actions">
          <div class="bundle-builder__stepper">
            <button class="bundle-builder__stepper-btn" type="button"
              on:click="/handleDecrement"
              data-product-id="${productId}"
              data-variant-id="${variantId}"
              aria-label="Decrease quantity"
            >&minus;</button>
            <span class="bundle-builder__stepper-qty">${currentQty}</span>
            <button class="bundle-builder__stepper-btn" type="button"
              on:click="/handleIncrement"
              data-product-id="${productId}"
              data-variant-id="${variantId}"
              data-collection-id="${this.activeCollectionId}"
              data-title="${title}"
              data-image="${image}"
              data-variant-title="${variantTitle}"
              data-price="${price}"
              aria-label="Increase quantity"
            >+</button>
          </div>
        </div>
        ${handle ? `<a class="bundle-builder__quick-view-pdp" href="/products/${handle}">View full details</a>` : ''}
      </div>
    </div>`;

    drawer.innerHTML = html;
    drawer.classList.add('bundle-builder__quick-view-drawer--open');
  }

  handleCloseQuickView() {
    const drawer = this.refs.quickViewDrawer;
    if (!drawer) return;
    drawer.classList.remove('bundle-builder__quick-view-drawer--open');
    drawer.innerHTML = '';
  }
}

customElements.define('bundle-builder-section', BundleBuilderSection);

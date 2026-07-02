/**
 * "Did you know" custom_extension widget for the Recharge Affinity portal sidebar.
 *
 * Reads metaobject data from a JSON bridge (`#cf-did-you-know-data`) injected by
 * `snippets/affinity-extensions.liquid` and renders a horizontal image+text card
 * with eyebrow, headline, and learn-more link.
 *
 * IMPORTANT: This module `export default`s the class — it MUST NOT call
 * `customElements.define()`. Recharge handles registration using the merchant-
 * configured tag_name in the view builder.
 *
 * Merchant setup:
 * 1. Upload this file to Shopify Content → Files
 * 2. Recharge admin → view builder → Sidebar region → add Custom widget
 *    tag_name: e.g. "cf-did-you-know", remote_url: Files CDN link,
 *    is_published: true, section_show_inside_card: false
 * 3. Position below cf-tracker-widget in Sidebar ordering
 * 4. Ensure at least one `did_you_know_upcoming_orders` metaobject entry exists
 */

class CfDidYouKnowWidget extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    const dataEl = document.getElementById('cf-did-you-know-data');
    if (!dataEl) return;

    let data;
    try {
      data = JSON.parse(dataEl.textContent);
    } catch (e) {
      return;
    }

    if (!data || (!data.eyebrow && !data.heading && !data.image)) return;

    this.render(data);
  }

  render(data) {
    const linkHref = data.link_url || '#';
    const linkLabel = data.link_label || 'Learn more';
    const eyebrow = data.eyebrow || '';
    const heading = data.heading || '';
    const imageUrl = data.image || '';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          margin-block-start: 32px;
          font-family: inherit;
        }

        *,
        *::before,
        *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        .card {
          border-radius: 8px;
          overflow: hidden;
          background-color: #E6F0F8;
          display: flex;
          flex-direction: row;
        }

        /* --- Media container --- */
        .card__media {
          flex: 0 0 358px;
          overflow: hidden;
        }

        .card__image {
          display: block;
          width: 100%;
          height: 100%;
          aspect-ratio: 358 / 201;
          object-fit: cover;
        }

        /* --- Text lockup --- */
        .card__text {
          display: flex;
          flex-direction: column;
          gap: 8px;
          justify-content: space-between;
          padding: 12px 16px 16px 16px;
          flex: 1;
          min-width: 0;
          align-self: stretch;
        }

        .card__heading {
          display: flex;
          flex-direction: row;
          gap: 8px;
        }

        .card__heading-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
          justify-content: flex-end;
          padding-top: 8px;
        }

        .card__eyebrow {
          font-family: var(--font-subheading--family, 'FT System Mono', monospace);
          font-weight: 400;
          font-size: 14px;
          line-height: 20px;
          letter-spacing: 0.56px;
          text-transform: uppercase;
          color: #202635;
        }

        .card__headline {
          font-family: var(--font-heading--family, 'FT System', sans-serif);
          font-weight: 400;
          font-size: 16px;
          line-height: 22px;
          color: #202635;
          white-space: pre-line;
        }

        .card__link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          width: fit-content;
          padding-bottom: 4px;
          border-bottom: 1px solid #202635;
          text-decoration: none;
          color: #202635;
          font-family: var(--font-heading--family, 'FT System', sans-serif);
          font-weight: 400;
          font-size: 14px;
          line-height: 20px;
        }

        .card__link:hover {
          opacity: 0.7;
        }

        .card__link-arrow {
          font-family: var(--font-body--family, Inter, sans-serif);
          font-weight: 500;
          font-size: 11px;
          line-height: 13px;
        }
      </style>

      <div class="card">
        ${imageUrl ? `
          <div class="card__media">
            <img
              class="card__image"
              src="${this.escapeHtml(imageUrl)}"
              alt="${this.escapeHtml(eyebrow || heading || 'Did you know')}"
              loading="lazy"
            >
          </div>
        ` : ''}

        <div class="card__text">
          <div class="card__heading">
            <div class="card__heading-group">
              ${eyebrow ? `<span class="card__eyebrow">${this.escapeHtml(eyebrow)}</span>` : ''}
              ${heading ? `<p class="card__headline">${this.escapeHtml(heading)}</p>` : ''}
            </div>
          </div>

          ${data.link_url || data.link_label ? `
            <a class="card__link" href="${this.escapeHtml(linkHref)}">
              <span>${this.escapeHtml(linkLabel)}</span>
              <span class="card__link-arrow">\u2192</span>
            </a>
          ` : ''}
        </div>
      </div>
    `;
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

export default CfDidYouKnowWidget;

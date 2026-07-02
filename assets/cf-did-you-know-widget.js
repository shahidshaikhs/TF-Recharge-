/**
 * "Did you know" custom_extension widget for the Recharge Affinity portal sidebar.
 *
 * Reads metaobject data from a JSON bridge (`#cf-did-you-know-data`) injected by
 * `snippets/affinity-extensions.liquid` and renders a card with image, decorative
 * video controls overlay, eyebrow, headline, and learn-more link.
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
          flex-direction: column;
        }

        /* --- Media container --- */
        .card__media {
          position: relative;
          width: 100%;
        }

        .card__image {
          display: block;
          width: 100%;
          aspect-ratio: 358 / 201;
          object-fit: cover;
        }

        /* --- Decorative video controls overlay --- */
        .card__controls {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 12px;
          padding: 8px 12px;
          background: rgba(0, 0, 0, 0.4);
        }

        .controls__play {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 14px;
          height: 28px;
          flex-shrink: 0;
        }

        .controls__play-triangle {
          display: block;
          width: 0;
          height: 0;
          border-style: solid;
          border-width: 7px 0 7px 12px;
          border-color: transparent transparent transparent #FFFFFF;
        }

        .controls__progress {
          width: 150px;
          height: 4px;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.35);
          overflow: hidden;
          flex-shrink: 0;
        }

        .controls__progress-fill {
          width: 40%;
          height: 100%;
          background: #FFFFFF;
          border-radius: 2px;
        }

        .controls__timestamp {
          font-family: var(--font-body--family, Inter, sans-serif);
          font-weight: 500;
          font-size: 12px;
          line-height: 15px;
          color: #FFFFFF;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .controls__icon-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 28px;
          flex-shrink: 0;
          color: #FFFFFF;
        }

        .controls__icon-btn svg {
          display: block;
          fill: #FFFFFF;
        }

        .controls__cc {
          font-family: var(--font-body--family, Inter, sans-serif);
          font-weight: 700;
          font-size: 14px;
          line-height: 17px;
          color: #FFFFFF;
          flex-shrink: 0;
        }

        /* --- Text lockup --- */
        .card__text {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 12px 16px 16px 16px;
        }

        .card__heading-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding-top: 8px;
        }

        .card__eyebrow {
          font-family: var(--font-body--family, Inter, sans-serif);
          font-weight: 400;
          font-size: 10px;
          line-height: 14px;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          color: #202635;
        }

        .card__headline {
          font-family: var(--font-body--family, Inter, sans-serif);
          font-weight: 400;
          font-size: 14px;
          line-height: 20px;
          letter-spacing: -0.14px;
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
          font-family: var(--font-body--family, Inter, sans-serif);
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
            <div class="card__controls" aria-hidden="true">
              <div class="controls__play">
                <span class="controls__play-triangle"></span>
              </div>
              <div class="controls__progress">
                <div class="controls__progress-fill"></div>
              </div>
              <span class="controls__timestamp">0:32 / 2:10</span>
              <div class="controls__icon-btn" style="width: 14px;">
                <svg width="14" height="14" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M0 4.5v5h3.5L7 13V1L3.5 4.5H0zm10.5 2.5c0-1.4-.8-2.6-2-3.2v6.4c1.2-.6 2-1.8 2-3.2zM9 0v1.5c2.3.7 4 2.8 4 5.5s-1.7 4.8-4 5.5V14c3.1-.8 5.5-3.6 5.5-7S12.1.8 9 0z"/>
                </svg>
              </div>
              <span class="controls__cc">CC</span>
              <div class="controls__icon-btn" style="width: 12px;">
                <svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M1.5 4.5V0H0v6h6V4.5H1.5zM10.5 7.5V12H12V6H6v1.5h4.5z"/>
                </svg>
              </div>
            </div>
          </div>
        ` : ''}

        <div class="card__text">
          <div class="card__heading-group">
            ${eyebrow ? `<span class="card__eyebrow">${this.escapeHtml(eyebrow)}</span>` : ''}
            ${heading ? `<p class="card__headline">${this.escapeHtml(heading)}</p>` : ''}
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

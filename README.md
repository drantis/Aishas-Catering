# Aisha's Catering

Ordering site for a halal catering kitchen. The menu is the home page: swipe through the dishes, add what you need, and check out for pickup or delivery.

**Repo:** https://github.com/drantis/Aishas-Catering

**Preview (GitHub Pages):** https://drantis.github.io/Aishas-Catering/
The preview is static, so the menu and order drawer work but checkout cannot send an order there. Checkout needs the Vercel deployment, which runs the API.

## Stack

- Frontend: HTML, CSS and vanilla JavaScript. No build step.
- Backend: Vercel serverless functions (`/api/menu`, `/api/orders`)
- Order state: browser `localStorage` until checkout

## How it is put together

| File | Purpose |
|---|---|
| `menu-data.js` | The whole menu, plus the business phone, email and service area. The site and the API both read it. |
| `index.html` | Menu page: horizontal dish carousel, order drawer, order bar |
| `checkout.html` | Order summary and customer details |
| `main.js` | Carousel, order drawer and checkout behaviour |
| `cart.js` | Order storage |
| `api/orders.js` | Validates an order against the menu and prices it server side |
| `api/menu.js` | Menu as JSON |
| `menu.html` | Redirects to the home page so older links keep working |

## Editing the menu

Open `menu-data.js`. Each dish has a name, description, serving size, price and photo. Fill in `business.phone`, `business.email` and `business.area` to show them in the footer. Empty fields stay hidden.

## Run locally

```bash
npx serve .
```

Checkout needs the API, so use `vercel dev` to test an order end to end.

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/menu` | Menu JSON |
| POST | `/api/orders` | Place an order |

## Before taking real orders

- **Order delivery is not wired up.** `/api/orders` validates and prices an order, then writes it to the function log. It does not notify anyone. Connect email, SMS or WhatsApp in `api/orders.js` first.
- Prices and serving sizes in `menu-data.js` are placeholders.
- Photos are stock images (see `images/SOURCES.md`).
- Online payment is not included. Orders are confirmed by phone.

# Aisha's Catering

Full-stack catering ordering site — immersive 3D menu, cart, checkout, and order API.

**Live:** _(Vercel URL after deploy)_

## Stack

- Frontend: HTML / CSS / vanilla JS (responsive, scroll-driven menu journey)
- Backend: Vercel Serverless (`/api/menu`, `/api/orders`)
- Cart: browser `localStorage` + API order submit
- Deploy: Vercel

## Features

- Halal kitchen badge sitewide
- Real menu: Jollof Rice, Pepper Chicken, Tortilla Kebab Skewer, Jamaican Oxtail, Akara & Yaji
- Immersive dish carousel with ambient photo wash
- Cart drawer + checkout (pickup / delivery)
- `POST /api/orders` order intake endpoint
- `GET /api/menu` JSON menu endpoint

## Local

Open `index.html`, or:

```bash
npx serve .
```

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/menu` | Menu JSON |
| POST | `/api/orders` | Place an order |

## Notes

Phone / address placeholders until kitchen details are locked. Payments not wired yet.

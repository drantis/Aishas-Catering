const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");

function loadMenuItems() {
  const file = path.join(process.cwd(), "menu-data.js");
  const raw = fs.readFileSync(file, "utf8");
  const match = raw.match(/window\.AISHA_MENU\s*=\s*(\{[\s\S]*\});?\s*$/);
  if (!match) return [];
  // eslint-disable-next-line no-new-func
  const menu = Function("return (" + match[1] + ")")();
  return menu.items || [];
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1e6) {
        reject(new Error("Body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }

  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ error: "Method not allowed" }));
  }

  try {
    const body = await readBody(req);
    const items = Array.isArray(body.items) ? body.items : [];
    const menu = loadMenuItems();
    const byId = Object.fromEntries(menu.map((item) => [item.id, item]));

    const lines = items
      .map((line) => {
        const dish = byId[line.id];
        if (!dish) return null;
        const qty = Math.max(1, Math.min(50, Number(line.qty) || 1));
        return {
          id: dish.id,
          name: dish.name,
          qty,
          unitPrice: dish.price,
          lineTotal: dish.price * qty,
        };
      })
      .filter(Boolean);

    if (!lines.length) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "Cart is empty or items are invalid" }));
    }

    const fulfillment = body.fulfillment === "delivery" ? "delivery" : "pickup";
    const customer = {
      name: String(body.name || "").trim().slice(0, 120),
      phone: String(body.phone || "").trim().slice(0, 40),
      email: String(body.email || "").trim().slice(0, 120),
      notes: String(body.notes || "").trim().slice(0, 500),
      address: fulfillment === "delivery" ? String(body.address || "").trim().slice(0, 240) : "",
    };

    if (!customer.name || !customer.phone) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "Name and phone are required" }));
    }

    const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
    const order = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      status: "received",
      fulfillment,
      customer,
      lines,
      subtotal,
      currency: "CAD",
    };

    // Demo store: durable DB comes later. Vercel serverless keeps this in-memory
    // per instance — response still confirms the API path for the portfolio.
    globalThis.__AISHA_ORDERS__ = globalThis.__AISHA_ORDERS__ || [];
    globalThis.__AISHA_ORDERS__.push(order);

    res.statusCode = 201;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        ok: true,
        orderId: order.id,
        status: order.status,
        subtotal: order.subtotal,
        message: "Order received. The kitchen will confirm by phone.",
      })
    );
  } catch (err) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Could not place order", detail: String(err.message || err) }));
  }
};

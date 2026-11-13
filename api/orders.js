const { randomUUID } = require("crypto");
const menu = require("../menu-data.js");

function readBody(req) {
  // Vercel parses JSON bodies before the handler runs
  if (req.body && typeof req.body === "object") return Promise.resolve(req.body);
  if (typeof req.body === "string") return Promise.resolve(JSON.parse(req.body || "{}"));

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

const text = (value, max) => String(value == null ? "" : value).trim().slice(0, max);

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }

  res.setHeader("Content-Type", "application/json");
  const reply = (status, payload) => {
    res.statusCode = status;
    res.end(JSON.stringify(payload));
  };

  if (req.method !== "POST") return reply(405, { error: "Method not allowed" });

  let body;
  try {
    body = await readBody(req);
  } catch (err) {
    return reply(400, { error: "We could not read your order." });
  }
  if (!body || typeof body !== "object") body = {};

  // Prices always come from the menu, never from the browser. The 4xx messages
  // below are shown to the customer as written.
  const byId = Object.fromEntries((menu.items || []).map((item) => [item.id, item]));
  const lines = (Array.isArray(body.items) ? body.items : [])
    .map((line) => {
      const dish = line && byId[line.id];
      if (!dish) return null;
      const qty = Math.max(1, Math.min(50, Math.floor(Number(line.qty)) || 1));
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
    return reply(400, { error: "Your order is empty. Please add a dish from the menu." });
  }

  const fulfillment = body.fulfillment === "delivery" ? "delivery" : "pickup";
  const customer = {
    name: text(body.name, 120),
    phone: text(body.phone, 40),
    email: text(body.email, 120),
    notes: text(body.notes, 500),
    address: fulfillment === "delivery" ? text(body.address, 240) : "",
  };
  const when = text(body.when, 40);

  if (!customer.name || !customer.phone) {
    return reply(400, { error: "Please enter your name and phone number." });
  }
  if (fulfillment === "delivery" && !customer.address) {
    return reply(400, { error: "Please enter a delivery address." });
  }
  if (!when) {
    return reply(400, { error: "Please choose the date and time you need your order." });
  }

  const order = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    status: "received",
    fulfillment,
    when,
    customer,
    lines,
    subtotal: lines.reduce((sum, line) => sum + line.lineTotal, 0),
    currency: "CAD",
  };

  // TODO before taking real orders: send this to the kitchen (email, SMS or
  // WhatsApp). Nothing here notifies anyone yet. Until then the order is only
  // written to the function log, which is where to look for it in Vercel.
  console.log("NEW ORDER " + JSON.stringify(order));

  reply(201, {
    ok: true,
    orderId: order.id,
    status: order.status,
    subtotal: order.subtotal,
  });
};

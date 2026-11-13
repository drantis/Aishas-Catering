const fs = require("fs");
const path = require("path");

function loadMenu() {
  const file = path.join(process.cwd(), "menu-data.js");
  const raw = fs.readFileSync(file, "utf8");
  const match = raw.match(/window\.AISHA_MENU\s*=\s*(\{[\s\S]*\});?\s*$/);
  if (!match) throw new Error("menu data not found");
  // eslint-disable-next-line no-new-func
  return Function("return (" + match[1] + ")")();
}

module.exports = function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }

  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ error: "Method not allowed" }));
  }

  try {
    const menu = loadMenu();
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(menu));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Failed to load menu", detail: String(err.message || err) }));
  }
};

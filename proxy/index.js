const express = require("express");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(express.json());

const MAIN_URL = process.env.MAIN_APP_URL || "http://main-app:3001";
const SHADOW_URL = process.env.SHADOW_APP_URL || "http://shadow-app:3002";
const PORT = process.env.PORT || 3000;

// In-memory log (dashboard polls this)
const requestLog = [];

// Dashboard + smoke-test endpoints (must be registered before mirroring middleware)
app.get("/__shadow/logs", (req, res) => {
  res.json(requestLog.slice(0, 50));
});

app.get("/__shadow/stats", (req, res) => {
  const total = requestLog.length;
  const matched = requestLog.filter((r) => r.match).length;
  const diverged = total - matched;
  res.json({ total, matched, diverged, matchRate: total ? ((matched / total) * 100).toFixed(1) : 100 });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "shadowsync-proxy" });
});

app.use(async (req, res) => {
  const requestId = uuidv4();
  const timestamp = Date.now();
  const { method, url, body } = req;

  const logEntry = {
    id: requestId,
    timestamp,
    method,
    url,
    body,
    main: null,
    shadow: null,
    match: null,
  };

  // Fire BOTH requests in parallel — user only waits for main
  const [mainResult, shadowResult] = await Promise.allSettled([
    axios({ method, url: `${MAIN_URL}${url}`, data: body, timeout: 5000 }),
    axios({ method, url: `${SHADOW_URL}${url}`, data: body, timeout: 5000 }),
  ]);

  const mainRes = mainResult.status === "fulfilled" ? mainResult.value : null;
  const shadowRes = shadowResult.status === "fulfilled" ? shadowResult.value : null;

  logEntry.main = mainRes
    ? { status: mainRes.status, data: mainRes.data, latency: Date.now() - timestamp }
    : { error: mainResult.reason?.message, status: 0 };

  logEntry.shadow = shadowRes
    ? { status: shadowRes.status, data: shadowRes.data, latency: Date.now() - timestamp }
    : { error: shadowResult.reason?.message, status: 0 };

  logEntry.match =
    logEntry.main?.status === logEntry.shadow?.status &&
    JSON.stringify(logEntry.main?.data) === JSON.stringify(logEntry.shadow?.data);

  requestLog.unshift(logEntry);
  if (requestLog.length > 200) requestLog.pop();

  // Return ONLY main app response to the user
  if (mainRes) {
    res.status(mainRes.status).json(mainRes.data);
  } else {
    res.status(502).json({ error: "Main app unreachable" });
  }
});

app.listen(PORT, () => console.log(`🔀 ShadowSync Proxy running on :${PORT}`));

// =============================================================
//   Midnight YouTube V10 — scripts.js (Private Edition)
//   - Icon-only UI (no emojis)
//   - Privacy: all data localStorage only, Incognito mode, export/import
//   - Stability: dedup via Set, fetch timeout+retry, throttled scroll,
//     unified Shorts/Live classification, memory-safe drag/touch
//   - Features: WatchLater, Resume, Notes, Tags, Collections, ChannelMute,
//     SmartSearch, QuickActions, SessionRestore
// =============================================================

"use strict";

const WORKER_URL = "https://silent-mouse-5878.78q38gs6.workers.dev/";
const APP_VERSION = "10.0";

// ---------- Icon helper ----------
function icon(name, extraClass = "") {
    return `<svg class="icon ${extraClass}"><use href="#icon-${name}"/></svg>`;
}
function escapeHtml(str) {
    return String(str ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function formatSeconds(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return h > 0
        ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
        : `${m}:${String(s).padStart(2, "0")}`;
}
function parseDurationToSec(d) {
    if (!d || typeof d !== "string") return 0;
    const p = d.split(":").map(n => parseInt(n, 10) || 0);
    if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
    if (p.length === 2) return p[0] * 60 + p[1];
    return p[0] || 0;
}

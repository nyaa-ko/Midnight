// ---------- Unified video classification ----------
function classifyItem(item) {
    if (!item) return { type: "video", isShort: false, isLive: false };
    const title = String(item.title || "").toLowerCase();
    const isVerticalTag = !!item.isShort || /#shorts|#ショート|ショート動画|#縦型|#short/i.test(title);
    let isShortByDuration = false;
    if (item.duration) {
        const sec = parseDurationToSec(item.duration);
        if (sec > 0 && sec <= 150) isShortByDuration = true;
    }
    const isShort = isVerticalTag || isShortByDuration;
    const isLive = !!item.isLive
        || /ライブ|live now/i.test(String(item.publishedText || ""))
        || /LIVE/i.test(String(item.duration || ""));
    let type = "video";
    if (isShort) type = "short";
    else if (isLive) type = "live";
    return { type, isShort, isLive };
}

// ---------- Safe fetch (timeout + retry) ----------
async function safeFetch(url, { timeout = 12000, retries = 2 } = {}) {
    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt++) {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), timeout);
        try {
            const r = await fetch(url, { signal: ctrl.signal, referrerPolicy: "no-referrer" });
            clearTimeout(tid);
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return await r.json();
        } catch (e) {
            clearTimeout(tid);
            lastErr = e;
            if (attempt < retries) await new Promise(r => setTimeout(r, 400 * (attempt + 1)));
        }
    }
    throw lastErr;
}

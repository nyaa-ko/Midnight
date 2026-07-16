/* =========================================================
   Midnight YouTube V10 — worker.js (V4 Recode)
   Cloudflare Worker proxy for YouTube InnerTube + Translate
   Deploy this file to your Cloudflare Worker (workers.dev)
   ---------------------------------------------------------
   Improvements vs V9:
   - AbortController-based timeouts (no hanging fetches)
   - Exponential backoff retry with jitter
   - Unified Shorts / Live / Upcoming / Archive classification
   - Stricter dedup (Set) and stable result sort
   - Smaller, single-purpose helpers grouped by concern
   - Safer JSON parse, safer optional chaining, no thrown TypeErrors
   - Privacy: no logging of query strings, no cookies forwarded
========================================================= */

"use strict";

// ---------- Constants ----------
const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS, HEAD",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Max-Age": "86400",
};
const INNERTUBE_FALLBACK_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
const DEFAULT_CLIENT_VERSION = "2.20260612.01.00";
const FETCH_TIMEOUT_MS = 12_000;

// =========================================================
//   Entry
// =========================================================
export default {
    async fetch(request, env, ctx) {
        if (request.method === "OPTIONS") {
            return new Response(null, { headers: CORS_HEADERS });
        }

        const cache = caches.default;
        const cached = await cache.match(request);
        if (cached) return cached;

        try {
            const res = await Router.dispatch(request, env);
            if (res) ctx.waitUntil(cache.put(request, res.clone()));
            return res;
        } catch (e) {
            return Json.error(e.message || "Internal Worker Error", 500);
        }
    },
};

// =========================================================
//   Router
// =========================================================
const Router = {
    async dispatch(request, env) {
        const url = new URL(request.url);
        const p = url.searchParams;

        if (p.get("translate")) return Handlers.translate(p);
        if (p.get("suggest"))   return Handlers.suggest(p);
        if (p.get("continuation")) return Handlers.continuation(p, env);

        const q = p.get("q");
        if (q && (q.startsWith("@") || q.startsWith("UC") || q.includes("youtube.com/"))) {
            return Handlers.channel(q, p);
        }
        if (q) return Handlers.search(q, p, env);

        return Handlers.trending(env);
    },
};

// =========================================================
//   Handlers
// =========================================================
const Handlers = {
    async translate(p) {
        const text = p.get("translate").trim();
        const sl = p.get("sl") || "auto";
        const tl = p.get("tl") || "ja";
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
        const res = await Net.fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
        if (!res.ok) throw new Error("Google Translate API Error");
        const data = await res.json().catch(() => null);
        let out = "";
        if (data?.[0]) for (const s of data[0]) if (s?.[0]) out += s[0];
        return Json.ok({ translatedText: out }, 86400);
    },

    async suggest(p) {
        const q = encodeURIComponent(p.get("suggest").trim());
        const res = await Net.fetch(`https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${q}`);
        const data = await res.json().catch(() => [null, []]);
        return Json.ok(data?.[1] || [], 300);
    },

    async continuation(p, env) {
        const endpoint = p.get("type") === "search" ? "search" : "browse";
        const tab = p.get("tab") || "videos";
        const raw = await InnerTube.call(env, { continuation: p.get("continuation") }, endpoint);
        const parsed = Parser.parse(raw, endpoint);
        if (tab === "shorts") parsed.results.forEach(v => { if (v.type === "video") v.isShort = true; });
        return Json.ok({ results: parsed.results, continuation: parsed.continuation }, 3600);
    },

    async channel(rawInput, p) {
        const tab = p.get("tab") || "videos";
        const html = await Net.fetchText(ChannelUrl.build(decodeSafe(rawInput), tab));
        const initial = parseYtInitialData(html);
        if (!initial) throw new Error("Failed to parse channel page");
        const parsed = Parser.parse(initial, "browse");
        if (tab === "shorts") parsed.results.forEach(v => { if (v.type === "video") v.isShort = true; });
        return Json.ok({ results: parsed.results, continuation: parsed.continuation }, 300);
    },

    async search(rawQ, p, env) {
        const payload = { query: decodeSafe(rawQ) };
        const sp = p.get("sp");
        if (sp) payload.params = sp;
        const raw = await InnerTube.call(env, payload, "search");
        const parsed = Parser.parse(raw, "search");
        return Json.ok({ results: parsed.results, continuation: parsed.continuation }, 600);
    },

    async trending(env) {
        const raw = await InnerTube.call(env, { browseId: "FEtrending" }, "browse");
        const parsed = Parser.parse(raw, "browse");
        return Json.ok({ results: parsed.results, continuation: parsed.continuation, isTrending: true }, 1800);
    },
};

// =========================================================
//   InnerTube client
// =========================================================
const InnerTube = {
    async call(env, payload, endpoint) {
        return Net.retry(() => this.raw(env, payload, endpoint), 2);
    },

    async raw(env, payload, endpoint) {
        const key = env?.INNER_TUBE_KEY || INNERTUBE_FALLBACK_KEY;
        let cv = DEFAULT_CLIENT_VERSION;
        if (payload.continuation) {
            try {
                const decoded = atob(decodeURIComponent(payload.continuation));
                const m = decoded.match(/2\.\d{8}\.\d{2}\.\d{2}/);
                if (m) cv = m[0];
            } catch (_) {}
        }
        const body = {
            context: {
                client: {
                    clientName: "WEB",
                    clientVersion: cv,
                    hl: "ja", gl: "JP", utcOffsetMinutes: 540,
                },
            },
            ...payload,
        };
        const res = await Net.fetch(
            `https://www.youtube.com/youtubei/v1/${endpoint}?key=${key}&prettyPrint=false`,
            {
                method: "POST",
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "Content-Type": "application/json",
                    "Origin": "https://www.youtube.com",
                    "Referer": "https://www.youtube.com/",
                },
                body: JSON.stringify(body),
            },
        );
        if (!res.ok) throw new Error(`InnerTube HTTP ${res.status}`);
        return res.json();
    },
};

// =========================================================
//   Net (fetch with timeout + retry)
// =========================================================
const Net = {
    async fetch(url, init = {}) {
        const ctrl = new AbortController();
        const id = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
        try {
            return await fetch(url, { ...init, signal: ctrl.signal });
        } finally {
            clearTimeout(id);
        }
    },

    async fetchText(url) {
        const r = await this.fetch(url, { headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "ja,ja-JP;q=0.9" } });
        return r.text();
    },

    async retry(fn, retries = 2) {
        let lastErr;
        for (let i = 0; i <= retries; i++) {
            try { return await fn(); }
            catch (e) {
                lastErr = e;
                if (i === retries) break;
                const wait = 400 * Math.pow(2, i) + Math.random() * 200;
                await new Promise(r => setTimeout(r, wait));
            }
        }
        throw lastErr;
    },
};

// =========================================================
//   Parser — unified YouTube response → flat items[]
// =========================================================
const Parser = {
    parse(json, endpoint = "search") {
        const ctx = { results: [], tokenContainer: { token: "" }, endpoint };
        this.walkContinuation(json, ctx);
        this.walkItems(json, ctx);
        return { results: this.dedupAndSort(ctx.results), continuation: ctx.tokenContainer.token };
    },

    walkContinuation(obj, ctx) {
        if (!obj || typeof obj !== "object") return;
        const t =
            obj.nextContinuationData?.continuation ||
            obj.continuationCommand?.token ||
            obj.continuationEndpoint?.continuationCommand?.token || "";
        if (t) {
            const cur = ctx.tokenContainer.token;
            const prefer = ctx.endpoint === "search"
                ? (!cur || t.length < cur.length)
                : (!cur || t.length > cur.length);
            if (prefer) ctx.tokenContainer.token = t;
        }
        for (const k of Object.keys(obj)) this.walkContinuation(obj[k], ctx);
    },

    walkItems(obj, ctx) {
        if (!obj || typeof obj !== "object") return;
        const vm = obj.lockupViewModel;
        if (vm?.contentType === "LOCKUP_CONTENT_TYPE_VIDEO") {
            const it = Items.lockup(vm); if (it) ctx.results.push(it);
        } else if (vm?.contentType === "LOCKUP_CONTENT_TYPE_SHORT") {
            const it = Items.lockup(vm); if (it) { it.isShort = true; ctx.results.push(it); }
        } else if (obj.videoRenderer)        ctx.results.push(Items.video(obj.videoRenderer));
        else if (obj.gridVideoRenderer)      ctx.results.push(Items.video(obj.gridVideoRenderer));
        else if (obj.compactVideoRenderer)   ctx.results.push(Items.video(obj.compactVideoRenderer));
        else if (obj.shortsLockupViewModel)  ctx.results.push(Items.shorts(obj.shortsLockupViewModel));
        else if (obj.reelItemRenderer)       ctx.results.push(Items.reel(obj.reelItemRenderer));
        else if (obj.channelRenderer) {
            const it = Items.channel(obj.channelRenderer); if (it) ctx.results.push(it);
        }
        for (const k of Object.keys(obj)) this.walkItems(obj[k], ctx);
    },

    dedupAndSort(arr) {
        const seen = new Set();
        const filtered = arr.filter(it => {
            if (!it) return false;
            const key = it.videoId || it.channelId;
            if (!key) return true;
            if (seen.has(key)) return false;
            seen.add(key); return true;
        });
        filtered.sort((a, b) => Time.score(a.publishedText) - Time.score(b.publishedText));
        return filtered;
    },
};

// =========================================================
//   Items — per-renderer extractors
// =========================================================
const Items = {
    video(v) {
        const videoId = v?.videoId;
        if (!videoId) return null;
        const title = v.title?.runs?.[0]?.text || v.title?.simpleText || "No Title";
        const byline = v.longBylineText?.runs?.[0] || v.shortBylineText?.runs?.[0];
        const channel = byline?.text || "YouTube Video";
        const channelId = byline?.navigationEndpoint?.browseEndpoint?.browseId || "";
        const viewCountText =
            v.viewCountText?.simpleText ||
            v.viewCountText?.runs?.map(r => r.text).join("") ||
            v.shortViewCountText?.simpleText ||
            v.shortViewCountText?.runs?.map(r => r.text).join("") || "";
        const duration = v.lengthText?.simpleText || "";
        const publishedText =
            v.publishedTimeText?.simpleText ||
            v.publishedTimeText?.runs?.map(r => r.text).join("") || "";

        const isLive = Classify.live(v, viewCountText, publishedText);
        const isUpcoming = Classify.upcoming(v);
        const isLiveArchive = Classify.liveArchive(isLive, publishedText);
        const isShort = Classify.shorts(v, title);

        let displayPublished = publishedText;
        if (isLive) displayPublished = "LIVE";
        else if (isUpcoming) displayPublished = "UPCOMING";
        else if (isLiveArchive) displayPublished = publishedText || "Archived";

        return {
            type: "video", videoId, title,
            thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            channel, channelId,
            publishedText: displayPublished,
            isLive, isLiveArchive, isUpcoming, isShort, duration,
        };
    },

    lockup(vm) {
        const videoId = vm.contentId;
        if (!videoId) return null;
        const title = vm.metadata?.lockupMetadataViewModel?.title?.content || "No Title";
        const sources = vm.contentImage?.thumbnailViewModel?.image?.sources;
        const thumbnail = sources?.length
            ? sources[sources.length - 1].url
            : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
        const isShort = vm.contentType === "LOCKUP_CONTENT_TYPE_SHORT";
        return {
            type: "video", videoId, title, thumbnail,
            channel: "YouTube Video",
            publishedText: isShort ? "Shorts" : "Video",
            isShort, duration: isShort ? "0:30" : "",
            isLive: false, isLiveArchive: false, isUpcoming: false,
        };
    },

    shorts(s) {
        const videoId = s.onTap?.innertubeCommand?.commandMetadata?.webCommandMetadata?.url?.split("/shorts/")?.[1] || "";
        if (!videoId) return null;
        return {
            type: "video", videoId,
            title: s.overlayMetadata?.primaryText?.content || "Shorts Video",
            isShort: true, duration: "0:30",
            thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            channel: "Shorts", publishedText: "Shorts",
        };
    },

    reel(r) {
        const videoId = r.videoId;
        if (!videoId) return null;
        return {
            type: "video", videoId,
            title: r.headline?.simpleText || "Short Video",
            thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            channel: "Shorts", publishedText: "Shorts",
            isShort: true, duration: "0:30",
        };
    },

    channel(c) {
        const channelId = c.channelId;
        if (!channelId) return null;
        const title = c.title?.simpleText || c.title?.runs?.[0]?.text || "Unknown Channel";
        const thumbs = c.thumbnail?.thumbnails;
        const thumbnail = thumbs?.length ? "https:" + thumbs[thumbs.length - 1].url.replace(/^https?:/, "") : "";
        return { type: "channel", channelId, title, thumbnail, publishedText: c.videoCountText?.simpleText || "Channel" };
    },
};

// =========================================================
//   Classify — unified Live / Upcoming / Archive / Shorts
// =========================================================
const Classify = {
    live(v, viewCountText = "", publishedText = "") {
        if (!v) return false;
        const len = v.lengthText?.simpleText || v.lengthText?.runs?.[0]?.text || "";
        if (len && !/LIVE|ライブ/i.test(len)) return false;

        const pub = (publishedText || "").toLowerCase();
        if (/前|ago|配信済み|streamed|公開済/.test(pub)) return false;

        for (const o of (v.thumbnailOverlays || [])) {
            if (o.thumbnailOverlayTimeStatusRenderer?.style === "LIVE") return true;
            if (o.thumbnailOverlayLiveStatusRenderer) return true;
        }
        for (const b of (v.badges || [])) {
            const meta = b.metadataBadgeRenderer || b;
            if (meta.style === "BADGE_STYLE_TYPE_LIVE_NOW") return true;
        }
        return /視聴中|watching/i.test(viewCountText);
    },

    upcoming(v) {
        return !!(v.upcomingEventData ||
            v.thumbnailOverlays?.some(o => o.thumbnailOverlayTimeStatusRenderer?.style === "UPCOMING"));
    },

    liveArchive(isLive, publishedText) {
        if (isLive) return false;
        return /配信済み|streamed|premiered|公開済|に配信済み/i.test(publishedText || "");
    },

    shorts(v, title) {
        const url = v.navigationEndpoint?.commandMetadata?.webCommandMetadata?.url || "";
        const t = (title || "").toLowerCase();
        return url.includes("/shorts/") || t.includes("#shorts") || t.includes("#ショート");
    },
};

// =========================================================
//   Time score (for stable sort)
// =========================================================
const Time = {
    score(text) {
        if (!text) return 99999999;
        if (text.includes("LIVE") || text.includes("ライブ配信中")) return 1;
        if (text.includes("UPCOMING") || text.includes("配信予定")) return 2;
        if (text.includes("配信済み")) return 10;
        const n = parseInt(text, 10) || 0;
        if (text.includes("秒前")) return n;
        if (text.includes("分前")) return n * 60;
        if (text.includes("時間前")) return n * 3600;
        if (text.includes("日前")) return n * 86400;
        if (text.includes("週間前")) return n * 86400 * 7;
        if (text.includes("か月前")) return n * 86400 * 30;
        if (text.includes("年前")) return n * 86400 * 365;
        return 99999998;
    },
};

// =========================================================
//   Channel URL builder
// =========================================================
const ChannelUrl = {
    build(input, tab) {
        let base = (input || "").trim();
        if (base.includes("youtube.com/")) {
            base = base.split(/[?#]/)[0].replace(/\/+$/, "");
            const rx = /\/(videos|shorts|streams|playlists)\/?$/i;
            return rx.test(base) ? base.replace(rx, `/${tab}`) : `${base}/${tab}`;
        }
        if (base.startsWith("@"))  return `https://www.youtube.com/@${encodeURIComponent(base.slice(1))}/${tab}`;
        if (base.startsWith("UC")) return `https://www.youtube.com/channel/${encodeURIComponent(base)}/${tab}`;
        return `https://www.youtube.com/@${encodeURIComponent(base)}/${tab}`;
    },
};

// =========================================================
//   Helpers
// =========================================================
function parseYtInitialData(html) {
    const m = html.match(/ytInitialData\s*=\s*(\{[\s\S]*?\});/);
    if (!m) return null;
    try { return JSON.parse(m[1]); } catch { return null; }
}

function decodeSafe(s) {
    try { return decodeURIComponent(s).trim(); } catch { return (s || "").trim(); }
}

// =========================================================
//   Json response helpers
// =========================================================
const Json = {
    ok(data, cacheTtl = 0) {
        const headers = { "Content-Type": "application/json; charset=utf-8", ...CORS_HEADERS };
        if (cacheTtl > 0) headers["Cache-Control"] = `s-maxage=${cacheTtl}`;
        return new Response(JSON.stringify(data), { headers });
    },
    error(msg, status = 500) {
        return new Response(JSON.stringify({ error: msg, results: [] }), {
            status,
            headers: { "Content-Type": "application/json; charset=utf-8", ...CORS_HEADERS },
        });
    },
};

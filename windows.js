// ---------- Windows (PiP) ----------
class WindowManager {
    static _winCount = 0;
    static _windows = new Map(); // key -> {el, iframe, videoId, title, pollId, listeners, loop, speed}
    static _activeKey = null;
    static onChange = []; // callbacks(activeWindowsArray)

    static notify() {
        try { this.onChange.forEach(fn => fn(this.list())); } catch {}
    }
    static list() {
        return [...this._windows.entries()].map(([key, r]) => ({ key, videoId: r.videoId, title: r.title }));
    }
    static send(key, func, args = []) {
        const rec = this._windows.get(key);
        rec?.iframe?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), "*");
    }
    static sendAll(func, args = []) {
        for (const k of this._windows.keys()) this.send(k, func, args);
    }
    static closeAll() {
        for (const k of [...this._windows.keys()]) this._destroy(k);
    }
    static layout(mode) {
        const wins = [...this._windows.values()].map(r => r.el);
        const n = wins.length; if (!n) return;
        const W = window.innerWidth, H = window.innerHeight;
        const cols = mode === "2x2" ? 2 : mode === "3x3" ? 3 : Math.ceil(Math.sqrt(n));
        const rows = Math.ceil(n / cols);
        const cw = Math.floor((W - 40) / cols) - 10;
        const ch = Math.floor((H - 80) / rows) - 10;
        wins.forEach((el, i) => {
            const r = Math.floor(i / cols), c = i % cols;
            el.style.left = (20 + c * (cw + 10)) + "px";
            el.style.top  = (60 + r * (ch + 10)) + "px";
            el.style.width = cw + "px"; el.style.height = ch + "px";
        });
        Toast.show("Layout: " + mode, "success");
    }
    static snap(key, corner) {
        const rec = this._windows.get(key); if (!rec) return;
        const el = rec.el, w = el.offsetWidth, h = el.offsetHeight;
        const pad = 12, W = window.innerWidth, H = window.innerHeight;
        const map = {
            tl: [pad, pad], tr: [W - w - pad, pad],
            bl: [pad, H - h - pad], br: [W - w - pad, H - h - pad],
            c:  [(W - w) / 2, (H - h) / 2],
        };
        const [x, y] = map[corner] || map.c;
        el.style.transition = "left .2s, top .2s";
        el.style.left = x + "px"; el.style.top = y + "px";
        setTimeout(() => el.style.transition = "", 250);
    }
    static async nativePiP(key) {
        const rec = this._windows.get(key); if (!rec) return;
        try {
            const v = rec.iframe.contentDocument?.querySelector("video");
            if (v && document.pictureInPictureEnabled) {
                await v.requestPictureInPicture();
                Toast.show("Native PiP", "success");
            } else {
                Toast.show("Native PiP unavailable (cross-origin)", "warning");
            }
        } catch (e) { Toast.show("PiP error: " + e.message, "error"); }
    }

    static async createWindow(videoId, title) {
        if (!videoId) return;
        const workspace = document.getElementById("windowWorkspace");
        if (!workspace) return;

        const maxWins = parseInt(Storage.get("maxWindows", 5)) || Infinity;
        if (maxWins && this._windows.size >= maxWins) {
            const [firstKey, firstWin] = this._windows.entries().next().value;
            this._destroy(firstKey);
            Toast.show(Translator.t("toast_old_win_closed"), "warning");
        }

        this._winCount++;
        const sizes = { small:[400,260], medium:[520,330], large:[700,430] };
        const sizeKey = Storage.get("windowSize", "medium");
        const [W, H] = sizes[sizeKey] || sizes.medium;

        const autoplay = Storage.get("autoplayEnabled", true) ? 1 : 0;
        const resumeSec = await Resume.maybePrompt(videoId);

        const win = document.createElement("div");
        win.className = "pip-window";
        win.style.left = `${80 + (this._winCount * 30) % 300}px`;
        win.style.top = `${80 + (this._winCount * 30) % 200}px`;
        win.style.width = W + "px";
        win.style.height = H + "px";
        const key = videoId + "_" + this._winCount;

        const isFav = FavoritesManager.isFav(videoId);
        
        // 【修正】paramsに正しく集約
        const params = new URLSearchParams({
            autoplay: String(autoplay),
            enablejsapi: "1",
            origin: location.origin,
            rel: "0",
            modestbranding: "1",
        });
        if (resumeSec > 0) params.set("start", String(resumeSec));
        
        // 【修正】重複のない綺麗なURLを生成
        const src = `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;

        win.innerHTML = `
            <div class="pip-header">
                <span class="pip-title" title="${escapeHtml(title)}">${escapeHtml(title)}</span>
                <div class="pip-controls">
                    <div class="pip-vol-wrap">${icon("volume","icon-sm")}<input type="range" class="pip-vol" min="0" max="100" value="100" title="vol"></div>
                    <select class="pip-speed" title="speed">
                        <option value="0.25">0.25x</option><option value="0.5">0.5x</option>
                        <option value="0.75">0.75x</option><option value="1" selected>1x</option>
                        <option value="1.25">1.25x</option><option value="1.5">1.5x</option>
                        <option value="1.75">1.75x</option><option value="2">2x</option>
                    </select>
                    <input type="range" class="pip-opacity" min="30" max="100" value="100" title="opacity">
                    <button class="pip-custom-btn loop-btn" title="loop">${icon("shuffle","icon-sm")}</button>
                    <button class="pip-custom-btn snap-btn" title="snap">${icon("window","icon-sm")}</button>
                    <button class="pip-custom-btn npip-btn" title="native PiP">${icon("eye","icon-sm")}</button>
                    <button class="pip-custom-btn size-btn" data-size="small" title="S">S</button>
                    <button class="pip-custom-btn size-btn" data-size="medium" title="M">M</button>
                    <button class="pip-custom-btn size-btn" data-size="large" title="L">L</button>
                    <button class="pip-custom-btn fav-btn${isFav?' fav-active':''}" title="fav">${icon("star", isFav ? "filled" : "")}</button>
                    <button class="pip-custom-btn queue-btn" title="queue">${icon("queue", "icon-sm")}</button>
                    <button class="pip-custom-btn min-btn" title="min">${icon("minimize","icon-sm")}</button>
                    <button class="pip-custom-btn close-btn" title="close">${icon("close","icon-sm")}</button>
                </div>
            </div>
            <div class="pip-body">
                <iframe src="${src}" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>
            </div>
            <div class="pip-resizable-handle"></div>`;

        const iframe = win.querySelector("iframe");

        // Volume
        const volSlider = win.querySelector(".pip-vol");
        volSlider.addEventListener("input", (e) => {
            iframe.contentWindow?.postMessage(JSON.stringify({
                event: "command", func: "setVolume", args: [parseInt(e.target.value, 10), true]
            }), "*");
        });

        // Size buttons
        win.querySelectorAll(".size-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const [nW, nH] = sizes[btn.dataset.size] || sizes.medium;
                win.style.width = nW + "px";
                win.style.height = nH + "px";
            });
        });

        // Speed
        win.querySelector(".pip-speed").addEventListener("change", (e) => {
            iframe.contentWindow?.postMessage(JSON.stringify({
                event: "command", func: "setPlaybackRate", args: [parseFloat(e.target.value)]
            }), "*");
        });
        // Opacity
        win.querySelector(".pip-opacity").addEventListener("input", (e) => {
            win.style.opacity = String(parseInt(e.target.value, 10) / 100);
        });
        // Loop
        let loopOn = false;
        const loopBtn = win.querySelector(".loop-btn");
        loopBtn.addEventListener("click", () => {
            loopOn = !loopOn;
            loopBtn.classList.toggle("fav-active", loopOn);
            const rec = this._windows.get(key); if (rec) rec.loop = loopOn;
        });
        // Snap cycle
        const snaps = ["tl", "tr", "bl", "br", "c"];
        let snapIdx = 0;
        win.querySelector(".snap-btn").addEventListener("click", () => {
            this.snap(key, snaps[snapIdx % snaps.length]); snapIdx++;
        });
        // Native PiP
        win.querySelector(".npip-btn").addEventListener("click", () => this.nativePiP(key));

        // Drag
        const header = win.querySelector(".pip-header");
        const startDrag = (clientX, clientY) => {
            const sl = parseInt(win.style.left) || 0, st = parseInt(win.style.top) || 0;
            const onMove = (cx, cy) => {
                win.style.left = Math.max(0, Math.min(window.innerWidth - 100, sl + cx - clientX)) + "px";
                win.style.top = Math.max(0, Math.min(window.innerHeight - 60, st + cy - clientY)) + "px";
            };
            const mv = (ev) => onMove(ev.clientX, ev.clientY);
            const tmv = (ev) => { if (ev.touches[0]) onMove(ev.touches[0].clientX, ev.touches[0].clientY); };
            const up = () => {
                document.removeEventListener("mousemove", mv);
                document.removeEventListener("mouseup", up);
                document.removeEventListener("touchmove", tmv);
                document.removeEventListener("touchend", up);
            };
            document.addEventListener("mousemove", mv);
            document.addEventListener("mouseup", up);
            document.addEventListener("touchmove", tmv, { passive: true });
            document.addEventListener("touchend", up);
        };
        header.addEventListener("mousedown", (e) => {
            if (e.target.closest("button") || e.target.closest("input")) return;
            e.preventDefault();
            this._bringToFront(win);
            startDrag(e.clientX, e.clientY);
        });
        header.addEventListener("touchstart", (e) => {
            if (e.target.closest("button") || e.target.closest("input")) return;
            this._bringToFront(win);
            const t = e.touches[0]; if (t) startDrag(t.clientX, t.clientY);
        }, { passive: true });

        // Resize
        const handle = win.querySelector(".pip-resizable-handle");
        const startResize = (clientX, clientY) => {
            const rw = win.offsetWidth, rh = win.offsetHeight;
            const onMove = (cx, cy) => {
                win.style.width = Math.max(300, rw + cx - clientX) + "px";
                win.style.height = Math.max(200, rh + cy - clientY) + "px";
            };
            const mv = (ev) => onMove(ev.clientX, ev.clientY);
            const tmv = (ev) => { if (ev.touches[0]) onMove(ev.touches[0].clientX, ev.touches[0].clientY); };
            const up = () => {
                document.removeEventListener("mousemove", mv);
                document.removeEventListener("mouseup", up);
                document.removeEventListener("touchmove", tmv);
                document.removeEventListener("touchend", up);
            };
            document.addEventListener("mousemove", mv);
            document.addEventListener("mouseup", up);
            document.addEventListener("touchmove", tmv, { passive: true });
            document.addEventListener("touchend", up);
        };
        handle.addEventListener("mousedown", (e) => { e.stopPropagation(); e.preventDefault(); this._bringToFront(win); startResize(e.clientX, e.clientY); });
        handle.addEventListener("touchstart", (e) => { e.stopPropagation(); this._bringToFront(win); const t = e.touches[0]; if (t) startResize(t.clientX, t.clientY); }, { passive: true });

        // Minimize
        let minimized = false;
        const minBtn = win.querySelector(".min-btn");
        const body = win.querySelector(".pip-body");
        minBtn.addEventListener("click", () => {
            minimized = !minimized;
            body.style.display = minimized ? "none" : "";
            handle.style.display = minimized ? "none" : "";
            minBtn.innerHTML = minimized ? icon("restore", "icon-sm") : icon("minimize", "icon-sm");
        });

        // Fav
        const favBtn = win.querySelector(".fav-btn");
        favBtn.addEventListener("click", () => {
            FavoritesManager.toggle({ id: videoId, title });
            const nowFav = FavoritesManager.isFav(videoId);
            favBtn.innerHTML = icon("star", nowFav ? "filled" : "");
            favBtn.classList.toggle("fav-active", nowFav);
        });
        win.querySelector(".queue-btn").addEventListener("click", () => {
            QueueManager.add({ id: videoId, title });
        });

        // Polling via postMessage
        let pollId = null;
        let lastSec = 0, lastDur = 0;
        const onMsg = (ev) => {
            if (!ev.data || ev.source !== iframe.contentWindow) return;
            try {
                const data = typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data;
                if (data?.info?.currentTime != null) lastSec = data.info.currentTime;
                if (data?.info?.duration != null) lastDur = data.info.duration;
            } catch {}
        };
        window.addEventListener("message", onMsg);

        const startPoll = () => {
            const send = (func) => iframe.contentWindow?.postMessage(JSON.stringify({ event: "command", func }), "*");
            try {
                iframe.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: videoId }), "*");
            } catch {}
            pollId = setInterval(() => {
                send("getCurrentTime"); send("getDuration");
                if (lastSec) Resume.save(videoId, lastSec, lastDur);
                const rec = this._windows.get(key);
                if (rec?.loop && lastDur > 5 && lastSec > lastDur - 1) {
                    iframe.contentWindow?.postMessage(JSON.stringify({ event:"command", func:"seekTo", args:[0, true] }), "*");
                }
            }, 5000);
        };
        iframe.addEventListener("load", startPoll, { once: true });

        // Close
        win.querySelector(".close-btn").addEventListener("click", () => {
            if (lastSec) Resume.save(videoId, lastSec, lastDur);
            this._destroy(key, win);
        });

        win.addEventListener("mousedown", () => this._bringToFront(win));

        workspace.appendChild(win);
        this._windows.set(key, { el: win, iframe, videoId, title, pollId: () => pollId, onMsg, loop: false });
        this._activeKey = key;
        this.notify();

        HistoryManager.add({ id: videoId, title });
        DebugManager.updateStats();
        return win;
    }

    static _destroy(key, winEl) {
        const rec = this._windows.get(key);
        if (!rec) {
            if (winEl) winEl.remove();
            return;
        }
        const { el, onMsg, pollId } = rec;
        try { clearInterval(pollId?.()); } catch {}
        window.removeEventListener("message", onMsg);
        el.style.transition = "opacity .2s, transform .2s";
        el.style.opacity = "0";
        el.style.transform = "scale(0.95)";
        setTimeout(() => { el.remove(); this._windows.delete(key); DebugManager.updateStats(); this.notify(); }, 220);
    }

    static _bringToFront(win) {
        this._winCount++;
        win.style.zIndex = 5000 + this._winCount;
    }
}
// ---------- Context menu ----------
class ContextMenu {
    static current = null;
    static show(x, y, data) {
        this.current = data;
        const menu = document.getElementById("contextMenu");
        if (!menu) return;
        menu.style.display = "block";
        const w = menu.offsetWidth || 200, h = menu.offsetHeight || 260;
        menu.style.left = Math.min(x, window.innerWidth - w - 8) + "px";
        menu.style.top = Math.min(y, window.innerHeight - h - 8) + "px";
    }
    static hide() {
        const m = document.getElementById("contextMenu");
        if (m) m.style.display = "none";
        this.current = null;
    }
    static init() {
        document.addEventListener("click", () => this.hide());
        document.addEventListener("contextmenu", (e) => { if (!e.target.closest(".video-card")) this.hide(); });
        document.getElementById("ctxPlay")?.addEventListener("click", () => this.current && WindowManager.createWindow(this.current.videoId, this.current.title));
        document.getElementById("ctxQueue")?.addEventListener("click", () => this.current && QueueManager.add({ id: this.current.videoId, title: this.current.title, channel: this.current.channel }));
        document.getElementById("ctxWatchLater")?.addEventListener("click", () => this.current && WatchLater.add({ id: this.current.videoId, title: this.current.title, channel: this.current.channel }));
        document.getElementById("ctxFav")?.addEventListener("click", () => this.current && FavoritesManager.toggle({ id: this.current.videoId, title: this.current.title, channel: this.current.channel }));
        document.getElementById("ctxNote")?.addEventListener("click", () => this.current && Notes.add(this.current.videoId));
        document.getElementById("ctxTag")?.addEventListener("click", () => this.current && Tags.edit(this.current.videoId));
        document.getElementById("ctxCopy")?.addEventListener("click", () => {
            if (!this.current) return;
            navigator.clipboard?.writeText(`https://youtu.be/${this.current.videoId}`);
            Toast.show(Translator.t("toast_url_copied"), "success");
        });
        document.getElementById("ctxMute")?.addEventListener("click", () => {
            if (this.current?.channel) ChannelMute.toggle(this.current.channel);
        });
        document.getElementById("ctxClose")?.addEventListener("click", () => this.hide());
    }
}

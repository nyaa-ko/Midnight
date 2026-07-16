// ---------- Debug ----------
class DebugManager {
    static logs = [];
    static init() {
        const head = document.getElementById("debugHeader");
        const panel = document.getElementById("debugPanel");
        const btn = document.getElementById("debugToggleBtn");
        head?.addEventListener("click", () => panel?.classList.toggle("expanded"));
        if (btn) btn.onclick = (e) => { e.stopPropagation(); panel?.classList.toggle("expanded"); };
    }
    static log(msg) {
        this.logs.unshift(`[${new Date().toLocaleTimeString()}] ${msg}`);
        if (this.logs.length > 30) this.logs.length = 30;
        const el = document.getElementById("debugNetLogs");
        if (el) el.textContent = this.logs.join("\n");
    }
    static updateStats() {
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        set("dbSearchIds", window.yt?.searchIds?.size || 0);
        set("dbChannelIds", window.yt?.channelIds?.size || 0);
        set("dbActiveWins", WindowManager._windows.size);
        set("dbQueueLen", QueueManager.queue.length);
        set("dbFavCount", (Storage.get("favorites", []) || []).length);
        set("dbCacheSize", SearchCache.size());
    }
}

// ---------- Keyboard ----------
class KeyboardManager {
    static focused = -1;
    static init(yt) {
        document.addEventListener("keydown", (e) => {
            const tag = document.activeElement?.tagName;
            if (["INPUT","TEXTAREA","SELECT"].includes(tag)) {
                if (e.key === "Escape") document.activeElement.blur();
                return;
            }
            if ((e.ctrlKey || e.metaKey) && e.key === "k") {
                e.preventDefault(); document.getElementById("searchInput")?.focus(); return;
            }
            switch (e.key) {
                case "/":
                    e.preventDefault(); document.getElementById("searchInput")?.focus(); break;
                case "Escape": {
                    const wins = document.querySelectorAll(".pip-window");
                    if (wins.length) wins[wins.length-1].querySelector(".close-btn")?.click();
                    break;
                }
                case "ArrowRight": document.getElementById("loadMoreBtn")?.click(); break;
                case "ArrowDown": e.preventDefault(); this.navigate(1); break;
                case "ArrowUp":   e.preventDefault(); this.navigate(-1); break;
                case "Enter": {
                    const cards = this.getCards();
                    if (this.focused >= 0 && cards[this.focused]) cards[this.focused].click();
                    break;
                }
                case "q": case "Q": {
                    const cards = this.getCards();
                    if (this.focused >= 0 && cards[this.focused]) cards[this.focused].querySelector(".queue-btn")?.click();
                    break;
                }
            }
        });
    }
    static getCards() {
        const active = document.querySelector(".tab-content.active");
        return Array.from(active?.querySelectorAll(".video-card") || []);
    }
    static navigate(dir) {
        const cards = this.getCards();
        if (!cards.length) return;
        this.focused = Math.max(0, Math.min(cards.length-1, this.focused + dir));
        cards.forEach((c,i) => c.style.outline = i === this.focused ? "2px solid var(--accent)" : "");
        cards[this.focused].scrollIntoView({ behavior: "smooth", block: "center" });
    }
}

// ---------- Tabs ----------
class TabManager {
    static init(yt) {
        TabManager._yt = yt;
        document.querySelectorAll(".nav-tabs .tab").forEach(tab => {
            tab.addEventListener("click", () => TabManager.switch(tab.dataset.tab));
        });
    }
    static switch(name) {
        const map = {
            search: "searchTab", trending: "trendingTab", channel: "channelTab",
            watchlater: "watchlaterTab", queue: "queueTab", favorites: "favoritesTab",
            collections: "collectionsTab", history: "historyTab",
            playlist: "playlistTab", analytics: "analyticsTab",
            settings: "settingsTab", about: "aboutTab",
        };
        document.querySelectorAll(".nav-tabs .tab").forEach(t => t.classList.remove("active"));
        document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
        const tabEl = document.querySelector(`.nav-tabs .tab[data-tab="${name}"]`);
        tabEl?.classList.add("active");
        const target = map[name];
        if (target) document.getElementById(target)?.classList.add("active");
        const yt = TabManager._yt;
        if (name === "trending")    yt?.loadTrending();
        if (name === "queue")       QueueManager.render();
        if (name === "favorites")   FavoritesManager.render();
        if (name === "history")     HistoryManager.render();
        if (name === "watchlater")  WatchLater.render();
        if (name === "collections") Collections.render();
        if (name === "playlist")    Playlist.render();
        if (name === "analytics")   Analytics.render();
    }
}

// ---------- Session Restore ----------
class SessionManager {
    static save() {
        if (Privacy.incognito) return;
        const session = {
            searchQuery: document.getElementById("searchInput")?.value || "",
            currentTab: document.querySelector(".tab.active")?.dataset.tab || "search",
            openWindows: [...WindowManager._windows.values()].map(w => ({ id: w.videoId, title: w.title })),
            timestamp: Date.now(),
        };
        Storage.set("session", session);
    }
    static async maybeRestore() {
        const mode = Privacy.sessionMode;
        if (mode === "off") return;
        const s = Storage.get("session");
        if (!s) return;
        if (Date.now() - s.timestamp > 86400000) return; // 24h
        const doRestore = (mode === "auto") || confirm(Translator.t("confirm_restore_session"));
        if (!doRestore) return;
        const input = document.getElementById("searchInput");
        if (input && s.searchQuery) input.value = s.searchQuery;
        if (s.currentTab) {
            const t = document.querySelector(`.nav-tabs .tab[data-tab="${s.currentTab}"]`);
            t?.click();
        }
        Toast.show(Translator.t("toast_session_restored"), "success");
    }
}

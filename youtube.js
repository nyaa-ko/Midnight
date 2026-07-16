// ---------- YouTube manager (search/trending/channel) ----------
class YouTubeManager {
    constructor() {
        this.searchIds  = new Set();
        this.channelIds = new Set();
        this.currentContinuation = null;
        this.currentChannelContinuation = null;
        this.currentChannelId = null;
        this.currentChannelTab = "videos";
        this.currentFilter = "all";
        this.allResults = [];
        this.trendingLoaded = false;
        this._lastTrendCategory = null;
        this._smartFilters = null;
        this._inFlight = null;
        this._loadingMore = false;
    }

    static enc(s) { return encodeURIComponent((s || "").trim()); }

    initSuggest() {
        const input = document.getElementById("searchInput");
        const box   = document.getElementById("suggestBox");
        const clearBtn = document.getElementById("clearSearchBtn");
        if (!input) return;
        let timer;
        input.addEventListener("input", () => {
            const q = input.value.trim();
            clearBtn?.classList.toggle("visible", q.length > 0);
            clearTimeout(timer);
            if (!q) { if (box) box.style.display = "none"; return; }
            timer = setTimeout(async () => {
                try {
                    const data = await safeFetch(`${WORKER_URL}?suggest=${YouTubeManager.enc(q)}`, { timeout: 6000, retries: 1 });
                    if (!box) return;
                    if (Array.isArray(data) && data.length) {
                        box.innerHTML = "";
                        data.slice(0, 8).forEach(s => {
                            const d = document.createElement("div");
                            d.className = "suggest-item";
                            d.textContent = s;
                            d.onclick = () => { input.value = s; box.style.display = "none"; this.search(); };
                            box.appendChild(d);
                        });
                        box.style.display = "block";
                    } else { box.style.display = "none"; }
                } catch { if (box) box.style.display = "none"; }
            }, 260);
        });
        clearBtn?.addEventListener("click", () => {
            input.value = "";
            clearBtn.classList.remove("visible");
            if (box) box.style.display = "none";
            input.focus();
        });
        document.addEventListener("click", (e) => { if (e.target !== input && box) box.style.display = "none"; });
    }

    initFilterPills() {
        document.querySelectorAll("#filterPills .pill").forEach(pill => {
            pill.addEventListener("click", () => {
                document.querySelectorAll("#filterPills .pill").forEach(p => p.classList.remove("active"));
                pill.classList.add("active");
                this.currentFilter = (pill.dataset.filter || "all").toLowerCase();
                this.applyFilter();
            });
        });
    }

    applyFilter() {
        const f = this.currentFilter;
        const grids = [document.getElementById("searchResultsGrid"), document.getElementById("channelResultsGrid")];
        grids.forEach(grid => {
            if (!grid) return;
            grid.querySelectorAll(".video-card").forEach(card => {
                const type = (card.dataset.type || "video").toLowerCase();
                const channel = card.dataset.channel || "";
                if (ChannelMute.isMuted(channel)) { card.style.display = "none"; return; }
                if (type === "channel") { card.style.display = ""; return; }
                card.style.display = (f === "all" || type === f) ? "" : "none";
            });
        });
    }

    async search(isLoadMore = false) {
        const input = document.getElementById("searchInput");
        const grid  = document.getElementById("searchResultsGrid");
        const loadMore = document.getElementById("loadMoreBtn");
        const sortBar = document.getElementById("sortBar");
        const countEl = document.getElementById("resultCount");
        if (!input || !grid) return;

        const rawQ = input.value.trim();
        if (!rawQ) return;
        if (this._loadingMore && isLoadMore) return;

        // direct channel detect
        if (!isLoadMore && (rawQ.startsWith("@") || /^UC[\w-]{20,}$/.test(rawQ) || rawQ.includes("youtube.com/") || rawQ.includes("youtu.be/"))) {
            this.currentChannelTab = "videos";
            this.resetSubTabUI();
            this.openChannel(rawQ, rawQ);
            return;
        }

        const parsed = SmartSearch.parse(rawQ);
        const q = parsed.q || rawQ;
        if (!isLoadMore) this._smartFilters = parsed.filters;

        if (!isLoadMore) {
            grid.innerHTML = '<div class="loading">Searching…</div>';
            this.searchIds.clear();
            this.allResults = [];
            this.currentContinuation = null;
            if (loadMore) loadMore.style.display = "none";
            if (sortBar) sortBar.style.display = "none";
        }
        if (isLoadMore && loadMore) { loadMore.disabled = true; loadMore.textContent = "..."; }
        this._loadingMore = isLoadMore;

        // cache (initial only)
        if (!isLoadMore) {
            const cached = SearchCache.get(q, this.currentFilter);
            if (cached) {
                this._consumeSearchResults(cached, grid, sortBar, countEl, loadMore, false);
                return;
            }
        }

        let url = `${WORKER_URL}?q=${YouTubeManager.enc(q)}&type=search`;
        if (isLoadMore && this.currentContinuation) {
            url = `${WORKER_URL}?continuation=${YouTubeManager.enc(this.currentContinuation)}&type=search`;
        }

        let data;
        try {
            data = await safeFetch(url, { timeout: 12000, retries: 2 });
            DebugManager.log("OK " + (isLoadMore ? "more" : "search") + " " + q);
        } catch (e) {
            DebugManager.log("ERR " + e.message);
            Toast.show(Translator.t("toast_fetch_error") + e.message, "danger");
            if (!isLoadMore) grid.innerHTML = `<div class="no-results">${escapeHtml(Translator.t("toast_no_results"))}</div>`;
            if (loadMore) { loadMore.disabled = false; loadMore.textContent = Translator.t("btn_load_more"); }
            this._loadingMore = false;
            return;
        }
        if (!isLoadMore && data) SearchCache.set(q, this.currentFilter, data);
        this._consumeSearchResults(data, grid, sortBar, countEl, loadMore, isLoadMore);
    }

    _consumeSearchResults(data, grid, sortBar, countEl, loadMore, isLoadMore) {
        if (!isLoadMore) grid.innerHTML = "";
        if (data?.results?.length) {
            this.currentContinuation = data.continuation || null;
            // filter pipeline: smart filters + channel mute + dedup
            const filtered = data.results.filter(it => {
                if (!it || it.type === "channel" || !it.videoId) return false;
                if (ChannelMute.isMuted(it.channel)) return false;
                if (this._smartFilters && !SmartSearch.matchesFilters(it, this._smartFilters)) return false;
                return true;
            });
            if (filtered.length > 0) {
                this.renderItems(filtered, grid, this.searchIds, true);
                this.allResults.push(...filtered);
                if (sortBar) sortBar.style.display = "flex";
                if (countEl) countEl.textContent = `${this.searchIds.size}${Translator.t("result_count")}`;
            }
            // auto-fetch more if filter removed everything
            if (filtered.length === 0 && this.currentContinuation && this._smartFilters) {
                this._loadingMore = false;
                this.search(true);
                return;
            }
        } else if (!isLoadMore) {
            grid.innerHTML = `<div class="no-results">${escapeHtml(Translator.t("toast_no_results"))}</div>`;
        }

        if (loadMore) {
            loadMore.disabled = false;
            loadMore.textContent = Translator.t("btn_load_more");
            loadMore.style.display = this.currentContinuation ? "block" : "none";
        }
        this._loadingMore = false;
    }

    async loadTrending(category = "JP") {
        if (this.trendingLoaded && category === this._lastTrendCategory) return;
        this._lastTrendCategory = category;
        this.trendingLoaded = true;
        const grid = document.getElementById("trendingGrid");
        if (!grid) return;
        grid.innerHTML = '<div class="loading">Loading…</div>';
        const queryMap = { JP: "トレンド 日本", music: "音楽 ランキング", gaming: "ゲーム 人気", news: "ニュース 最新" };
        const q = queryMap[category] || "trending";
        try {
            const data = await safeFetch(`${WORKER_URL}?q=${YouTubeManager.enc(q)}`, { timeout: 12000, retries: 1 });
            grid.innerHTML = "";
            if (data?.results?.length) {
                const seen = new Set();
                data.results.slice(0, 24).forEach((item, idx) => {
                    if (!item.videoId || seen.has(item.videoId)) return;
                    if (ChannelMute.isMuted(item.channel)) return;
                    seen.add(item.videoId);
                    const card = this.buildCard(item, seen, false);
                    if (!card) return;
                    if (item.type !== "channel") {
                        const badge = document.createElement("div");
                        badge.className = "rank-badge";
                        badge.textContent = idx + 1;
                        card.querySelector(".thumbnail-wrapper")?.appendChild(badge);
                    }
                    grid.appendChild(card);
                });
            } else {
                grid.innerHTML = `<div class="no-results">${escapeHtml(Translator.t("toast_no_results"))}</div>`;
            }
        } catch (e) {
            grid.innerHTML = `<div class="no-results">${escapeHtml(Translator.t("toast_fetch_error") + e.message)}</div>`;
        }
    }

    async openChannel(handle, displayName, isSubTabClick = false) {
        const tabBtn  = document.getElementById("channelTabBtn");
        const tabLabel = document.getElementById("channelTabLabel");
        const grid    = document.getElementById("channelResultsGrid");
        const loadMore = document.getElementById("channelLoadMoreBtn");
        if (!tabBtn || !grid) return;
        tabBtn.style.display = "flex";
        const shortName = (displayName || "").replace(/^@/, "").substring(0, 16);
        if (tabLabel) tabLabel.textContent = shortName || "Channel";
        tabBtn.setAttribute("data-name", displayName || "");
        if (!isSubTabClick) {
            this.switchToChannelTab();
            this.currentChannelId = handle;
        }
        grid.innerHTML = '<div class="loading">Loading channel…</div>';
        this.channelIds.clear();
        this.currentChannelContinuation = null;
        try {
            const data = await safeFetch(`${WORKER_URL}?q=${YouTubeManager.enc(this.currentChannelId)}&tab=${this.currentChannelTab}`, { timeout: 12000, retries: 2 });
            grid.innerHTML = "";
            if (data?.results?.length) {
                this.currentChannelContinuation = data.continuation || null;
                const ch = data.results.find(r => r.type === "channel");
                if (ch) {
                    this.currentChannelId = ch.channelId || this.currentChannelId;
                    const heroEl = document.getElementById("channelHeader");
                    if (heroEl) {
                        heroEl.style.display = "flex";
                        heroEl.innerHTML = `
                            <img class="channel-hero-avatar" src="${escapeHtml(ch.thumbnail)}" onerror="this.style.display='none'" alt="">
                            <div>
                                <div class="channel-hero-name">${escapeHtml(ch.title)}</div>
                                <div class="channel-hero-sub">${escapeHtml(ch.publishedText || "Channel")}</div>
                            </div>`;
                    }
                }
                this.renderItems(data.results, grid, this.channelIds);
                if (loadMore) loadMore.style.display = this.currentChannelContinuation ? "block" : "none";
            } else {
                grid.innerHTML = `<div class="no-results">${escapeHtml(Translator.t("toast_no_results"))}</div>`;
                if (loadMore) loadMore.style.display = "none";
            }
        } catch (e) {
            grid.innerHTML = `<div class="no-results">${escapeHtml(Translator.t("toast_fetch_error") + e.message)}</div>`;
        }
        DebugManager.updateStats();
    }

    async loadMoreChannel() {
        if (!this.currentChannelContinuation || this._loadingMore) return;
        const grid = document.getElementById("channelResultsGrid");
        const loadMore = document.getElementById("channelLoadMoreBtn");
        this._loadingMore = true;
        if (loadMore) { loadMore.disabled = true; loadMore.textContent = "..."; }
        try {
            const data = await safeFetch(`${WORKER_URL}?continuation=${YouTubeManager.enc(this.currentChannelContinuation)}&type=browse`, { timeout: 12000, retries: 2 });
            if (data?.results) {
                this.currentChannelContinuation = data.continuation || null;
                this.renderItems(data.results, grid, this.channelIds);
            }
        } catch (e) {
            Toast.show(Translator.t("toast_fetch_error") + e.message, "danger");
        }
        if (loadMore) {
            loadMore.disabled = false;
            loadMore.textContent = Translator.t("btn_load_more");
            loadMore.style.display = this.currentChannelContinuation ? "block" : "none";
        }
        this._loadingMore = false;
    }

    resetSubTabUI() {
        document.getElementById("channelVideosSubTab")?.classList.add("active");
        document.getElementById("channelShortsSubTab")?.classList.remove("active");
    }
    switchSubTab(sel) {
        if (this.currentChannelTab === sel) return;
        this.currentChannelTab = sel;
        const v = document.getElementById("channelVideosSubTab");
        const s = document.getElementById("channelShortsSubTab");
        v?.classList.toggle("active", sel === "videos");
        s?.classList.toggle("active", sel === "shorts");
        const tabBtn = document.getElementById("channelTabBtn");
        const name = tabBtn?.getAttribute("data-name") || "";
        if (this.currentChannelId) this.openChannel(this.currentChannelId, name, true);
    }
    switchToChannelTab() {
        document.querySelectorAll(".nav-tabs .tab").forEach(t => t.classList.remove("active"));
        document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
        document.getElementById("channelTabBtn")?.classList.add("active");
        document.getElementById("channelTab")?.classList.add("active");
    }

    renderItems(items, grid, idSet, isSearch = false) {
        const noAnim = !Storage.get("cardAnimEnabled", true);
        const frag = document.createDocumentFragment();
        items.forEach(item => {
            const key = item.type === "channel" ? item.channelId : item.videoId;
            if (!key || idSet.has(key)) return;
            // forced classification per channel sub-tab
            if (item.type !== "channel") {
                if (this.currentChannelTab === "shorts") item.isShort = true;
            }
            idSet.add(key);
            const card = this.buildCard(item, idSet, isSearch, noAnim);
            if (card) frag.appendChild(card);
        });
        grid.appendChild(frag);
        this.applyFilter();
    }

    buildCard(item, idSet, isSearch, noAnim) {
        const card = document.createElement("div");
        card.className = "video-card" + (noAnim ? " no-anim" : "");
        if (item.type === "channel") {
            card.dataset.type = "channel";
            card.innerHTML = `
                <div class="thumbnail-wrapper" style="aspect-ratio:1/1; max-width:120px; margin:18px auto 0; border-radius:50%; border:2px solid var(--accent); overflow:hidden;">
                    <img src="${escapeHtml(item.thumbnail || "")}" onerror="this.src='https://placehold.co/120?text=CH'" loading="lazy" decoding="async" alt="">
                </div>
                <div class="card-info" style="text-align:center;">
                    <div class="card-title">${escapeHtml(item.title)}</div>
                    <div class="card-meta">${icon("channel","icon-xs")} ${escapeHtml(item.publishedText || "Channel")}</div>
                </div>`;
            card.onclick = () => this.openChannel(item.channelId, item.title);
            return card;
        }

        // views
        let rawViews = 0;
        if (item.viewCount) rawViews = parseInt(item.viewCount, 10) || 0;
        else if (item.views) rawViews = parseInt(String(item.views).replace(/[^0-9]/g, ""), 10) || 0;

        const cls = classifyItem(item);
        card.dataset.type = cls.type;
        card.dataset.views = rawViews;
        card.dataset.date = item.uploadDate || item.publishedText || "0";
        card.dataset.id = item.videoId;
        card.dataset.channel = item.channel || "";
        if (ChannelMute.isMuted(item.channel)) card.style.display = "none";

        const canClickChannel = item.channel && !["Unknown", "Channel Video"].includes(item.channel);
        const isFav = FavoritesManager.isFav(item.videoId);
        const prog = Resume.progress(item.videoId);

        const badge = cls.type === "short"
            ? `<span class="badge shorts-badge">SHORTS</span>`
            : cls.type === "live"
                ? `<span class="badge live-badge">LIVE</span>`
                : "";
        const duration = item.duration && cls.type !== "live"
            ? `<span class="duration-badge">${escapeHtml(item.duration)}</span>` : "";

        card.innerHTML = `
            <div class="thumbnail-wrapper">
                <img src="${escapeHtml(item.thumbnail || `https://i.ytimg.com/vi/${item.videoId}/mqdefault.jpg`)}" alt="" loading="lazy" decoding="async" onerror="this.src='https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg'">
                ${badge}
                ${duration}
                <div class="card-fav-dot${isFav ? " active" : ""}" data-id="${item.videoId}" title="favorite">${icon("star", isFav ? "filled" : "")}</div>
                <div class="card-overlay">
                    <button class="overlay-btn play-btn" title="${escapeHtml(Translator.t("btn_play"))}">${icon("play")}</button>
                    <button class="overlay-btn queue-btn" title="${escapeHtml(Translator.t("ctx_queue"))}">${icon("queue", "icon-sm")}</button>
                    <button class="overlay-btn wl-btn" title="${escapeHtml(Translator.t("ctx_watch_later"))}">${icon("bookmark", "icon-sm")}</button>
                    <button class="overlay-btn fav-btn" title="${escapeHtml(Translator.t("ctx_fav"))}">${icon("star", isFav ? "filled" : "")}</button>
                    <button class="overlay-btn copy-btn" title="${escapeHtml(Translator.t("ctx_copy"))}">${icon("link", "icon-sm")}</button>
                </div>
                ${prog > 0 ? `<div class="resume-bar"><span style="width:${prog*100}%"></span></div>` : ""}
            </div>
            <div class="card-info">
                <div class="card-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</div>
                <div class="card-channel${canClickChannel ? " clickable" : ""}">${escapeHtml(item.channel || "")}</div>
                <div class="card-meta">${escapeHtml(item.publishedText || "")}${rawViews ? ` · ${rawViews.toLocaleString()} views` : ""}</div>
            </div>`;

        if (canClickChannel) {
            card.querySelector(".card-channel").onclick = (e) => {
                e.stopPropagation();
                const name = item.channel;
                const q = item.channelId ? item.channelId : (name.startsWith("@") ? name : `@${name}`);
                this.currentChannelTab = "videos";
                this.resetSubTabUI();
                this.openChannel(q, name);
            };
        }

        card.querySelector(".play-btn").onclick  = (e) => { e.stopPropagation(); WindowManager.createWindow(item.videoId, item.title); };
        card.querySelector(".queue-btn").onclick = (e) => { e.stopPropagation(); QueueManager.add({ id: item.videoId, title: item.title, channel: item.channel || "" }); };
        card.querySelector(".wl-btn").onclick    = (e) => { e.stopPropagation(); WatchLater.add({ id: item.videoId, title: item.title, channel: item.channel || "" }); };
        card.querySelector(".fav-btn").onclick   = (e) => {
            e.stopPropagation();
            FavoritesManager.toggle({ id: item.videoId, title: item.title, channel: item.channel || "" });
        };
        card.querySelector(".copy-btn").onclick  = (e) => {
            e.stopPropagation();
            navigator.clipboard?.writeText(`https://youtu.be/${item.videoId}`);
            Toast.show(Translator.t("toast_url_copied"), "success");
        };
        card.querySelector(".card-fav-dot").onclick = (e) => {
            e.stopPropagation();
            FavoritesManager.toggle({ id: item.videoId, title: item.title, channel: item.channel || "" });
        };

        card.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            ContextMenu.show(e.clientX, e.clientY, { videoId: item.videoId, title: item.title, channel: item.channel || "" });
        });
        card.onclick = () => WindowManager.createWindow(item.videoId, item.title);
        return card;
    }
}

// ---------- Init ----------
document.addEventListener("DOMContentLoaded", () => {
    Translator.init();
    Privacy.initBadge();

    const yt = new YouTubeManager();
    window.yt = yt;

    ThemeManager.init();
    TabManager.init(yt);
    yt.initSuggest();
    yt.initFilterPills();
    KeyboardManager.init(yt);
    ContextMenu.init();
    DebugManager.init();

    new WaveEngine();
    new ParticleEngine();

    // trending pills
    document.querySelectorAll(".trending-category-pills .pill").forEach(p => {
        p.addEventListener("click", () => {
            document.querySelectorAll(".trending-category-pills .pill").forEach(x => x.classList.remove("active"));
            p.classList.add("active");
            yt.trendingLoaded = false;
            yt.loadTrending(p.dataset.trend);
        });
    });

    // Channel sub tabs
    document.getElementById("channelVideosSubTab")?.addEventListener("click", () => yt.switchSubTab("videos"));
    document.getElementById("channelShortsSubTab")?.addEventListener("click", () => yt.switchSubTab("shorts"));
    document.getElementById("channelMuteBtn")?.addEventListener("click", () => {
        const name = document.getElementById("channelTabBtn")?.getAttribute("data-name");
        if (name) ChannelMute.toggle(name);
    });

    // Search wiring with debounce
    const searchBtn = document.getElementById("searchBtn");
    const searchInput = document.getElementById("searchInput");
    searchBtn?.addEventListener("click", () => yt.search());
    let enterTimer;
    searchInput?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            clearTimeout(enterTimer);
            enterTimer = setTimeout(() => yt.search(), 50);
        }
    });

    document.getElementById("loadMoreBtn")?.addEventListener("click", () => yt.search(true));
    document.getElementById("channelLoadMoreBtn")?.addEventListener("click", () => yt.loadMoreChannel());

    // Queue
    document.getElementById("clearQueueBtn")?.addEventListener("click",   () => QueueManager.clear());
    document.getElementById("shuffleQueueBtn")?.addEventListener("click", () => QueueManager.shuffle());
    document.getElementById("playAllBtn")?.addEventListener("click",      () => QueueManager.playAll());

    // History
    document.getElementById("clearHistoryBtn")?.addEventListener("click", () => HistoryManager.clearAll());
    let histTimer;
    document.getElementById("historySearch")?.addEventListener("input", (e) => {
        clearTimeout(histTimer);
        histTimer = setTimeout(() => HistoryManager.render(e.target.value), 180);
    });

    // Fav sort
    document.getElementById("favSortSelect")?.addEventListener("change", () => FavoritesManager.render());

    // Watch Later
    document.getElementById("watchLaterPlayAllBtn")?.addEventListener("click", () => WatchLater.playAll());
    document.getElementById("watchLaterClearBtn")?.addEventListener("click", () => WatchLater.clear());

    // Collections
    document.getElementById("newCollectionBtn")?.addEventListener("click", () => Collections.create());

    // Settings
    document.getElementById("windowSizeSelect")?.addEventListener("change", (e) => Storage.set("windowSize", e.target.value));
    document.getElementById("maxWindowsSelect")?.addEventListener("change", (e) => Storage.set("maxWindows", e.target.value));
    document.getElementById("autoplayToggle")?.addEventListener("change", (e) => Storage.set("autoplayEnabled", e.target.checked));

    // Privacy controls
    const incog = document.getElementById("incognitoToggle");
    if (incog) {
        incog.checked = Privacy.incognito;
        incog.addEventListener("change", (e) => Privacy.setIncognito(e.target.checked));
    }
    const histEn = document.getElementById("historyEnabledToggle");
    if (histEn) {
        histEn.checked = Storage.get("historyEnabled", true) !== false;
        histEn.addEventListener("change", (e) => Storage.set("historyEnabled", e.target.checked));
    }
    const resumeSel = document.getElementById("resumeModeSelect");
    if (resumeSel) {
        resumeSel.value = Storage.get("resumeMode", "auto");
        resumeSel.addEventListener("change", (e) => Storage.set("resumeMode", e.target.value));
    }
    const sessSel = document.getElementById("sessionModeSelect");
    if (sessSel) {
        sessSel.value = Storage.get("sessionMode", "ask");
        sessSel.addEventListener("change", (e) => Storage.set("sessionMode", e.target.value));
    }

    // Export / Import
    document.getElementById("exportDataBtn")?.addEventListener("click", () => Privacy.exportAll());
    const importBtn = document.getElementById("importDataBtn");
    const importInput = document.getElementById("importFileInput");
    importBtn?.addEventListener("click", () => importInput?.click());
    importInput?.addEventListener("change", (e) => {
        const f = e.target.files?.[0];
        if (f) Privacy.importAll(f);
    });

    // Sort
    document.querySelectorAll("#sortBar .sort-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll("#sortBar .sort-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            const grid = document.getElementById("searchResultsGrid");
            if (!grid) return;
            const cards = Array.from(grid.querySelectorAll(".video-card"));
            const sortType = btn.dataset.sort;
            if (sortType === "default") return;
            cards.sort((a, b) => {
                if (sortType === "views") return (parseInt(b.dataset.views||0,10)) - (parseInt(a.dataset.views||0,10));
                if (sortType === "date")  return String(b.dataset.date||"").localeCompare(String(a.dataset.date||""));
                return 0;
            });
            const frag = document.createDocumentFragment();
            cards.forEach(c => frag.appendChild(c));
            grid.appendChild(frag);
            yt.applyFilter();
            Toast.show(Translator.t("toast_sort_applied") + btn.textContent.trim(), "success");
        });
    });

    // Initial renders
    WatchLater.updateBadge();
    QueueManager.save();
    FavoritesManager.render();
    HistoryManager.render();
    QueueManager.render();
    WatchLater.render();
    Collections.render();

    // Set settings select initial
    const winSizeSel = document.getElementById("windowSizeSelect");
    const maxWinSel  = document.getElementById("maxWindowsSelect");
    const autoSel    = document.getElementById("autoplayToggle");
    if (winSizeSel) winSizeSel.value = Storage.get("windowSize", "medium");
    if (maxWinSel)  maxWinSel.value  = String(Storage.get("maxWindows", 5));
    if (autoSel)    autoSel.checked  = Storage.get("autoplayEnabled", true);

    Toast.show(Translator.t("toast_init_done"), "success");
    DebugManager.updateStats();

    // Session restore (after init)
    setTimeout(() => SessionManager.maybeRestore(), 600);

    // Save session on unload (privacy-guarded)
    window.addEventListener("beforeunload", () => SessionManager.save());

    // Translator callbacks re-render content
    Translator.onLangChangeCallbacks.push(() => {
        QueueManager.render(); FavoritesManager.render();
        HistoryManager.render(); WatchLater.render(); Collections.render();
    });

    // ===== V11 add-ons init =====
    try { MiniBar.init(); } catch(e) { console.warn("MiniBar:", e); }
    try { QuickActions.init(); } catch(e) { console.warn("QuickActions:", e); }
    try { Shortcuts.init(); } catch(e) { console.warn("Shortcuts:", e); }

    // Sidebar quick buttons
    document.getElementById("sideRandomBtn")?.addEventListener("click", () => RandomPlay.go());
    document.getElementById("sideQkBtn")?.addEventListener("click", () => QuickActions.show());
    document.getElementById("sideHelpBtn")?.addEventListener("click", () => Shortcuts.show());

    // Track search history when search runs
    const _origSearchBtn = document.getElementById("searchBtn");
    _origSearchBtn?.addEventListener("click", () => {
        const v = document.getElementById("searchInput")?.value;
        if (v) SearchHistory.add(v);
    });
    document.getElementById("searchInput")?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            const v = e.target.value; if (v) SearchHistory.add(v);
        }
    });

    // Font size
    const fs = document.getElementById("fontSizeSelect");
    const applyFs = (v) => { document.body.classList.remove("fs-sm","fs-md","fs-lg","fs-xl"); document.body.classList.add("fs-" + v); };
    if (fs) {
        fs.value = Storage.get("fontSize", "md");
        applyFs(fs.value);
        fs.addEventListener("change", (e) => { Storage.set("fontSize", e.target.value); applyFs(e.target.value); });
    }
    // High contrast
    const hc = document.getElementById("highContrastToggle");
    if (hc) {
        hc.checked = !!Storage.get("highContrast", false);
        if (hc.checked) document.body.classList.add("high-contrast");
        hc.addEventListener("change", (e) => {
            Storage.set("highContrast", e.target.checked);
            document.body.classList.toggle("high-contrast", e.target.checked);
        });
    }
});

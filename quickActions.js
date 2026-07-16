// ---------- Quick Actions Palette (Cmd/Ctrl + K) ----------
class QuickActions {
    static commands = [];
    static init() {
        this.commands = [
            { id: "search", label: "検索タブを開く", run: () => TabManager.switch("search") },
            { id: "trending", label: "急上昇を開く", run: () => TabManager.switch("trending") },
            { id: "watchlater", label: "後で見るを開く", run: () => TabManager.switch("watchlater") },
            { id: "queue", label: "キューを開く", run: () => TabManager.switch("queue") },
            { id: "favorites", label: "お気に入りを開く", run: () => TabManager.switch("favorites") },
            { id: "collections", label: "コレクションを開く", run: () => TabManager.switch("collections") },
            { id: "history", label: "履歴を開く", run: () => TabManager.switch("history") },
            { id: "analytics", label: "Analytics Lite を開く", run: () => TabManager.switch("analytics") },
            { id: "playlist", label: "プレイリストを開く", run: () => TabManager.switch("playlist") },
            { id: "settings", label: "設定を開く", run: () => TabManager.switch("settings") },
            { id: "incog-on", label: "プライベートモード ON", run: () => Privacy.setIncognito(true) },
            { id: "incog-off", label: "プライベートモード OFF", run: () => Privacy.setIncognito(false) },
            { id: "play-queue", label: "キューをすべて再生", run: () => QueueManager.playAll() },
            { id: "shuffle-queue", label: "キューをシャッフル", run: () => QueueManager.shuffle() },
            { id: "clear-queue", label: "キューをクリア", run: () => QueueManager.clear() },
            { id: "play-wl", label: "後で見るをすべて再生", run: () => WatchLater.playAll() },
            { id: "random", label: "ランダム再生", run: () => RandomPlay.go() },
            { id: "close-all", label: "すべてのウィンドウを閉じる", run: () => WindowManager.closeAll() },
            { id: "pause-all", label: "全ウィンドウ一時停止", run: () => WindowManager.sendAll("pauseVideo") },
            { id: "play-all", label: "全ウィンドウ再生", run: () => WindowManager.sendAll("playVideo") },
            { id: "layout-2", label: "ウィンドウ 2x2 配置", run: () => WindowManager.layout("2x2") },
            { id: "layout-3", label: "ウィンドウ 3x3 配置", run: () => WindowManager.layout("3x3") },
            { id: "export", label: "全データをエクスポート", run: () => Privacy.exportAll() },
            { id: "shortcuts", label: "キーボードショートカット", run: () => Shortcuts.show() },
            { id: "theme-cycle", label: "テーマを切り替え", run: () => ThemeManager.cycle?.() || Toast.show("theme cycle","success") },
            { id: "lang-ja", label: "言語: 日本語", run: () => Translator.setLang("ja") },
            { id: "lang-en", label: "Language: English", run: () => Translator.setLang("en") },
            { id: "clear-history", label: "履歴をクリア", run: () => HistoryManager.clearAll() },
            { id: "wipe-all", label: "全データ削除", run: () => Privacy.wipeAll?.() || (confirm("全データ削除？") && (localStorage.clear(), location.reload())) },
        ];
        let modal = document.getElementById("qaModal");
        if (!modal) {
            modal = document.createElement("div");
            modal.id = "qaModal"; modal.className = "qa-modal"; modal.style.display = "none";
            modal.innerHTML = `<div class="qa-box">
                <input id="qaInput" placeholder="コマンド検索... (Esc で閉じる)" autocomplete="off">
                <div id="qaList" class="qa-list"></div>
            </div>`;
            document.body.appendChild(modal);
            modal.addEventListener("click", (e) => { if (e.target === modal) this.hide(); });
            const input = modal.querySelector("#qaInput");
            input.addEventListener("input", () => this.renderList(input.value));
            input.addEventListener("keydown", (e) => {
                if (e.key === "Escape") this.hide();
                if (e.key === "Enter") {
                    const first = modal.querySelector(".qa-item");
                    first?.click();
                }
            });
        }
        document.addEventListener("keydown", (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault(); this.toggle();
            }
        });
    }
    static toggle() {
        const m = document.getElementById("qaModal");
        if (!m) return;
        if (m.style.display === "flex") this.hide(); else this.show();
    }
    static show() {
        const m = document.getElementById("qaModal");
        m.style.display = "flex";
        const inp = m.querySelector("#qaInput");
        inp.value = ""; this.renderList(""); setTimeout(() => inp.focus(), 30);
    }
    static hide() {
        const m = document.getElementById("qaModal");
        if (m) m.style.display = "none";
    }
    static renderList(q) {
        const list = document.getElementById("qaList");
        const ql = q.trim().toLowerCase();
        const filtered = this.commands.filter(c => !ql || c.label.toLowerCase().includes(ql) || c.id.includes(ql));
        list.innerHTML = filtered.map(c =>
            `<div class="qa-item" data-id="${c.id}">${escapeHtml(c.label)}<span class="qa-id">${c.id}</span></div>`
        ).join("") || `<div class="qa-empty">該当なし</div>`;
        list.querySelectorAll(".qa-item").forEach(el => el.addEventListener("click", () => {
            const cmd = this.commands.find(c => c.id === el.dataset.id);
            this.hide();
            try { cmd?.run(); } catch (e) { Toast.show("実行失敗: " + e.message, "error"); }
        }));
    }
}

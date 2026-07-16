// ---------- Playlist ----------
class Playlist {
    static KEY = "playlists";
    static all() { return Storage.get(this.KEY, []) || []; }
    static save(list) { Storage.set(this.KEY, list); }
    static create() {
        const name = prompt("プレイリスト名:");
        if (!name) return;
        const list = this.all();
        list.push({ id: "pl_" + Date.now(), name: name.trim(), items: [], created: Date.now() });
        this.save(list); this.render(); Toast.show("プレイリスト作成: " + name, "success");
    }
    static remove(id) {
        if (!confirm("削除しますか？")) return;
        this.save(this.all().filter(p => p.id !== id)); this.render();
    }
    static addTo(id, video) {
        const list = this.all();
        const pl = list.find(p => p.id === id); if (!pl) return;
        if (pl.items.some(i => i.id === video.id)) return Toast.show("既に追加済み", "warning");
        pl.items.push({ id: video.id, title: video.title || "Untitled", channel: video.channel || "" });
        this.save(list); this.render(); Toast.show("追加: " + pl.name, "success");
    }
    static removeItem(plId, vid) {
        const list = this.all(); const pl = list.find(p => p.id === plId);
        if (!pl) return; pl.items = pl.items.filter(i => i.id !== vid);
        this.save(list); this.render();
    }
    static playAll(id) {
        const pl = this.all().find(p => p.id === id); if (!pl) return;
        pl.items.forEach(it => QueueManager.add({ id: it.id, title: it.title, channel: it.channel }));
        QueueManager.playAll();
    }
    static exportOne(id) {
        const pl = this.all().find(p => p.id === id); if (!pl) return;
        const blob = new Blob([JSON.stringify(pl, null, 2)], { type: "application/json" });
        const u = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = u; a.download = `playlist_${pl.name}.json`; a.click();
        URL.revokeObjectURL(u);
    }
    static importFile(file) {
        const r = new FileReader();
        r.onload = () => {
            try {
                const data = JSON.parse(r.result);
                if (!data.name || !Array.isArray(data.items)) throw new Error("Invalid");
                const list = this.all();
                data.id = "pl_" + Date.now();
                list.push(data); this.save(list); this.render();
                Toast.show("インポート完了: " + data.name, "success");
            } catch (e) { Toast.show("インポート失敗", "error"); }
        };
        r.readAsText(file);
    }
    static render() {
        const root = document.getElementById("playlistTab");
        if (!root) return;
        const list = this.all();
        root.innerHTML = `
            <div class="section-header-row">
                <h3><svg class="icon"><use href="#icon-queue"/></svg> プレイリスト</h3>
                <div style="display:flex; gap:8px;">
                    <button class="sort-btn active" id="plNewBtn"><svg class="icon icon-sm"><use href="#icon-plus"/></svg> 新規</button>
                    <button class="sort-btn" id="plImportBtn">Import</button>
                    <input type="file" id="plImportInput" accept="application/json" style="display:none;">
                </div>
            </div>
            <div class="pl-list">
                ${list.length ? list.map(pl => `
                    <div class="pl-card">
                        <div class="pl-head">
                            <h4>${escapeHtml(pl.name)} <small>(${pl.items.length})</small></h4>
                            <div>
                                <button class="sort-btn" data-act="play" data-id="${pl.id}">すべて再生</button>
                                <button class="sort-btn" data-act="export" data-id="${pl.id}">Export</button>
                                <button class="sort-btn danger" data-act="del" data-id="${pl.id}">削除</button>
                            </div>
                        </div>
                        <ul class="pl-items">
                            ${pl.items.map(it => `
                                <li>
                                    <span class="pl-it-title" data-id="${it.id}" data-title="${escapeHtml(it.title)}">${escapeHtml(it.title)}</span>
                                    <button class="pl-x" data-pid="${pl.id}" data-vid="${it.id}">✕</button>
                                </li>`).join("") || "<li class='pl-empty'>動画なし — カードから右クリックで追加</li>"}
                        </ul>
                    </div>
                `).join("") : "<div class='no-results'>プレイリストはまだありません</div>"}
            </div>
        `;
        root.querySelector("#plNewBtn")?.addEventListener("click", () => this.create());
        root.querySelector("#plImportBtn")?.addEventListener("click", () => root.querySelector("#plImportInput").click());
        root.querySelector("#plImportInput")?.addEventListener("change", (e) => {
            const f = e.target.files?.[0]; if (f) this.importFile(f);
        });
        root.querySelectorAll("[data-act]").forEach(b => b.addEventListener("click", () => {
            const id = b.dataset.id;
            if (b.dataset.act === "play") this.playAll(id);
            else if (b.dataset.act === "export") this.exportOne(id);
            else if (b.dataset.act === "del") this.remove(id);
        }));
        root.querySelectorAll(".pl-it-title").forEach(el => el.addEventListener("click", () => {
            WindowManager.createWindow(el.dataset.id, el.dataset.title);
        }));
        root.querySelectorAll(".pl-x").forEach(b => b.addEventListener("click", () =>
            this.removeItem(b.dataset.pid, b.dataset.vid)));
    }
}

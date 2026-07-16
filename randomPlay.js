// ---------- Random Play ----------
class RandomPlay {
    static pool() {
        const fav = Storage.get("favorites", []) || [];
        const wl  = Storage.get("watchLater", []) || [];
        const hist = (Storage.get("history", []) || []).slice(0, 80);
        const all = [...fav, ...wl, ...hist].filter(v => v && (v.id || v.videoId));
        const seen = new Set(); const out = [];
        for (const v of all) {
            const id = v.id || v.videoId;
            if (seen.has(id)) continue;
            seen.add(id);
            out.push({ id, title: v.title || "Untitled" });
        }
        return out;
    }
    static go() {
        const p = this.pool();
        if (!p.length) { Toast.show("ランダム再生できる動画がありません", "warning"); return; }
        const pick = p[Math.floor(Math.random() * p.length)];
        WindowManager.createWindow(pick.id, pick.title);
        Toast.show("ランダム: " + pick.title.slice(0,30), "success");
    }
}

// ---------- Mini Player Bar ----------
class MiniBar {
    static init() {
        let bar = document.getElementById("miniBar");
        if (!bar) {
            bar = document.createElement("div");
            bar.id = "miniBar";
            bar.className = "mini-bar";
            document.body.appendChild(bar);
        }
        WindowManager.onChange.push(() => this.render());
        this.render();
    }
    static render() {
        const bar = document.getElementById("miniBar");
        if (!bar) return;
        const wins = WindowManager.list();
        if (!wins.length) { bar.style.display = "none"; return; }
        bar.style.display = "flex";
        bar.innerHTML = `
            <div class="mb-left">
                <button class="mb-btn" data-act="layout-2" title="2x2">▦</button>
                <button class="mb-btn" data-act="layout-3" title="3x3">⊞</button>
                <button class="mb-btn" data-act="pauseAll" title="pause all">‖</button>
                <button class="mb-btn" data-act="playAll" title="play all">▶</button>
                <button class="mb-btn danger" data-act="closeAll" title="close all">✕</button>
            </div>
            <div class="mb-list">
                ${wins.map(w => `
                    <div class="mb-item" data-key="${escapeHtml(w.key)}">
                        <span class="mb-title" title="${escapeHtml(w.title)}">${escapeHtml(w.title.slice(0,40))}</span>
                        <button class="mb-x" data-close="${escapeHtml(w.key)}">✕</button>
                    </div>`).join("")}
            </div>
        `;
        bar.querySelectorAll(".mb-btn").forEach(b => b.addEventListener("click", () => {
            const a = b.dataset.act;
            if (a === "layout-2") WindowManager.layout("2x2");
            else if (a === "layout-3") WindowManager.layout("3x3");
            else if (a === "pauseAll") WindowManager.sendAll("pauseVideo");
            else if (a === "playAll") WindowManager.sendAll("playVideo");
            else if (a === "closeAll") WindowManager.closeAll();
        }));
        bar.querySelectorAll(".mb-x").forEach(b => b.addEventListener("click", (e) => {
            e.stopPropagation();
            WindowManager._destroy(b.dataset.close);
        }));
        bar.querySelectorAll(".mb-item").forEach(it => it.addEventListener("click", (e) => {
            if (e.target.classList.contains("mb-x")) return;
            const rec = WindowManager._windows.get(it.dataset.key);
            if (rec) WindowManager._bringToFront(rec.el);
        }));
    }
}

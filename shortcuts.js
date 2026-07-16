// ---------- Keyboard Shortcuts Help ----------
class Shortcuts {
    static list = [
        ["Cmd/Ctrl + K", "クイックアクション パレット"],
        ["?", "このヘルプ"],
        ["/", "検索ボックスへフォーカス"],
        ["r", "ランダム再生"],
        ["i", "プライベートモード切替"],
        ["1〜9", "サイドバータブ切替"],
        ["Esc", "モーダル/メニューを閉じる"],
        ["Space", "アクティブウィンドウ 再生/停止 (将来)"],
    ];
    static init() {
        let m = document.getElementById("kbModal");
        if (!m) {
            m = document.createElement("div");
            m.id = "kbModal"; m.className = "qa-modal"; m.style.display = "none";
            m.innerHTML = `<div class="qa-box">
                <div class="kb-head">キーボードショートカット</div>
                <div class="kb-list">${this.list.map(([k,v]) =>
                    `<div class="kb-row"><kbd>${escapeHtml(k)}</kbd><span>${escapeHtml(v)}</span></div>`).join("")}</div>
                <button class="sort-btn" id="kbClose" style="margin-top:14px;">閉じる</button>
            </div>`;
            document.body.appendChild(m);
            m.addEventListener("click", (e) => { if (e.target === m) this.hide(); });
            m.querySelector("#kbClose").addEventListener("click", () => this.hide());
        }
        document.addEventListener("keydown", (e) => {
            if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
            if (e.key === "?") { e.preventDefault(); this.show(); }
            else if (e.key === "/") { e.preventDefault(); document.getElementById("searchInput")?.focus(); }
            else if (e.key.toLowerCase() === "r") { RandomPlay.go(); }
            else if (e.key.toLowerCase() === "i") { Privacy.setIncognito(!Privacy.incognito); }
            else if (e.key === "Escape") { this.hide(); QuickActions.hide(); }
            else if (/^[1-9]$/.test(e.key)) {
                const tabs = ["search","trending","watchlater","queue","favorites","collections","history","playlist","analytics"];
                const t = tabs[parseInt(e.key,10)-1]; if (t) TabManager.switch(t);
            }
        });
    }
    static show() { const m = document.getElementById("kbModal"); if (m) m.style.display = "flex"; }
    static hide() { const m = document.getElementById("kbModal"); if (m) m.style.display = "none"; }
}

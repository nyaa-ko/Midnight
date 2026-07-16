// ---------- Analytics Lite ----------
class Analytics {
    static compute() {
        const hist = Storage.get("history", []) || [];
        const channelCount = {};
        let shorts = 0, live = 0, normal = 0;
        const recent7 = Array(7).fill(0);
        const now = Date.now(), DAY = 86400_000;
        for (const h of hist) {
            const ch = h.channel || "(unknown)";
            channelCount[ch] = (channelCount[ch] || 0) + 1;
            if (h.isShort) shorts++;
            else if (h.isLive) live++;
            else normal++;
            if (h.ts) {
                const diff = Math.floor((now - h.ts) / DAY);
                if (diff >= 0 && diff < 7) recent7[6 - diff]++;
            }
        }
        const topChannels = Object.entries(channelCount)
            .sort((a, b) => b[1] - a[1]).slice(0, 10);
        return { topChannels, shorts, live, normal, recent7, total: hist.length };
    }
    static render() {
        const root = document.getElementById("analyticsTab");
        if (!root) return;
        const a = this.compute();
        const total = a.shorts + a.live + a.normal || 1;
        const pct = n => Math.round(n / total * 100);
        const max7 = Math.max(1, ...a.recent7);
        root.innerHTML = `
            <div class="section-header-row">
                <h3><svg class="icon"><use href="#icon-trending"/></svg> Analytics Lite</h3>
                <span class="ana-sub">履歴 ${a.total} 件から集計（localStorage のみ）</span>
            </div>
            <div class="ana-grid">
                <div class="ana-card">
                    <h4>動画種類の比率</h4>
                    <div class="ana-bar"><span style="width:${pct(a.normal)}%; background:#7c5cff" title="通常 ${a.normal}"></span></div>
                    <div class="ana-bar"><span style="width:${pct(a.live)}%; background:#ff5252" title="ライブ ${a.live}"></span></div>
                    <div class="ana-bar"><span style="width:${pct(a.shorts)}%; background:#22c55e" title="Shorts ${a.shorts}"></span></div>
                    <div class="ana-legend">
                        <span><i style="background:#7c5cff"></i>通常 ${a.normal} (${pct(a.normal)}%)</span>
                        <span><i style="background:#ff5252"></i>ライブ ${a.live} (${pct(a.live)}%)</span>
                        <span><i style="background:#22c55e"></i>Shorts ${a.shorts} (${pct(a.shorts)}%)</span>
                    </div>
                </div>
                <div class="ana-card">
                    <h4>最近 7 日の視聴数</h4>
                    <div class="ana-chart">
                        ${a.recent7.map((v,i)=>`<div class="ana-col"><span style="height:${Math.round(v/max7*100)}%"></span><b>${v}</b><em>D-${6-i}</em></div>`).join("")}
                    </div>
                </div>
                <div class="ana-card wide">
                    <h4>よく見るチャンネル Top10</h4>
                    <ol class="ana-top">
                        ${a.topChannels.map(([ch, c]) => `<li><span>${escapeHtml(ch)}</span><b>${c}</b></li>`).join("") || "<li>データなし</li>"}
                    </ol>
                </div>
            </div>
        `;
    }
}

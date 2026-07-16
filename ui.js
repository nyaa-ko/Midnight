// ---------- Toast ----------
class Toast {
    static show(message, type = "default", duration = 1800) {
        const container = document.getElementById("toastContainer");
        if (!container) return;
        const iconMap = { success: "check", warning: "warning", danger: "error", default: "info" };
        const t = document.createElement("div");
        t.className = `toast${type !== "default" ? " " + type : ""}`;
        t.innerHTML = `${icon(iconMap[type] || "info", "icon-sm")}<span>${escapeHtml(message)}</span>`;
        container.appendChild(t);
        setTimeout(() => {
            t.style.transition = "opacity .3s, transform .3s";
            t.style.opacity = "0";
            t.style.transform = "translateX(-10px)";
            setTimeout(() => t.remove(), 320);
        }, duration);
    }
}

// ---------- Theme ----------
class ThemeManager {
    static init() {
        const themeSelect    = document.getElementById("themeSelect");
        const accentPicker   = document.getElementById("accentColorPicker");
        const accentLabel    = document.getElementById("accentHexLabel");
        const debugToggle    = document.getElementById("debugToggleSetting");
        const waveToggle     = document.getElementById("waveToggle");
        const particleToggle = document.getElementById("particleToggle");
        const cardAnimToggle = document.getElementById("cardAnimToggle");
        const resetBtn       = document.getElementById("resetAllBtn");

        const saved = {
            theme:    Storage.get("theme", "midnight"),
            accent:   Storage.get("customAccent", "#7c5cff"),
            hideDbg:  Storage.get("hideDebug", false),
            wave:     Storage.get("waveEnabled", true),
            particle: Storage.get("particleEnabled", true),
            cardAnim: Storage.get("cardAnimEnabled", true),
        };

        if (themeSelect)    themeSelect.value = saved.theme;
        if (accentPicker)   accentPicker.value = saved.accent;
        if (accentLabel)    accentLabel.textContent = saved.accent;
        if (debugToggle)    debugToggle.checked = saved.hideDbg;
        if (waveToggle)     waveToggle.checked = saved.wave;
        if (particleToggle) particleToggle.checked = saved.particle;
        if (cardAnimToggle) cardAnimToggle.checked = saved.cardAnim;

        this.apply(saved.theme, saved.accent);
        this.toggleDebug(!saved.hideDbg);

        themeSelect?.addEventListener("change", () => {
            this.apply(themeSelect.value, accentPicker.value);
            Storage.set("theme", themeSelect.value);
            Toast.show(`${Translator.t("toast_theme_changed")}${themeSelect.value}`, "success");
        });
        accentPicker?.addEventListener("input", (e) => {
            this.apply(themeSelect.value, e.target.value);
            Storage.set("customAccent", e.target.value);
            if (accentLabel) accentLabel.textContent = e.target.value;
        });
        debugToggle?.addEventListener("change", (e) => {
            Storage.set("hideDebug", e.target.checked);
            this.toggleDebug(!e.target.checked);
        });
        waveToggle?.addEventListener("change", (e) => {
            Storage.set("waveEnabled", e.target.checked);
            const c = document.getElementById("waveCanvas");
            if (c) c.style.display = e.target.checked ? "block" : "none";
        });
        particleToggle?.addEventListener("change", (e) => {
            Storage.set("particleEnabled", e.target.checked);
            const c = document.getElementById("particleCanvas");
            if (c) c.style.display = e.target.checked ? "block" : "none";
        });
        cardAnimToggle?.addEventListener("change", (e) => {
            Storage.set("cardAnimEnabled", e.target.checked);
            document.querySelectorAll(".video-card").forEach(c => c.classList.toggle("no-anim", !e.target.checked));
        });

        resetBtn?.addEventListener("click", () => {
            if (!confirm(Translator.t("confirm_reset"))) return;
            try { localStorage.clear(); } catch {}
            Toast.show(Translator.t("toast_reset_success"), "danger");
            setTimeout(() => location.reload(), 800);
        });
    }

    static apply(theme, accentColor = "#7c5cff") {
        document.body.className = `theme-${theme}`;
        const root = document.documentElement;
        root.style.setProperty("--accent", accentColor);
        root.style.setProperty("--accent2", this.lighten(accentColor, 28));
        root.style.setProperty("--accent-glow", this.hexToRgba(accentColor, 0.22));

        let style = document.getElementById("dyn-accent");
        if (!style) {
            style = document.createElement("style");
            style.id = "dyn-accent";
            document.head.appendChild(style);
        }
        style.textContent = `:root{--accent:${accentColor}!important;--accent2:${this.lighten(accentColor,28)}!important;--accent-glow:${this.hexToRgba(accentColor,0.22)}!important;}`;
    }
    static lighten(hex, pct) {
        if (!hex || hex.length < 7) return hex;
        let r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
        r = Math.min(255, r + Math.round((255-r)*pct/100));
        g = Math.min(255, g + Math.round((255-g)*pct/100));
        b = Math.min(255, b + Math.round((255-b)*pct/100));
        return `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${b.toString(16).padStart(2,"0")}`;
    }
    static hexToRgba(hex, a) {
        if (!hex || hex.length < 7) return `rgba(124,92,255,${a})`;
        const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
        return `rgba(${r},${g},${b},${a})`;
    }
    static toggleDebug(show) {
        const panel = document.getElementById("debugPanel");
        if (panel) panel.style.display = show ? "flex" : "none";
    }
}

// ---------- Wave / Particle (memory-safe) ----------
class WaveEngine {
    constructor() {
        this.canvas = document.getElementById("waveCanvas");
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext("2d");
        this.phase = 0;
        this.enabled = Storage.get("waveEnabled", true);
        this.running = false;
        
        // HBL用のパーティクル配列
        this.particles = [];
        
        if (!this.enabled) { this.canvas.style.display = "none"; return; }
        this._resize = () => this.resize();
        window.addEventListener("resize", this._resize, { passive: true });
        this.resize();
        this.running = true;
        requestAnimationFrame(this.loop);
    }
    
    resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;
        this.canvas.style.width = window.innerWidth + "px";
        this.canvas.style.height = window.innerHeight + "px";
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    
    updateHBLParticles(w, h) {
        const maxParticles = Math.floor((w * h) / 12000);
        if (this.particles.length < maxParticles && Math.random() < 0.15) {
            this.particles.push({
                x: Math.random() * w,
                y: h + 40,
                size: 15 + Math.random() * 30,
                speed: 0.3 + Math.random() * 0.6,
                opacity: 0.08 + Math.random() * 0.15,
                angle: Math.random() * Math.PI
            });
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.y -= p.speed;
            if (p.y < -p.size) {
                this.particles.splice(i, 1);
                continue;
            }
            this.ctx.save();
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate(p.angle);
            // 実機写真の、少し黄色がかった明るい光の四角形
            this.ctx.fillStyle = `rgba(225, 255, 235, ${p.opacity})`;
            this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            this.ctx.restore();
        }
    }

    loop = () => {
        if (!this.running || !this.canvas) return;
        const w = window.innerWidth, h = window.innerHeight;
        this.ctx.clearRect(0, 0, w, h);
        this.phase += 0.01;

        const isHBL = document.body.classList.contains("theme-hbl");
        const rainbow = document.body.classList.contains("theme-rainbow");

        // --- 1. HBL専用のパーティクル（背景より手前に描画） ---
        if (isHBL) {
            this.updateHBLParticles(w, h);
        } else {
            if (this.particles.length > 0) this.particles = [];
        }

        // --- 2. 波と背景の描画 ---
        if (isHBL) {
            // 【HBL専用】
            // ① まず画面全体を「下の明るい水色」で塗りつぶす
            this.ctx.fillStyle = "#26ccf1"; 
            this.ctx.fillRect(0, 0, w, h);

            // ② 1層だけの波のパスを作る
            this.ctx.beginPath();
            const amp = 50; // 波の揺れ幅
            const baseY = h * 0.30; // 波の位置（画面の上寄りに配置）
            
            for (let x = 0; x <= w; x += 8) {
                // 実機のような緩やかな1本の波
                const y = baseY + Math.sin(x * 0.005 + this.phase * 0.6) * amp;
                x === 0 ? this.ctx.moveTo(x, y) : this.ctx.lineTo(x, y);
            }

            // ③ 波の「上側」を濃い青緑で塗りつぶす
            this.ctx.save();
            this.ctx.lineTo(w, 0); 
            this.ctx.lineTo(0, 0);
            this.ctx.closePath();
            this.ctx.fillStyle = "#0095D9"; // 上画面の濃い青緑
            this.ctx.fill();
            this.ctx.restore();

            // ④ 境界線（太くて濃いエメラルドグリーンの枠線）を描く
            this.ctx.beginPath();
            for (let x = 0; x <= w; x += 8) {
                const y = baseY + Math.sin(x * 0.005 + this.phase * 0.6) * amp;
                x === 0 ? this.ctx.moveTo(x, y) : this.ctx.lineTo(x, y);
            }
            this.ctx.strokeStyle = "#00A2E8"; // 濃いエメラルドグリーンの枠線
            this.ctx.lineWidth = 4; // 線をはっきり太く
            this.ctx.shadowBlur = 4; // ほんのり光沢
            this.ctx.shadowColor = "#ffffff";
            this.ctx.stroke();
            this.ctx.shadowBlur = 0; // シャドウをリセット

        } else {
            // 【通常のテーマ処理（midnight, cyber, rainbowなど従来通り）】
            const accent = getComputedStyle(document.body).getPropertyValue("--accent").trim() || "#7c5cff";
            const rgb = this.hexToRgb(accent);

            for (let layer = 0; layer < 3; layer++) {
                this.ctx.beginPath();
                const amp = 24 + layer * 20, speed = 0.5 + layer * 0.25;
                const baseY = h * (0.60 + layer * 0.06);
                
                for (let x = 0; x <= w; x += 8) {
                    const y = baseY + Math.sin(x * 0.006 + this.phase * speed) * amp
                                    + Math.sin(x * 0.012 + this.phase * speed * 0.7) * (amp * 0.4);
                    x === 0 ? this.ctx.moveTo(x, y) : this.ctx.lineTo(x, y);
                }
                
                this.ctx.lineTo(w, h); this.ctx.lineTo(0, h);
                this.ctx.closePath();

                if (rainbow) {
                    const hue = (this.phase * 25 + layer * 50) % 360;
                    this.ctx.fillStyle = `hsla(${hue},100%,65%,${0.06 + layer*0.04})`;
                } else {
                    this.ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${0.05 + layer*0.035})`;
                }
                this.ctx.fill();
            }
        }

        requestAnimationFrame(this.loop);
    }
    
    hexToRgb(hex) {
        if (!hex) return { r:124, g:92, b:255 };
        hex = hex.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, (_, r, g, b) => r+r+g+g+b+b);
        const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return m ? { r:parseInt(m[1],16), g:parseInt(m[2],16), b:parseInt(m[3],16) } : { r:124, g:92, b:255 };
    }
    
    destroy() { this.running = false; window.removeEventListener("resize", this._resize); }
}

class ParticleEngine {
    constructor() {
        this.container = document.getElementById("particleCanvas");
        if (!this.container) return;

        this.enabled = Storage.get("particleEnabled", true);

        if (!this.enabled) {
            this.container.style.display = "none";
            return;
        }

        const isHBL = document.body.classList.contains("theme-hbl");

        this.particles = [];
        this.max = isHBL ? 80 : 24; // 実機に合わせて少し軽めの密度に調整（お好みで増やせます）

        this.timer = setInterval(
            () => this.spawn(),
            isHBL ? 120 : 300 // 湧き出る間隔を少しゆったりにして優雅に
        );
    }

    spawn() {
        if (!this.enabled || !this.container) return;
        if (this.particles.length >= this.max) return;

        const isHBL = document.body.classList.contains("theme-hbl");
        const p = document.createElement("div");

        // 実機っぽいサイズ設定（大きいものから小さいものまで）
        const size = isHBL
            ? 16 + Math.random() * 36
            : 2 + Math.random() * 3;

        // ゆったりと遅い速度で下から上へ移動させる
        const duration = isHBL
            ? 2 + Math.random() * 3
            : 4 + Math.random() * 1.5;

        // 実機の「半透明で優しい光」を再現
        const opacity = isHBL
            ? 0.2 + Math.random() * 0.4
            : 5;
        const x = Math.random() * 100;
        const delay = Math.random();

        // HBLの時は回転させず水平を維持、アニメーションを専用の「hblFloat」に切り替え
        p.style.cssText = `
            position:absolute;
            left:${x}%;
            bottom:-60px;

            width:${size}px;
            height:${size}px;

            border-radius:${isHBL ? "0" : "50%"};

            background:${
                isHBL
                    ? "rgba(230, 255, 245, " + opacity + ")"
                    : "var(--accent)"
            };

            opacity:0;
            pointer-events:none;
            animation:${isHBL ? 'hblFloat' : 'particleFloat'} ${duration}s ${delay}s linear forwards;

            box-shadow:${
                isHBL
                    ? "none" /* 実機はボケていないシャープな四角形なのでグローはなし */
                    : "0 0 " + size + "px var(--accent)"
            };
        `;

        this.container.appendChild(p);
        this.particles.push(p);

        setTimeout(() => {
            p.remove();
            this.particles = this.particles.filter(x => x !== p);
        }, (duration + delay) * 1000);
    }
}

// inject keyframes once (HBL専用の滑らかな浮上アニメーションを追加)
(function injectParticleKeyframes() {
    const s = document.createElement("style");
    s.textContent = `
    @keyframes particleFloat {
        0% { transform:translateY(0) scale(0); opacity:0; }
        10% { opacity:.7; transform:translateY(-20px) scale(1); }
        90% { opacity:.3; }
        100% { transform:translateY(-100vh) scale(0.5); opacity:0; }
    }
    /* 【HBL専用】まっすぐ形を保ったままフェードイン・アウトして上昇 */
    @keyframes hblFloat {
        0% { transform:translateY(0); opacity:0; }
        15% { opacity:1; }
        85% { opacity:1; }
        100% { transform:translateY(-110vh); opacity:0; }
    }`;
    document.head.appendChild(s);
})();

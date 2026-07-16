// ---------- Watch Later ----------
class WatchLater {
    static list = Storage.get("watchLater", []);
    static save() { Storage.set("watchLater", this.list); this.updateBadge(); }
    static add(item) {
        if (this.list.find(v => v.id === item.id)) {
            Toast.show(Translator.t("toast_wl_exists"), "warning"); return;
        }
        this.list.unshift({ id: item.id, title: item.title, channel: item.channel || "", addedAt: Date.now() });
        this.save();
        Toast.show(Translator.t("toast_wl_added"), "success");
        this.render();
    }
    static remove(id) {
        this.list = this.list.filter(v => v.id !== id);
        this.save(); this.render();
        Toast.show(Translator.t("toast_wl_removed"));
    }
    static clear() {
        if (!confirm(Translator.t("confirm_wl_clear"))) return;
        this.list = []; this.save(); this.render();
    }
    static playAll() {
        if (!this.list.length) { Toast.show(Translator.t("empty_watchlater"), "warning"); return; }
        this.list.forEach((it, i) => setTimeout(() => WindowManager.createWindow(it.id, it.title), i * 700));
    }
    static updateBadge() {
        const b = document.getElementById("watchLaterBadge");
        if (b) b.textContent = this.list.length;
    }
    static render() {
        const grid = document.getElementById("watchLaterGrid");
        if (!grid) return;
        grid.innerHTML = "";
        if (!this.list.length) {
            grid.innerHTML = `<div class="no-results">${escapeHtml(Translator.t("empty_watchlater"))}</div>`;
            return;
        }
        this.list.forEach(item => {
            const card = document.createElement("div");
            card.className = "video-card";
            card.innerHTML = `
                <div class="thumbnail-wrapper">
                    <img src="https://i.ytimg.com/vi/${item.id}/mqdefault.jpg" loading="lazy" decoding="async" alt="">
                    <div class="card-overlay">
                        <button class="overlay-btn wl-play" title="${escapeHtml(Translator.t("btn_play"))}">${icon("play")}</button>
                        <button class="overlay-btn wl-remove" title="${escapeHtml(Translator.t("btn_remove"))}">${icon("trash")}</button>
                    </div>
                </div>
                <div class="card-info">
                    <div class="card-title">${escapeHtml(item.title)}</div>
                    <div class="card-meta">${icon("clock", "icon-xs")} ${new Date(item.addedAt || 0).toLocaleDateString()}</div>
                </div>`;
            card.querySelector(".wl-play").onclick = (e) => { e.stopPropagation(); WindowManager.createWindow(item.id, item.title); };
            card.querySelector(".wl-remove").onclick = (e) => { e.stopPropagation(); this.remove(item.id); };
            card.onclick = () => WindowManager.createWindow(item.id, item.title);
            grid.appendChild(card);
        });
    }
}

// ---------- Resume (playback position) ----------
class Resume {
    /** position store: { [videoId]: { sec, dur, ts } } */
    static get store() { return Storage.get("resumePos", {}); }
    static save(videoId, sec, dur) {
        if (!Privacy.resumeEnabled || !videoId) return;
        if (sec < 5) return; // ignore tiny
        if (dur && sec > dur - 8) { this.clear(videoId); return; }
        const s = this.store;
        s[videoId] = { sec: Math.floor(sec), dur: Math.floor(dur || 0), ts: Date.now() };
        Storage.set("resumePos", s);
    }
    static get(videoId) { return this.store[videoId] || null; }
    static clear(videoId) {
        const s = this.store; delete s[videoId]; Storage.set("resumePos", s);
    }
    static async maybePrompt(videoId) {
        if (!Privacy.resumeEnabled) return 0;
        const r = this.get(videoId);
        if (!r) return 0;
        if (Privacy.resumeMode === "auto") return r.sec;
        if (Privacy.resumeMode === "ask") {
            if (confirm(Translator.tpl("confirm_resume_play", formatSeconds(r.sec)))) return r.sec;
            this.clear(videoId);
        }
        return 0;
    }
    /** Returns 0..1 watch progress for resume bar */
    static progress(videoId) {
        const r = this.get(videoId);
        if (!r || !r.dur) return 0;
        return Math.min(1, r.sec / r.dur);
    }
}

// ---------- Notes ----------
class Notes {
    static get all() { return Storage.get("notes", {}); }
    static get(videoId) { return this.all[videoId] || []; }
    static add(videoId) {
        const text = prompt(Translator.t("prompt_note"));
        if (text == null) return;
        const notes = this.all;
        const list = notes[videoId] || [];
        list.push({ text: String(text).trim(), ts: Date.now() });
        notes[videoId] = list;
        Storage.set("notes", notes);
        Toast.show(Translator.t("toast_note_saved"), "success");
    }
}

// ---------- Tags ----------
class Tags {
    static get all() { return Storage.get("tags", {}); }
    static get(videoId) { return this.all[videoId] || []; }
    static edit(videoId) {
        const existing = (this.get(videoId) || []).join(", ");
        const v = prompt(Translator.t("prompt_tag"), existing);
        if (v == null) return;
        const arr = v.split(",").map(s => s.trim()).filter(Boolean);
        const t = this.all;
        if (!arr.length) delete t[videoId]; else t[videoId] = arr;
        Storage.set("tags", t);
        Toast.show(Translator.t("toast_tag_saved"), "success");
    }
}

// ---------- Collections ----------
class Collections {
    static get list() { return Storage.get("collections", []); }
    static save(list) { Storage.set("collections", list); }
    static create() {
        const name = prompt(Translator.t("prompt_collection_name"));
        if (!name) return;
        const l = this.list;
        l.push({ id: "c_" + Date.now(), name: String(name).trim(), items: [] });
        this.save(l);
        Toast.show(Translator.t("toast_coll_created") + name, "success");
        this.render();
    }
    static addTo(collId, item) {
        const l = this.list; const c = l.find(x => x.id === collId);
        if (!c) return;
        if (c.items.find(v => v.id === item.id)) return;
        c.items.push({ id: item.id, title: item.title, channel: item.channel || "" });
        this.save(l); this.render();
    }
    static remove(collId) {
        const l = this.list.filter(c => c.id !== collId);
        this.save(l); this.render();
    }
    static render() {
        const el = document.getElementById("collectionsList");
        if (!el) return;
        const l = this.list;
        el.innerHTML = "";
        if (!l.length) {
            el.innerHTML = `<div class="no-results">${escapeHtml(Translator.t("empty_collections"))}</div>`;
            return;
        }
        l.forEach(c => {
            const wrap = document.createElement("div");
            wrap.className = "setting-group";
            wrap.innerHTML = `
                <h4>${icon("folder")} ${escapeHtml(c.name)} <span class="tag-chip">${c.items.length}</span>
                    <button class="sort-btn danger" style="margin-left:auto;" data-act="del">${icon("trash", "icon-sm")}</button>
                </h4>
                <div class="results-grid" style="grid-template-columns:repeat(auto-fill, minmax(180px, 1fr));"></div>`;
            const grid = wrap.querySelector(".results-grid");
            c.items.forEach(it => {
                const card = document.createElement("div");
                card.className = "video-card";
                card.innerHTML = `
                    <div class="thumbnail-wrapper"><img src="https://i.ytimg.com/vi/${it.id}/mqdefault.jpg" loading="lazy" decoding="async" alt=""></div>
                    <div class="card-info"><div class="card-title">${escapeHtml(it.title)}</div></div>`;
                card.onclick = () => WindowManager.createWindow(it.id, it.title);
                grid.appendChild(card);
            });
            wrap.querySelector('[data-act="del"]').onclick = () => { if (confirm("Delete collection?")) this.remove(c.id); };
            el.appendChild(wrap);
        });
    }
}

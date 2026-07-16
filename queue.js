// ---------- Queue ----------
class QueueManager {
    static queue = Storage.get("queue", []);

    static add(item) {
        if (this.queue.find(v => v.id === item.id)) {
            Toast.show(Translator.t("toast_queue_exists"), "warning"); return;
        }
        this.queue.push({ id: item.id, title: item.title, channel: item.channel || "" });
        this.save();
        Toast.show(Translator.t("toast_queue_added") + item.title.substring(0, 24), "success");
        this.render();
        DebugManager.updateStats();
    }
    static remove(id) {
        this.queue = this.queue.filter(v => v.id !== id);
        this.save(); this.render(); DebugManager.updateStats();
    }
    static clear() {
        this.queue = []; this.save(); this.render();
        Toast.show(Translator.t("toast_queue_cleared"));
        DebugManager.updateStats();
    }
    static shuffle() {
        for (let i = this.queue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
        }
        this.save(); this.render();
        Toast.show(Translator.t("toast_queue_shuffled"));
    }
    static playAll() {
        if (!this.queue.length) { Toast.show(Translator.t("toast_queue_empty"), "warning"); return; }
        this.queue.forEach((it, i) => setTimeout(() => WindowManager.createWindow(it.id, it.title), i * 800));
    }
    static save() {
        Storage.set("queue", this.queue);
        const b = document.getElementById("queueBadge");
        if (b) b.textContent = this.queue.length;
    }
    static render() {
        const list = document.getElementById("queueList");
        if (!list) return;
        list.innerHTML = "";
        if (!this.queue.length) {
            list.innerHTML = `<div class="no-results">${escapeHtml(Translator.t("empty_queue"))}</div>`;
            return;
        }
        this.queue.forEach((item, idx) => {
            const el = document.createElement("div");
            el.className = "queue-item";
            el.draggable = true;
            el.dataset.id = item.id;
            el.innerHTML = `
                <div class="queue-drag-handle">${icon("drag")}</div>
                <div class="q-num">${idx + 1}</div>
                <div class="queue-thumb"><img src="https://i.ytimg.com/vi/${item.id}/mqdefault.jpg" loading="lazy" decoding="async" alt=""></div>
                <div class="queue-info">
                    <div class="queue-title">${escapeHtml(item.title)}</div>
                    <div class="queue-channel">${escapeHtml(item.channel || "")}</div>
                </div>
                <button class="queue-remove" title="${escapeHtml(Translator.t("btn_remove"))}">${icon("close", "icon-sm")}</button>`;
            el.querySelector(".queue-remove").onclick = (e) => { e.stopPropagation(); this.remove(item.id); };
            el.onclick = () => WindowManager.createWindow(item.id, item.title);
            // drag reorder
            el.addEventListener("dragstart", (e) => { e.dataTransfer.setData("text/id", item.id); el.style.opacity = "0.5"; });
            el.addEventListener("dragend", () => { el.style.opacity = ""; });
            el.addEventListener("dragover", (e) => { e.preventDefault(); });
            el.addEventListener("drop", (e) => {
                e.preventDefault();
                const fromId = e.dataTransfer.getData("text/id");
                if (!fromId || fromId === item.id) return;
                const fromIdx = this.queue.findIndex(v => v.id === fromId);
                const toIdx = this.queue.findIndex(v => v.id === item.id);
                if (fromIdx < 0 || toIdx < 0) return;
                const [moved] = this.queue.splice(fromIdx, 1);
                this.queue.splice(toIdx, 0, moved);
                this.save(); this.render();
            });
            list.appendChild(el);
        });
    }
}

// ---------- Favorites ----------
class FavoritesManager {
    static toggle(item) {
        let list = Storage.get("favorites", []);
        const idx = list.findIndex(v => v.id === item.id);
        if (idx > -1) {
            list.splice(idx, 1);
            Toast.show(Translator.t("toast_fav_removed"));
        } else {
            list.push({ id: item.id, title: item.title, channel: item.channel || "", addedAt: Date.now() });
            Toast.show(Translator.t("toast_fav_added"), "success");
        }
        Storage.set("favorites", list);
        this.render(); DebugManager.updateStats();
        document.querySelectorAll(".card-fav-dot").forEach(dot => {
            const id = dot.dataset.id;
            dot.classList.toggle("active", !!list.find(v => v.id === id));
        });
    }
    static isFav(id) { return !!Storage.get("favorites", []).find(v => v.id === id); }
    static render() {
        const grid = document.getElementById("favoritesGrid");
        const sortSel = document.getElementById("favSortSelect");
        if (!grid) return;
        let list = Storage.get("favorites", []);
        if (sortSel?.value === "alpha") list = [...list].sort((a,b) => a.title.localeCompare(b.title));
        grid.innerHTML = "";
        if (!list.length) {
            grid.innerHTML = `<div class="no-results">${escapeHtml(Translator.t("empty_favorites"))}</div>`;
            return;
        }
        list.forEach(item => {
            const card = document.createElement("div");
            card.className = "video-card";
            card.innerHTML = `
                <div class="thumbnail-wrapper">
                    <img src="https://i.ytimg.com/vi/${item.id}/mqdefault.jpg" loading="lazy" decoding="async" alt="">
                    <div class="card-overlay">
                        <button class="overlay-btn fav-play-btn" title="${escapeHtml(Translator.t("btn_play"))}">${icon("play")}</button>
                        <button class="overlay-btn fav-remove-btn" title="${escapeHtml(Translator.t("btn_remove"))}">${icon("close")}</button>
                    </div>
                </div>
                <div class="card-info">
                    <div class="card-title">${escapeHtml(item.title)}</div>
                    <div class="card-meta">${icon("clock","icon-xs")} ${new Date(item.addedAt || 0).toLocaleDateString()}</div>
                </div>`;
            card.querySelector(".fav-play-btn").onclick = (e) => { e.stopPropagation(); WindowManager.createWindow(item.id, item.title); };
            card.querySelector(".fav-remove-btn").onclick = (e) => { e.stopPropagation(); this.toggle(item); };
            card.onclick = () => WindowManager.createWindow(item.id, item.title);
            grid.appendChild(card);
        });
    }
}

// ---------- History ----------
class HistoryManager {
    static add(item) {
        if (!Privacy.historyEnabled) return;
        let list = Storage.get("history", []);
        list = list.filter(v => v.id !== item.id);
        list.unshift({ id: item.id, title: item.title, channel: item.channel || "", ts: Date.now() });
        Storage.set("history", list.slice(0, 100));
        this.render();
    }
    static clearAll() {
        if (!confirm(Translator.t("confirm_hist_clear"))) return;
        Storage.set("history", []);
        this.render();
        Toast.show(Translator.t("toast_hist_cleared"), "danger");
    }
    static render(filter = "") {
        const grid = document.getElementById("historyGrid");
        if (!grid) return;
        let list = Storage.get("history", []);
        if (filter) {
            const f = filter.toLowerCase();
            list = list.filter(v => v.title.toLowerCase().includes(f));
        }
        grid.innerHTML = "";
        if (!list.length) {
            grid.innerHTML = `<div class="no-results">${escapeHtml(filter ? Translator.t("empty_history_search") : Translator.t("empty_history"))}</div>`;
            return;
        }
        list.forEach(item => {
            const card = document.createElement("div");
            card.className = "video-card";
            const dateStr = new Date(item.ts).toLocaleString(undefined, { month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" });
            const prog = Resume.progress(item.id);
            card.innerHTML = `
                <div class="thumbnail-wrapper">
                    <img src="https://i.ytimg.com/vi/${item.id}/mqdefault.jpg" loading="lazy" decoding="async" alt="">
                    <div class="card-overlay">
                        <button class="overlay-btn">${icon("play")}</button>
                    </div>
                    ${prog > 0 ? `<div class="resume-bar"><span style="width:${prog*100}%"></span></div>` : ""}
                </div>
                <div class="card-info">
                    <div class="card-title">${escapeHtml(item.title)}</div>
                    <div class="card-meta">${icon("clock","icon-xs")} ${dateStr}</div>
                </div>`;
            card.onclick = () => WindowManager.createWindow(item.id, item.title);
            grid.appendChild(card);
        });
    }
}

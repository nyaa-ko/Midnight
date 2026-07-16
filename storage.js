// ---------- Storage ----------
class Storage {
    static get(key, fallback = null) {
        try {
            const v = localStorage.getItem(key);
            return v !== null ? JSON.parse(v) : fallback;
        } catch { return fallback; }
    }
    static set(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {
            console.warn("Storage.set failed:", e);
        }
    }
    static remove(key) { try { localStorage.removeItem(key); } catch {} }
    static dump() {
        const out = {};
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            try { out[k] = JSON.parse(localStorage.getItem(k)); }
            catch { out[k] = localStorage.getItem(k); }
        }
        return out;
    }
}

// ---------- Privacy (Incognito) ----------
class Privacy {
    static get incognito()      { return !!Storage.get("incognito", false); }
    static get historyEnabled() { return !this.incognito && Storage.get("historyEnabled", true) !== false; }
    static get resumeEnabled()  { return !this.incognito && Storage.get("resumeMode", "auto") !== "off"; }
    static get resumeMode()     { return this.incognito ? "off" : Storage.get("resumeMode", "auto"); }
    static get sessionMode()    { return this.incognito ? "off" : Storage.get("sessionMode", "ask"); }

    static setIncognito(on) {
        Storage.set("incognito", !!on);
        const badge = document.getElementById("incognitoBadge");
        if (badge) badge.classList.toggle("visible", !!on);
        Toast.show(Translator.t(on ? "toast_incognito_on" : "toast_incognito_off"), on ? "warning" : "success");
    }

    static initBadge() {
        const badge = document.getElementById("incognitoBadge");
        if (badge) badge.classList.toggle("visible", this.incognito);
    }

    /** Export all app data as JSON */
    static exportAll() {
        const blob = new Blob([JSON.stringify(Storage.dump(), null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `midnight-export-${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        Toast.show(Translator.t("toast_export_done"), "success");
    }

    static async importAll(file) {
        try {
            const text = await file.text();
            const obj = JSON.parse(text);
            if (!obj || typeof obj !== "object") throw new Error("invalid");
            Object.entries(obj).forEach(([k, v]) => Storage.set(k, v));
            Toast.show(Translator.t("toast_import_done"), "success");
            setTimeout(() => location.reload(), 800);
        } catch {
            Toast.show(Translator.t("toast_import_error"), "danger");
        }
    }
}

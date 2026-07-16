// ---------- Smart search parser ----------
class SmartSearch {
    // input: "shorts cat", "live minecraft", "music >10m", "channel:hololive"
    static parse(query) {
        let q = String(query || "").trim();
        const filters = { type: null, channel: null, minSec: null, maxSec: null };
        // type prefix
        if (/^shorts?\s+/i.test(q))   { filters.type = "short"; q = q.replace(/^shorts?\s+/i, ""); }
        else if (/^live\s+/i.test(q)) { filters.type = "live";  q = q.replace(/^live\s+/i, ""); }
        // channel:name
        const ch = q.match(/(?:^|\s)channel:(\S+)/i);
        if (ch) { filters.channel = ch[1]; q = q.replace(ch[0], "").trim(); }
        // duration >Xm / <Xm
        const gt = q.match(/(?:^|\s)>(\d+)m\b/i);
        if (gt) { filters.minSec = parseInt(gt[1], 10) * 60; q = q.replace(gt[0], "").trim(); }
        const lt = q.match(/(?:^|\s)<(\d+)m\b/i);
        if (lt) { filters.maxSec = parseInt(lt[1], 10) * 60; q = q.replace(lt[0], "").trim(); }
        return { q: q.trim(), filters };
    }

    static matchesFilters(item, filters) {
        if (!filters) return true;
        const cls = classifyItem(item);
        if (filters.type === "short" && !cls.isShort) return false;
        if (filters.type === "live"  && !cls.isLive)  return false;
        if (filters.channel) {
            const cName = String(item.channel || "").toLowerCase();
            if (!cName.includes(filters.channel.toLowerCase())) return false;
        }
        if (filters.minSec || filters.maxSec) {
            const sec = parseDurationToSec(item.duration);
            if (filters.minSec && sec < filters.minSec) return false;
            if (filters.maxSec && sec > filters.maxSec) return false;
        }
        return true;
    }
}

// ---------- Channel Mute ----------
class ChannelMute {
    static set = new Set(Storage.get("channelMute", []));
    static save() { Storage.set("channelMute", [...this.set]); }
    static isMuted(channel) {
        if (!channel) return false;
        return this.set.has(String(channel).toLowerCase());
    }
    static toggle(channel) {
        if (!channel) return;
        const k = String(channel).toLowerCase();
        if (this.set.has(k)) {
            this.set.delete(k);
            Toast.show(Translator.t("toast_channel_unmuted"), "success");
        } else {
            this.set.add(k);
            Toast.show(Translator.t("toast_channel_muted"), "warning");
        }
        this.save();
        // immediately hide muted cards
        document.querySelectorAll(".video-card").forEach(c => {
            const ch = c.dataset.channel?.toLowerCase();
            if (ch === k) c.style.display = this.set.has(k) ? "none" : "";
        });
    }
}

// ---------- Search Cache ----------
class SearchCache {
    static cache = new Map();
    static maxSize = 40;
    static ttl = 5 * 60 * 1000;
    static key(q, filter) { return `${q}::${filter}`; }
    static get(q, filter) {
        const e = this.cache.get(this.key(q, filter));
        if (!e) return null;
        if (Date.now() - e.t > this.ttl) { this.cache.delete(this.key(q, filter)); return null; }
        return e.data;
    }
    static set(q, filter, data) {
        if (this.cache.size >= this.maxSize) this.cache.delete(this.cache.keys().next().value);
        this.cache.set(this.key(q, filter), { data, t: Date.now() });
    }
    static size() { return this.cache.size; }
}

// ---------- Search History (localStorage) ----------
class SearchHistory {
    static KEY = "searchHistory";
    static MAX = 30;
    static add(q) {
        q = (q || "").trim();
        if (!q || Privacy.incognito) return;
        const list = (Storage.get(this.KEY, []) || []).filter(x => x !== q);
        list.unshift(q);
        Storage.set(this.KEY, list.slice(0, this.MAX));
    }
    static all() { return Storage.get(this.KEY, []) || []; }
    static remove(q) {
        Storage.set(this.KEY, this.all().filter(x => x !== q));
    }
    static clear() { Storage.set(this.KEY, []); Toast.show("検索履歴をクリア", "success"); }
}

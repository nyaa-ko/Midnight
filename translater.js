// =============================================================
//   Midnight YouTube V10 — translater.js (emoji-free)
// =============================================================

class Translator {
    static currentLang = localStorage.getItem("app_lang") || "ja";
    static onLangChangeCallbacks = [];

    static locales = {
        ja: {
            tab_search: "検索", tab_trending: "急上昇", tab_channel: "チャンネル",
            tab_watchlater: "後で見る", tab_queue: "キュー", tab_favorites: "お気に入り",
            tab_collections: "コレクション", tab_history: "履歴",
            tab_settings: "設定", tab_about: "情報", logo_sub: "YouTube",

            pill_all: "すべて", pill_video: "動画", pill_live: "ライブ", pill_short: "ショート",

            sort_title: "並べ替え", sort_default: "関連度順",
            sort_views: "視聴回数順", sort_date: "投稿日順", result_count: "件",

            btn_queue_shuffle: "シャッフル", btn_queue_clear: "クリア",
            btn_history_clear: "履歴をクリア", btn_load_more: "さらに読み込む",
            btn_play_all: "すべて再生", btn_clear_all: "すべて削除",
            btn_play: "再生", btn_remove: "削除", btn_close: "閉じる",
            opt_fav_date: "追加日順", opt_fav_title: "名前順 (A-Z)",

            search_placeholder: "キーワード、@ハンドル、channel:名 / shorts cat / music >10m ...",
            no_results_search: "検索バーにキーワードを入力して探してみましょう。",
            trending_category_jp: "総合 (日本)", trending_category_music: "音楽",
            trending_category_gaming: "ゲーム", trending_category_news: "ニュース",
            channel_videos: "動画", channel_shorts: "ショート",
            channel_playlists: "プレイリスト", channel_mute: "ミュート",

            watchlater_title: "後で見る", queue_title: "再生キュー",
            fav_title: "お気に入り", coll_title: "コレクション", coll_new: "新規作成",
            hist_title: "視聴履歴 (最大100件)", hist_search_ph: "履歴から検索...",

            set_title_privacy: "プライバシー",
            set_privacy_desc: "履歴・お気に入り・Resume位置などすべてのデータはこの端末のブラウザにのみ保存され、外部送信されません。",
            set_incognito: "インコグニトモード（履歴・Resume・検索履歴を一切記録しない）",
            set_history_enabled: "視聴履歴を保存する",
            set_resume_mode: "再生位置の自動保存（Playback Resume）",
            resume_auto: "自動再開", resume_ask: "毎回確認", resume_off: "無効",

            set_title_session: "セッション復元",
            set_session_mode: "起動時のセッション復元モード",
            session_off: "無効", session_ask: "起動時に確認", session_auto: "自動復元",

            set_title_appearance: "外観・テーマ",
            set_base_theme: "ベーステーマ",
            theme_midnight: "Midnight Deep", theme_oled: "Absolute OLED",
            theme_cyber: "Cyber Neon", theme_neon: "Neon Pink",
            theme_glass: "Frosted Glass", theme_aurora: "Northern Aurora",
            theme_rose: "Velvet Rose", theme_rainbow: "Dynamic Rainbow",
            set_accent_color: "アクセントカラー",

            set_title_player: "プレイヤー",
            set_window_size: "デフォルトウィンドウサイズ",
            size_small: "コンパクト (400x260)", size_medium: "スタンダード (520x330)",
            size_large: "シアター (700x430)",
            set_max_windows: "最大同時起動数", wins_unlimited: "制限なし",
            set_autoplay: "展開時に自動再生",

            set_title_effects: "エフェクト",
            set_wave_anim: "流体ウェーブを有効化",
            set_particle_effect: "パーティクルを有効化",
            set_card_anim: "カードホバーアニメーション",

            set_title_debug: "デバッガー",
            set_hide_debug: "デバッグパネルを非表示",

            set_title_danger: "危険領域",
            set_danger_desc: "この端末のブラウザに保存されたすべてのアプリデータを即座に削除します。",
            set_reset_btn: "すべてのデータを完全リセット",
            set_export: "エクスポート", set_import: "インポート",

            incognito_active: "プライベートモード中",

            toast_switched: "日本語に切り替えました",
            toast_init_done: "初期化完了",
            toast_theme_changed: "テーマを変更しました: ",
            toast_reset_success: "すべてのデータをリセットしました",
            toast_old_win_closed: "最大数に達したため古いウィンドウを閉じました",
            toast_queue_exists: "既にキューに登録されています",
            toast_queue_added: "キューに追加: ",
            toast_queue_cleared: "キューをクリアしました",
            toast_queue_shuffled: "キューをシャッフルしました",
            toast_queue_empty: "キューが空です",
            toast_fav_added: "お気に入りに追加しました",
            toast_fav_removed: "お気に入りから削除しました",
            toast_hist_cleared: "視聴履歴をクリアしました",
            toast_sort_applied: "並べ替えを適用: ",
            toast_url_copied: "URLをコピーしました",
            toast_incognito_on: "プライベートモードをONにしました",
            toast_incognito_off: "プライベートモードをOFFにしました",
            toast_wl_added: "後で見るに追加しました",
            toast_wl_removed: "後で見るから削除しました",
            toast_wl_exists: "既に後で見るに登録されています",
            toast_channel_muted: "チャンネルをミュートしました",
            toast_channel_unmuted: "ミュートを解除しました",
            toast_note_saved: "メモを保存しました",
            toast_tag_saved: "タグを保存しました",
            toast_resume_saved: "再生位置を保存しました",
            toast_session_restored: "前回のセッションを復元しました",
            toast_no_results: "コンテンツが見つかりませんでした",
            toast_fetch_error: "通信エラー: ",
            toast_export_done: "エクスポートしました",
            toast_import_done: "インポートしました",
            toast_import_error: "インポートに失敗しました",
            toast_coll_created: "コレクションを作成: ",

            confirm_reset: "すべてのデータ（お気に入り、履歴、設定、コレクションなど）を完全に削除しますか？\nこの操作は取り消せません。",
            confirm_hist_clear: "視聴履歴をすべてクリアしますか？",
            confirm_wl_clear: "後で見るリストをすべて削除しますか？",
            confirm_restore_session: "前回のセッションを復元しますか？",
            confirm_resume_play: "前回の再生位置（{0}）から再開しますか？",
            prompt_collection_name: "コレクション名を入力:",
            prompt_note: "メモを入力（任意でタイムスタンプ：例 「02:34 面白い」）:",
            prompt_tag: "タグ（カンマ区切り）:",

            empty_queue: "キューは空です。動画カードのキューボタンから追加できます。",
            empty_favorites: "お気に入りはまだありません。",
            empty_watchlater: "後で見るリストは空です。",
            empty_collections: "コレクションがまだありません。新規作成してみましょう。",
            empty_history: "視聴履歴はありません。",
            empty_history_search: "検索条件に一致する履歴がありません。",

            about_title: "情報", about_product: "Midnight YouTube",
            about_version: "Version 10.0 (2026) — Private Edition",
            about_desc: "Midnight はプライバシー重視の YouTube カスタムフロントエンドです。多重PiPウィンドウ、Smart Search、Resume、Watch Later、Notes、Tags、Collections、Channel Mute をすべて搭載。すべてのデータはこの端末のブラウザにのみ保存され、外部送信は一切ありません。",
            about_privacy_title: "プライバシーポリシー",
            about_privacy_text: "本アプリは Cookie・トラッカー・アクセス解析を一切使用しません。視聴履歴、お気に入り、Resume位置、Notes、Tags はすべて localStorage に保存され、外部に送信されません。YouTube 動画は youtube-nocookie.com の埋め込みプレイヤーを使用し、Referrer もブロックしています。",

            ctx_play: "再生", ctx_queue: "キューに追加", ctx_watch_later: "後で見る",
            ctx_fav: "お気に入り", ctx_note: "メモを追加",
            ctx_tag: "タグを編集", ctx_copy: "URLをコピー",
            ctx_mute_channel: "このチャンネルをミュート", ctx_close: "閉じる",

            debug_system: "SYSTEM STATE", debug_network: "NETWORK",
        },

        en: {
            tab_search: "Search", tab_trending: "Trending", tab_channel: "Channel",
            tab_watchlater: "Watch Later", tab_queue: "Queue", tab_favorites: "Favorites",
            tab_collections: "Collections", tab_history: "History",
            tab_settings: "Settings", tab_about: "About", logo_sub: "YouTube",

            pill_all: "All", pill_video: "Videos", pill_live: "Live", pill_short: "Shorts",

            sort_title: "Sort", sort_default: "Relevance",
            sort_views: "Most Viewed", sort_date: "Upload Date", result_count: " results",

            btn_queue_shuffle: "Shuffle", btn_queue_clear: "Clear",
            btn_history_clear: "Clear History", btn_load_more: "Load More",
            btn_play_all: "Play All", btn_clear_all: "Clear All",
            btn_play: "Play", btn_remove: "Remove", btn_close: "Close",
            opt_fav_date: "Date Added", opt_fav_title: "Title A-Z",

            search_placeholder: "Keywords, @handle, channel:name / shorts cat / music >10m ...",
            no_results_search: "Enter a keyword to start searching.",
            trending_category_jp: "Overall (JP)", trending_category_music: "Music",
            trending_category_gaming: "Gaming", trending_category_news: "News",
            channel_videos: "Videos", channel_shorts: "Shorts",
            channel_playlists: "Playlists", channel_mute: "Mute",

            watchlater_title: "Watch Later", queue_title: "Queue",
            fav_title: "Favorites", coll_title: "Collections", coll_new: "New",
            hist_title: "Watch History (max 100)", hist_search_ph: "Filter history...",

            set_title_privacy: "Privacy",
            set_privacy_desc: "All your data (history, favorites, resume positions) is stored only in this browser. Nothing is sent externally.",
            set_incognito: "Incognito mode (don't record history / resume / search history)",
            set_history_enabled: "Save watch history",
            set_resume_mode: "Auto-save playback position (Resume)",
            resume_auto: "Auto resume", resume_ask: "Ask every time", resume_off: "Disabled",

            set_title_session: "Session Restore",
            set_session_mode: "Restore mode on startup",
            session_off: "Off", session_ask: "Ask on startup", session_auto: "Auto",

            set_title_appearance: "Appearance",
            set_base_theme: "Base Theme",
            theme_midnight: "Midnight Deep", theme_oled: "Absolute OLED",
            theme_cyber: "Cyber Neon", theme_neon: "Neon Pink",
            theme_glass: "Frosted Glass", theme_aurora: "Northern Aurora",
            theme_rose: "Velvet Rose", theme_rainbow: "Dynamic Rainbow",
            set_accent_color: "Accent Color",

            set_title_player: "Player Windows",
            set_window_size: "Default window size",
            size_small: "Compact (400x260)", size_medium: "Standard (520x330)",
            size_large: "Theater (700x430)",
            set_max_windows: "Max concurrent windows", wins_unlimited: "Unlimited",
            set_autoplay: "Autoplay when window opens",

            set_title_effects: "Effects",
            set_wave_anim: "Enable wave animation",
            set_particle_effect: "Enable particles",
            set_card_anim: "Card hover animation",

            set_title_debug: "Debugger",
            set_hide_debug: "Hide debug panel",

            set_title_danger: "Danger Zone",
            set_danger_desc: "Instantly delete all app data stored on this browser.",
            set_reset_btn: "Reset all data",
            set_export: "Export", set_import: "Import",

            incognito_active: "Private mode",

            toast_switched: "Switched to English",
            toast_init_done: "Midnight ready",
            toast_theme_changed: "Theme: ",
            toast_reset_success: "All data was reset",
            toast_old_win_closed: "Closed oldest window (max reached)",
            toast_queue_exists: "Already in queue",
            toast_queue_added: "Added to queue: ",
            toast_queue_cleared: "Queue cleared",
            toast_queue_shuffled: "Queue shuffled",
            toast_queue_empty: "Queue is empty",
            toast_fav_added: "Added to favorites",
            toast_fav_removed: "Removed from favorites",
            toast_hist_cleared: "History cleared",
            toast_sort_applied: "Sort: ",
            toast_url_copied: "URL copied",
            toast_incognito_on: "Private mode ON",
            toast_incognito_off: "Private mode OFF",
            toast_wl_added: "Added to Watch Later",
            toast_wl_removed: "Removed from Watch Later",
            toast_wl_exists: "Already in Watch Later",
            toast_channel_muted: "Channel muted",
            toast_channel_unmuted: "Unmuted",
            toast_note_saved: "Note saved",
            toast_tag_saved: "Tags saved",
            toast_resume_saved: "Resume position saved",
            toast_session_restored: "Restored previous session",
            toast_no_results: "No results",
            toast_fetch_error: "Network error: ",
            toast_export_done: "Exported",
            toast_import_done: "Imported",
            toast_import_error: "Import failed",
            toast_coll_created: "Collection created: ",

            confirm_reset: "Delete all data (favorites, history, settings, collections...)?\nThis cannot be undone.",
            confirm_hist_clear: "Clear all watch history?",
            confirm_wl_clear: "Clear all Watch Later items?",
            confirm_restore_session: "Restore the previous session?",
            confirm_resume_play: "Resume from previous position ({0})?",
            prompt_collection_name: "Collection name:",
            prompt_note: "Note (optional timestamp prefix, e.g. \"02:34 funny\"):",
            prompt_tag: "Tags (comma separated):",

            empty_queue: "Queue is empty. Add videos with the queue button on cards.",
            empty_favorites: "No favorites yet.",
            empty_watchlater: "Watch Later is empty.",
            empty_collections: "No collections yet. Create one to get started.",
            empty_history: "No watch history.",
            empty_history_search: "No history matches your filter.",

            about_title: "About", about_product: "Midnight YouTube",
            about_version: "Version 10.0 (2026) — Private Edition",
            about_desc: "Midnight is a privacy-first custom YouTube front-end. It includes multi-window PiP, Smart Search, Resume, Watch Later, Notes, Tags, Collections, and Channel Mute. All data is stored locally — nothing is sent externally.",
            about_privacy_title: "Privacy Policy",
            about_privacy_text: "This app uses no cookies, trackers, or analytics. Your history, favorites, resume positions, notes, and tags live only in this browser's localStorage. Videos load through youtube-nocookie.com with referrer blocked.",

            ctx_play: "Play", ctx_queue: "Add to Queue", ctx_watch_later: "Watch Later",
            ctx_fav: "Favorite", ctx_note: "Add Note",
            ctx_tag: "Edit Tags", ctx_copy: "Copy URL",
            ctx_mute_channel: "Mute this channel", ctx_close: "Close",

            debug_system: "SYSTEM STATE", debug_network: "NETWORK",
        }
    };

    static init() {
        this.apply(this.currentLang);
        document.querySelectorAll(".lang-btn").forEach(btn => {
            btn.classList.toggle("active", btn.dataset.lang === this.currentLang);
            btn.addEventListener("click", () => this.changeLang(btn.dataset.lang));
        });
    }

    static changeLang(lang) {
        this.currentLang = lang;
        try { localStorage.setItem("app_lang", lang); } catch {}
        this.apply(lang);
        document.querySelectorAll(".lang-btn").forEach(btn => {
            btn.classList.toggle("active", btn.dataset.lang === lang);
        });
        if (typeof Toast !== "undefined") Toast.show(this.t("toast_switched"), "success");
        this.onLangChangeCallbacks.forEach(cb => { try { cb(lang); } catch(e) { console.error(e); } });
    }

    static apply(lang) {
        const dict = this.locales[lang];
        if (!dict) return;
        document.querySelectorAll("[data-i18n]").forEach(el => {
            const key = el.dataset.i18n;
            if (dict[key] !== undefined) el.textContent = dict[key];
        });
        document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
            const key = el.getAttribute("data-i18n-placeholder");
            if (dict[key] !== undefined) el.placeholder = dict[key];
        });
        document.documentElement.setAttribute("lang", lang);
    }

    static t(key) {
        const dict = this.locales[this.currentLang] || this.locales["ja"];
        return dict[key] !== undefined ? dict[key] : key;
    }

    static tpl(key, ...args) {
        let text = this.t(key);
        args.forEach((arg, i) => { text = text.replace(`{${i}}`, arg); });
        return text;
    }
}

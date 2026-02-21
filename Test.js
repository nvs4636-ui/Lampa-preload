(function () {
    'use strict';

    // --- 1. POLYFILLS (GIỮ NGUYÊN TỪ LNUM ĐỂ CHẠY TRÊN CÁC DÒNG TV CŨ) ---
    if (!Object.keys) {
        Object.keys = function (o) {
            var r = [], k;
            for (k in o) { if (Object.prototype.hasOwnProperty.call(o, k)) r.push(k); }
            return r;
        };
    }
    if (!Array.prototype.forEach) {
        Array.prototype.forEach = function (c, t) {
            for (var i = 0, l = this.length >>> 0; i < l; i++) { if (i in this) c.call(t, this[i], i, this); }
        };
    }
    if (!Array.prototype.map) {
        Array.prototype.map = function (c, t) {
            var s = Object(this), l = s.length >>> 0, r = new Array(l);
            for (var i = 0; i < l; i++) { if (i in s) r[i] = c.call(t, s[i], i, s); }
            return r;
        };
    }

    // --- 2. CẤU HÌNH HỆ THỐNG KKPHIM ---
    var SOURCE_NAME = 'KKPhim';
    var ICON = '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line></svg>';
    var CACHE_SIZE = 100;
    var CACHE_TIME = 1000 * 60 * 60 * 3; // 3 giờ
    var cache = {};
    
    var API_BASE = 'https://phimapi.com/';
    var IMG_PROXY = 'https://phimimg.com/';

    var BASE_CATEGORIES = {
        new: 'danh-sach/phim-moi-cap-nhat',
        movies: 'v1/api/danh-sach/phim-le',
        series: 'v1/api/danh-sach/phim-bo',
        anime: 'v1/api/danh-sach/hoat-hinh',
        tv_shows: 'v1/api/danh-sach/tv-shows',
        sub: 'v1/api/danh-sach/sub-movies'
    };

    var DISPLAY_OPTIONS = {
        new: { title: 'Mới Cập Nhật', visible: true },
        movies: { title: 'Phim Lẻ', visible: true },
        series: { title: 'Phim Bộ', visible: true },
        anime: { title: 'Hoạt Hình', visible: true },
        tv_shows: { title: 'TV Shows', visible: true },
        sub: { title: 'Phim Vietsub', visible: true }
    };

    // --- 3. DỊCH THUẬT & SETTINGS ---
    function addTranslates() {
        Lampa.Lang.add({
            kk_title: { en: 'KKPhim Title', vi: 'Tên hiển thị' },
            kk_select_visibility: { en: 'Category Visibility', vi: 'Ẩn/Hiện danh mục' },
            kk_donate: { en: 'Support', vi: 'Ủng hộ ní' }
        });
    }

    // --- 4. HỆ THỐNG API SERVICE (XƯƠNG SỐNG LNUM) ---
    function KKPhimApiService() {
        var self = this;
        this.network = new Lampa.Reguest();

        function getCache(key) {
            var res = cache[key];
            if (res && (Date.now() - res.timestamp < CACHE_TIME)) return res.value;
            return null;
        }

        function setCache(key, value) {
            cache[key] = { timestamp: Date.now(), value: value };
        }

        function normalizeData(json) {
            var items = (json.data && json.data.items) ? json.data.items : (json.items || []);
            return {
                results: items.map(function (item) {
                    var poster = item.poster_url || item.thumb_url || '';
                    return {
                        id: item._id || item.slug,
                        title: item.name,
                        original_title: item.origin_name || '',
                        name: item.name,
                        poster_path: poster.includes('http') ? poster : IMG_PROXY + poster,
                        img: poster.includes('http') ? poster : IMG_PROXY + poster,
                        backdrop_path: poster.includes('http') ? poster : IMG_PROXY + poster,
                        overview: item.content || '',
                        vote_average: 8.0,
                        release_date: item.year || '2026',
                        first_air_date: item.year || '2026',
                        source: SOURCE_NAME,
                        slug: item.slug
                    };
                }),
                page: (json.data && json.data.params) ? parseInt(json.data.params.pagination.currentPage) : 1,
                total_pages: (json.data && json.data.params) ? Math.ceil(json.data.params.pagination.totalItems / json.data.params.pagination.totalItemsPerPage) : 1
            };
        }

        this.get = function (url, params, onComplete, onError) {
            this.network.silent(url, function (json) {
                var normalized = normalizeData(json);
                setCache(url, normalized);
                onComplete(normalized);
            }, onError);
        };

        this.list = function (params, onComplete, onError) {
            var url = params.url || (API_BASE + BASE_CATEGORIES.new);
            url += (url.includes('?') ? '&' : '?') + 'page=' + (params.page || 1);
            
            var cached = getCache(url);
            if (cached) return onComplete(cached);

            this.get(url, params, onComplete, onError);
        };

        this.category = function (params, onSuccess, onError) {
            var partsLimit = 5;
            var partsData = [];

            Object.keys(BASE_CATEGORIES).forEach(function (key) {
                if (DISPLAY_OPTIONS[key].visible) {
                    partsData.push(function (callback) {
                        var url = API_BASE + BASE_CATEGORIES[key];
                        self.get(url + '?page=1', {}, function (json) {
                            callback({
                                title: DISPLAY_OPTIONS[key].title,
                                results: json.results,
                                url: url,
                                source: SOURCE_NAME
                            });
                        }, function() { callback({results: []}); });
                    });
                }
            });

            Lampa.Api.partNext(partsData, partsLimit, onSuccess, onError);
        };

        this.full = function (params, onSuccess, onError) {
            // Hijack Lampa's full detail to fetch KKPhim streams
            var slug = params.card.slug || params.card.id;
            network.silent(API_BASE + 'phim/' + slug, function (data) {
                if (data && data.episodes) {
                    var server = data.episodes[0].server_data;
                    Lampa.Select.show({
                        title: params.card.name,
                        items: server.map(function(ep) { 
                            return { title: 'Tập ' + ep.name, url: ep.link_m3u8 }; 
                        }),
                        onSelect: function(selected) { 
                            Lampa.Player.play(selected); 
                        },
                        onBack: function() {
                            Lampa.Controller.toggle('content');
                        }
                    });
                }
            });
        };
    }

    // --- 5. KHỞI CHẠY PLUGIN ---
    function startPlugin() {
        if (window.kkphim_plugin_loaded) return;
        window.kkphim_plugin_loaded = true;

        addTranslates();

        // Đăng ký API vào hệ thống Lampa
        var kkApi = new KKPhimApiService();
        Lampa.Api.sources[SOURCE_NAME] = kkApi;

        // Settings UI
        Lampa.SettingsApi.addComponent({ component: 'kk_settings', name: SOURCE_NAME, icon: ICON });
        
        Object.keys(DISPLAY_OPTIONS).forEach(function(opt) {
            Lampa.SettingsApi.addParam({
                component: 'kk_settings',
                param: { name: 'kk_show_' + opt, type: 'trigger', default: true },
                field: { name: DISPLAY_OPTIONS[opt].title, description: 'Hiện mục này ngoài trang chủ' },
                onChange: function(value) { DISPLAY_OPTIONS[opt].visible = (value === 'true'); }
            });
        });

        // Thêm Menu
        var menuItem = $('<li class="menu__item selector" data-action="kkphim"><div class="menu__ico">' + ICON + '</div><div class="menu__text">' + SOURCE_NAME + '</div></li>');
        menuItem.on('hover:enter', function () {
            Lampa.Activity.push({
                title: SOURCE_NAME,
                component: 'category',
                source: SOURCE_NAME,
                page: 1
            });
        });
        $('.menu .menu__list').append(menuItem);

        // --- CSS FIX THANH BAR ĐEN (VÌ NÍ MUỐN BLACK BAR) ---
        $('head').append('<style> .bar { background: #000 !important; opacity: 1 !important; } .category-list__title { color: #e74c3c !important; font-weight: bold; } </style>');
    }

    // Đợi App sẵn sàng
    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') startPlugin(); });

})();

(function () {
    'use strict';

    // --- 1. POLYFILLS (GIỮ NGUYÊN ĐỂ CHẠY ỔN ĐỊNH TRÊN TV) ---
    if (!Object.keys) {
        Object.keys = function (o) {
            var r = [], k;
            for (k in o) { if (Object.prototype.hasOwnProperty.call(o, k)) r.push(k); }
            return r;
        };
    }
    if (!Array.prototype.forEach) {
        Array.prototype.forEach = function (c, t) {
            for (var i = 0, l = this.length >>> 0; i < l; i++) { if (i in this) c.call(t, s[i], i, s); }
        };
    }

    // --- 2. CẤU HÌNH KKPHIM ---
    var SOURCE_NAME = 'KKPhim';
    var ICON = '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line></svg>';
    var CACHE_TIME = 1000 * 60 * 60 * 5; // 5 giờ cache
    var cache = {};
    
    var API_BASE = 'https://phimapi.com/';
    var IMG_PROXY = 'https://phimimg.com/';

    var BASE_CATEGORIES = {
        new: 'danh-sach/phim-moi-cap-nhat',
        movies: 'v1/api/danh-sach/phim-le',
        series: 'v1/api/danh-sach/phim-bo',
        anime: 'v1/api/danh-sach/hoat-hinh',
        tv_shows: 'v1/api/danh-sach/tv-shows'
    };

    var DISPLAY_OPTIONS = {
        new: { title: 'Mới Cập Nhật', visible: true },
        movies: { title: 'Phim Lẻ', visible: true },
        series: { title: 'Phim Bộ', visible: true },
        anime: { title: 'Hoạt Hình', visible: true },
        tv_shows: { title: 'TV Shows', visible: true }
    };

    // --- 3. KKPHIM API SERVICE (DÀI & CHI TIẾT) ---
    function KKPhimApiService() {
        var self = this;
        this.network = new Lampa.Reguest();

        // Hàm sửa lỗi ảnh: Không để Lampa tự nối host TMDB vào link KKPhim
        function fixImageUrl(url) {
            if (!url) return './img/img_broken.svg';
            if (url.indexOf('http') === 0) return url;
            return IMG_PROXY + url;
        }

        function setCache(key, value) {
            cache[key] = { timestamp: Date.now(), value: value };
        }

        function getCache(key) {
            var res = cache[key];
            if (res && (Date.now() - res.timestamp < CACHE_TIME)) return res.value;
            return null;
        }

        // --- CHUẨN HÓA DỮ LIỆU SANG FORMAT LAMPA ---
        function normalizeData(json) {
            var items = (json.data && json.data.items) ? json.data.items : (json.items || []);
            return {
                results: items.map(function (item) {
                    var img = fixImageUrl(item.poster_url || item.thumb_url);
                    return {
                        id: item.slug, // Dùng slug làm ID để gọi detail
                        title: item.name,
                        original_title: item.origin_name || '',
                        name: item.name,
                        // Quan trọng: Để img vào cả 3 trường này để Lampa Card không load nhầm link TMDB
                        poster_path: img,
                        backdrop_path: img,
                        img: img,
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

        // --- LOAD DANH SÁCH (TRANG GRID) ---
        this.list = function (params, onComplete, onError) {
            var url = params.url || (API_BASE + BASE_CATEGORIES.new);
            var page = params.page || 1;
            var finalUrl = url + (url.indexOf('?') > -1 ? '&' : '?') + 'page=' + page;
            
            var cached = getCache(finalUrl);
            if (cached) return onComplete(cached);

            this.get(finalUrl, params, onComplete, onError);
        };

        // --- LOAD TRANG CHỦ (NHIỀU HÀNG) ---
        this.category = function (params, onSuccess, onError) {
            var partsLimit = 5;
            var partsData = [];

            Object.keys(BASE_CATEGORIES).forEach(function (key) {
                if (DISPLAY_OPTIONS[key].visible) {
                    partsData.push(function (callback) {
                        var url = API_BASE + BASE_CATEGORIES[key];
                        self.get(url + (url.indexOf('v1') > -1 ? '' : '?page=1'), {}, function (json) {
                            callback({
                                title: DISPLAY_OPTIONS[key].title,
                                results: json.results,
                                url: url,
                                source: SOURCE_NAME,
                                cardClass: 'card--collection' // Giúp card hiển thị chuẩn tỉ lệ
                            });
                        }, function() { callback({results: []}); });
                    });
                }
            });

            Lampa.Api.partNext(partsData, partsLimit, onSuccess, onError);
        };

        // --- XỬ LÝ KHI BẤM VÀO PHIM (FIX LỖI) ---
        this.full = function (params, onSuccess, onError) {
            var slug = params.card.id || params.card.slug;
            Lampa.Noty.show('Đang tải thông tin phim...');

            this.network.silent(API_BASE + 'phim/' + slug, function (data) {
                if (data && data.episodes && data.episodes.length > 0) {
                    var movie_info = data.movie;
                    var episodes = data.episodes[0].server_data;

                    // Fake dữ liệu Detail để Lampa không báo lỗi
                    var full_data = {
                        movie: {
                            id: movie_info.slug,
                            title: movie_info.name,
                            original_title: movie_info.origin_name,
                            overview: movie_info.content,
                            img: fixImageUrl(movie_info.poster_url),
                            runtime: movie_info.time || '90 min',
                            vote_average: 8.0,
                            genres: movie_info.category ? movie_info.category.map(function(g){ return {name: g.name}; }) : []
                        },
                        source: SOURCE_NAME
                    };

                    // Hiển thị chọn tập ngay khi bấm
                    Lampa.Select.show({
                        title: movie_info.name,
                        items: episodes.map(function(ep) { 
                            return { title: 'Tập ' + ep.name, url: ep.link_m3u8 }; 
                        }),
                        onSelect: function(selected) { 
                            Lampa.Player.play({
                                url: selected.url,
                                title: movie_info.name + ' - ' + selected.title
                            }); 
                        },
                        onBack: function() {
                            Lampa.Controller.toggle('content');
                        }
                    });

                    onSuccess(full_data);
                } else {
                    Lampa.Noty.show('Không tìm thấy link phim!');
                    onError();
                }
            }, onError);
        };
    }

    // --- 4. KHỞI CHẠY VÀ CÀI ĐẶT ---
    function startPlugin() {
        if (window.kkphim_v2_loaded) return;
        window.kkphim_v2_loaded = true;

        var kkApi = new KKPhimApiService();
        Lampa.Api.sources[SOURCE_NAME] = kkApi;

        // Settings để ní chỉnh ẩn/hiện danh mục
        Lampa.SettingsApi.addComponent({ component: 'kk_settings', name: SOURCE_NAME, icon: ICON });
        Object.keys(DISPLAY_OPTIONS).forEach(function(opt) {
            Lampa.SettingsApi.addParam({
                component: 'kk_settings',
                param: { name: 'kk_show_' + opt, type: 'trigger', default: true },
                field: { name: DISPLAY_OPTIONS[opt].title, description: 'Hiện/Ẩn hàng này ở trang chủ' },
                onChange: function(value) { DISPLAY_OPTIONS[opt].visible = (value === 'true'); }
            });
        });

        // Menu item
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

        // CSS ép chế độ ảnh chuẩn, không bị đè URL
        $('head').append(`
            <style>
                .card__img[src*="image.tmdb.org"] { object-fit: cover !important; }
                .card--collection .card__img { height: 220px !important; }
                .bar { background: #000 !important; opacity: 1 !important; }
                /* Ẩn phần text URL nếu nó vẫn lọt vào */
                .card__title { font-size: 1.1rem !important; margin-top: 5px; }
            </style>
        `);
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') startPlugin(); });

})();

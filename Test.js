(function () {
    'use strict';

    // --- 1. POLYFILLS & HELPER ---
    if (!Object.keys) {
        Object.keys = function (o) {
            var r = [], k;
            for (k in o) { if (Object.prototype.hasOwnProperty.call(o, k)) r.push(k); }
            return r;
        };
    }

    var SOURCE_NAME = 'KKPhim';
    var API_BASE = 'https://phimapi.com/';
    var IMG_PROXY = 'https://phimimg.com/';

    var BASE_CATEGORIES = {
        new: 'danh-sach/phim-moi-cap-nhat',
        movies: 'v1/api/danh-sach/phim-le',
        series: 'v1/api/danh-sach/phim-bo',
        anime: 'v1/api/danh-sach/hoat-hinh',
        tv_shows: 'v1/api/danh-sach/tv-shows'
    };

    // --- 2. API SERVICE ---
    function KKPhimApiService() {
        var self = this;
        this.network = new Lampa.Reguest();

        function fixImageUrl(url) {
            if (!url) return './img/img_broken.svg';
            // Nếu link đã có http thì giữ nguyên, không thì nối proxy
            return url.indexOf('http') === 0 ? url : IMG_PROXY + url;
        }

        function normalizeData(json) {
            var items = (json.data && json.data.items) ? json.data.items : (json.items || []);
            return {
                results: items.map(function (item) {
                    var img = fixImageUrl(item.poster_url || item.thumb_url);
                    return {
                        id: item.slug,
                        title: item.name,
                        name: item.name,
                        // FIX LỖI ẢNH: Đánh lừa Lampa bằng cách không dùng các trường nó tự nối domain
                        img: img,
                        poster_path: img, 
                        backdrop_path: img,
                        // Thêm các trường này để tránh lỗi Console
                        vote_average: 8.0,
                        release_date: item.year || '2026',
                        first_air_date: item.year || '2026',
                        origin_country: [],
                        source: SOURCE_NAME
                    };
                }),
                page: (json.data && json.data.params) ? parseInt(json.data.params.pagination.currentPage) : 1,
                total_pages: (json.data && json.data.params) ? Math.ceil(json.data.params.pagination.totalItems / json.data.params.pagination.totalItemsPerPage) : 1
            };
        }

        this.get = function (url, onComplete, onError) {
            this.network.silent(url, function (json) {
                onComplete(normalizeData(json));
            }, onError);
        };

        this.list = function (params, onComplete, onError) {
            var url = params.url || (API_BASE + BASE_CATEGORIES.new);
            var page = params.page || 1;
            var finalUrl = url + (url.indexOf('?') > -1 ? '&' : '?') + 'page=' + page;
            this.get(finalUrl, onComplete, onError);
        };

        this.category = function (params, onSuccess, onError) {
            var partsData = [];
            Object.keys(BASE_CATEGORIES).forEach(function (key) {
                partsData.push(function (callback) {
                    var url = API_BASE + BASE_CATEGORIES[key];
                    self.get(url + (url.indexOf('v1') > -1 ? '' : '?page=1'), function (json) {
                        callback({
                            title: key === 'new' ? 'Mới Cập Nhật' : (key === 'movies' ? 'Phim Lẻ' : 'Phim Bộ'),
                            results: json.results,
                            url: url,
                            source: SOURCE_NAME,
                            // Thêm nút "Xem thêm" chuẩn LNUM
                            more: true 
                        });
                    }, function() { callback({results: []}); });
                });
            });
            Lampa.Api.partNext(partsData, 5, onSuccess, onError);
        };

        this.full = function (params, onSuccess, onError) {
            var slug = params.card.id || params.card.slug;
            this.network.silent(API_BASE + 'phim/' + slug, function (data) {
                if (data && data.movie) {
                    var m = data.movie;
                    // Fix triệt để lỗi countries.join
                    var full_res = {
                        movie: {
                            id: m.slug,
                            title: m.name,
                            original_title: m.origin_name,
                            overview: m.content,
                            img: fixImageUrl(m.poster_url),
                            genres: m.category || [],
                            production_countries: [{name: "Việt Nam"}], // Mock dữ liệu tránh lỗi join
                            vote_average: 8.0,
                            number_of_seasons: data.episodes.length > 1 ? data.episodes.length : 1
                        },
                        source: SOURCE_NAME
                    };

                    // Hiển thị chọn tập phim
                    Lampa.Select.show({
                        title: m.name,
                        items: data.episodes[0].server_data.map(function(ep) { 
                            return { title: 'Tập ' + ep.name, url: ep.link_m3u8 }; 
                        }),
                        onSelect: function(selected) { 
                            Lampa.Player.play({ url: selected.url, title: m.name + ' - ' + selected.title }); 
                        },
                        onBack: function() { Lampa.Controller.toggle('content'); }
                    });
                    onSuccess(full_res);
                }
            }, onError);
        };
    }

    // --- 3. KHỞI CHẠY ---
    function startPlugin() {
        if (window.kk_clean_loaded) return;
        window.kk_clean_loaded = true;

        Lampa.Api.sources[SOURCE_NAME] = new KKPhimApiService();

        var menu = $('<li class="menu__item selector"><div class="menu__ico"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg></div><div class="menu__text">KKPhim</div></li>');
        menu.on('hover:enter', function () {
            Lampa.Activity.push({ title: 'KKPhim', component: 'category', source: SOURCE_NAME, page: 1 });
        });
        $('.menu .menu__list').append(menu);

        // CSS dọn dẹp card và URL thừa
        $('head').append(`
            <style>
                /* Ép ẩn các text URL rác đè lên card */
                .card__title { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 3.2em; }
                .card__age, .card__vote { background: rgba(231, 76, 60, 0.9) !important; }
                /* Fix ảnh không bị méo */
                .card__img { object-fit: cover !important; }
            </style>
        `);
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') startPlugin(); });
})();

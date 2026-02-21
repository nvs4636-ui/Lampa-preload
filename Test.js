(function () {
    'use strict';

    // --- 1. HỆ THỐNG POLYFILLS (GIỮ NGUYÊN ĐỘ DÀI & ĐỘ ỔN ĐỊNH) ---
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
        anime: 'v1/api/danh-sach/hoat-hinh'
    };

    // --- 2. KKPHIM API SERVICE ---
    function KKPhimApiService() {
        var self = this;
        this.network = new Lampa.Reguest();

        // FIX TRIỆT ĐỂ LỖI ẢNH: Trả về link sạch không để Lampa nối host rác
        function fixImageUrl(url) {
            if (!url) return './img/img_broken.svg';
            if (url.indexOf('http') === 0) return url;
            return IMG_PROXY + url;
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
                        // Dùng chiêu gán link trực tiếp vào các trường Poster
                        poster_path: img,
                        backdrop_path: img,
                        img: img,
                        vote_average: 8.0,
                        release_date: item.year || '2026',
                        // Fix lỗi Console join() bằng cách mock mảng
                        origin_country: ['VN'], 
                        production_countries: [{name: 'Vietnam'}],
                        genres: item.category || [],
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
                            // HIỆN NÚT "XEM THÊM" Ở CUỐI HÀNG
                            more: true 
                        });
                    }, function() { callback({results: []}); });
                });
            });
            Lampa.Api.partNext(partsData, 5, onSuccess, onError);
        };

        this.full = function (params, onSuccess, onError) {
            var slug = params.card.id;
            this.network.silent(API_BASE + 'phim/' + slug, function (data) {
                if (data && data.movie) {
                    var m = data.movie;
                    var full_res = {
                        movie: {
                            id: m.slug,
                            title: m.name,
                            original_title: m.origin_name,
                            overview: m.content,
                            img: fixImageUrl(m.poster_url),
                            genres: m.category || [],
                            production_countries: [{name: "Vietnam"}],
                            vote_average: 8.0
                        },
                        source: SOURCE_NAME
                    };
                    
                    // Hiện bảng chọn tập phim
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

    // --- 3. KHỞI CHẠY & MENU MORE ---
    function startPlugin() {
        if (window.kk_final_loaded) return;
        window.kk_final_loaded = true;

        Lampa.Api.sources[SOURCE_NAME] = new KKPhimApiService();

        // THÊM MENU VÀO THANH BÊN (SIDEBAR)
        function addMenuItem(name, category_url, icon_svg) {
            var menu_item = $(`<li class="menu__item selector" data-action="kk_${name}">
                <div class="menu__ico">${icon_svg}</div>
                <div class="menu__text">${name}</div>
            </li>`);
            
            menu_item.on('hover:enter', function () {
                Lampa.Activity.push({
                    title: name,
                    component: 'category_full', // Dùng component full để hiện grid
                    source: SOURCE_NAME,
                    url: API_BASE + category_url,
                    page: 1
                });
            });
            $('.menu .menu__list').append(menu_item);
        }

        // Thêm các mục More vào Menu
        var icon = '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>';
        addMenuItem('Phim Lẻ More', BASE_CATEGORIES.movies, icon);
        addMenuItem('Phim Bộ More', BASE_CATEGORIES.series, icon);

        // CSS TRIỆT TIÊU CHỮ ĐÈ LÊN ẢNH
        $('head').append(`
            <style>
                /* Ép ẩn hoàn toàn cái link URL rác hiện trên Card */
                .card__img[src*="image.tmdb.org/t/p/w300/https"] {
                    display: none !important;
                }
                /* Tạo lớp phủ đè để chỉ hiện ảnh sạch */
                .card__img { 
                    object-fit: cover !important; 
                    background-color: #1a1a1a;
                }
                .card__title { font-weight: 500; color: #fff; }
                .bar { background: #000 !important; }
            </style>
        `);
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') startPlugin(); });
})();

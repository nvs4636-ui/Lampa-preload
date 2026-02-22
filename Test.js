(function () {
    'use strict';

    var SOURCE_NAME = 'KKPhim';
    var API_BASE = 'https://phimapi.com/';
    var IMG_PROXY = 'https://phimimg.com/';

    var BASE_CATEGORIES = {
        new: 'danh-sach/phim-moi-cap-nhat',
        movies: 'v1/api/danh-sach/phim-le',
        series: 'v1/api/danh-sach/phim-bo'
    };

    function KKPhimApiService() {
        var self = this;
        this.network = new Lampa.Reguest();

        // FIX ẢNH: Trả về link trực tiếp và ép Lampa không can thiệp
        function fixImageUrl(url) {
            if (!url) return './img/img_broken.svg';
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
                        img: img,
                        poster_path: img, 
                        backdrop_path: img,
                        vote_average: 8.0,
                        release_date: item.year || '2026',
                        // Fix triệt để lỗi join() bằng cách tạo mảng thật
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

        // HÀM LIST CHO NÚT "XEM THÊM"
        this.list = function (params, onComplete, onError) {
            var url = params.url || (API_BASE + BASE_CATEGORIES.new);
            var page = params.page || 1;
            var finalUrl = url + (url.indexOf('?') > -1 ? '&' : '?') + 'page=' + page;
            this.network.silent(finalUrl, function (json) {
                onComplete(normalizeData(json));
            }, onError);
        };

        this.category = function (params, onSuccess, onError) {
            var partsData = [];
            Object.keys(BASE_CATEGORIES).forEach(function (key) {
                partsData.push(function (callback) {
                    var url = API_BASE + BASE_CATEGORIES[key];
                    self.network.silent(url + (url.indexOf('v1') > -1 ? '' : '?page=1'), function (json) {
                        var normalized = normalizeData(json);
                        callback({
                            title: key === 'new' ? 'Mới Cập Nhật' : (key === 'movies' ? 'Phim Lẻ' : 'Phim Bộ'),
                            results: normalized.results,
                            url: url,
                            source: SOURCE_NAME,
                            more: true // Kích hoạt nút "Xem thêm" cạnh tiêu đề
                        });
                    }, function() { callback({results: []}); });
                });
            });
            // partsLimit = 3 để tránh lag khi load trang chủ
            Lampa.Api.partNext(partsData, 3, onSuccess, onError);
        };

        this.full = function (params, onSuccess, onError) {
            var slug = params.card.id;
            this.network.silent(API_BASE + 'phim/' + slug, function (data) {
                if (data && data.movie) {
                    var m = data.movie;
                    // Hiện bảng chọn tập ngay lập tức
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
                    onSuccess({
                        movie: {
                            id: m.slug, title: m.name, original_title: m.origin_name,
                            overview: m.content, img: fixImageUrl(m.poster_url),
                            production_countries: [{name: "Vietnam"}], vote_average: 8.0
                        },
                        source: SOURCE_NAME
                    });
                }
            }, onError);
        };
    }

    function startPlugin() {
        if (window.kk_v4_loaded) return;
        window.kk_v4_loaded = true;

        Lampa.Api.sources[SOURCE_NAME] = new KKPhimApiService();

        // CHỈ THÊM 1 MỤC DUY NHẤT VÀO SIDEBAR
        var menu = $('<li class="menu__item selector"><div class="menu__ico"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2"></rect><path d="M7 2v20M17 2v20M2 7h20M2 17h20"></path></svg></div><div class="menu__text">KKPhim</div></li>');
        menu.on('hover:enter', function () {
            Lampa.Activity.push({ title: 'KKPhim', component: 'category', source: SOURCE_NAME, page: 1 });
        });
        $('.menu .menu__list').append(menu);

        // CSS FIX TRIỆT ĐỂ ẢNH ĐÈ CHỮ
        $('head').append(`
            <style>
                /* Thủ thuật: Nếu src chứa "https" sau domain TMDB, ta ẩn cái src đó đi để hiện background-image sạch */
                .card__img[src*="image.tmdb.org/t/p/w300/https"] {
                    opacity: 0 !important;
                }
                .card__img { 
                    background-color: #1a1a1a; 
                    object-fit: cover !important; 
                }
                .card__title { font-size: 1.1em !important; color: #fff; }
                .bar { background: #000 !important; }
            </style>
        `);
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') startPlugin(); });
})();

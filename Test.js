(function () {
    'use strict';

    var SOURCE_NAME = 'KKPhim';
    var API_BASE = 'https://phimapi.com/';
    var IMG_PROXY = 'https://phimimg.com/';

    // Danh mục chuẩn theo KKPhim
    var BASE_CATEGORIES = {
        new: 'danh-sach/phim-moi-cap-nhat',
        movies: 'v1/api/danh-sach/phim-le',
        series: 'v1/api/danh-sach/phim-bo',
        anime: 'v1/api/danh-sach/hoat-hinh',
        tv_shows: 'v1/api/danh-sach/tv-shows'
    };

    function KKPhimApiService() {
        var self = this;
        this.network = new Lampa.Reguest();

        // FIX ẢNH: Trả về link sạch để không bị Lampa chèn đầu TMDB
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
                        poster_path: img, 
                        backdrop_path: img,
                        img: img,
                        vote_average: 8.0,
                        release_date: item.year || '2026',
                        // Fix lỗi Console join()
                        origin_country: ['VN'],
                        production_countries: [{name: 'Vietnam'}],
                        source: SOURCE_NAME
                    };
                }),
                page: (json.data && json.data.params) ? parseInt(json.data.params.pagination.currentPage) : 1,
                total_pages: (json.data && json.data.params) ? Math.ceil(json.data.params.pagination.totalItems / json.data.params.pagination.totalItemsPerPage) : 1
            };
        }

        // Xử lý nút "Xem thêm" (More)
        this.list = function (params, onComplete, onError) {
            var url = params.url || (API_BASE + BASE_CATEGORIES.new);
            var page = params.page || 1;
            var finalUrl = url + (url.indexOf('?') > -1 ? '&' : '?') + 'page=' + page;
            this.network.silent(finalUrl, function (json) {
                onComplete(normalizeData(json));
            }, onError);
        };

        // Load trang chủ nhiều hàng
        this.category = function (params, onSuccess, onError) {
            var partsData = [];
            var names = { new: 'Mới Cập Nhật', movies: 'Phim Lẻ', series: 'Phim Bộ', anime: 'Hoạt Hình', tv_shows: 'TV Shows' };

            Object.keys(BASE_CATEGORIES).forEach(function (key) {
                partsData.push(function (callback) {
                    var url = API_BASE + BASE_CATEGORIES[key];
                    self.network.silent(url + (url.indexOf('v1') > -1 ? '' : '?page=1'), function (json) {
                        var normalized = normalizeData(json);
                        callback({
                            title: names[key],
                            results: normalized.results,
                            url: url,
                            source: SOURCE_NAME,
                            more: true // Nút "Xem thêm" cạnh tiêu đề
                        });
                    }, function() { callback({results: []}); });
                });
            });
            Lampa.Api.partNext(partsData, 3, onSuccess, onError);
        };

        // Khi bấm vào phim: Hiện bảng chọn tập
        this.full = function (params, onSuccess, onError) {
            var slug = params.card.id;
            this.network.silent(API_BASE + 'phim/' + slug, function (data) {
                if (data && data.movie) {
                    var m = data.movie;
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
        if (window.kk_lnum_loaded) return;
        window.kk_lnum_loaded = true;

        Lampa.Api.sources[SOURCE_NAME] = new KKPhimApiService();

        // Thêm menu vào sidebar (chỉ 1 cái duy nhất)
        var menu = $('<li class="menu__item selector"><div class="menu__ico"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg></div><div class="menu__text">KKPhim</div></li>');
        menu.on('hover:enter', function () {
            Lampa.Activity.push({ title: 'KKPhim', component: 'category', source: SOURCE_NAME, page: 1 });
        });
        $('.menu .menu__list').append(menu);

        // CSS "tẩy tủy" ảnh lỗi
        $('head').append(`
            <style>
                /* Nếu Lampa chèn link rác, ta ẩn đi để hiện background sạch */
                .card__img[src*="image.tmdb.org/t/p/w300/https"] { opacity: 0 !important; }
                .card__img { background-color: #1a1a1a; object-fit: cover !important; }
                .bar { background: #000 !important; }
            </style>
        `);
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') startPlugin(); });
})();

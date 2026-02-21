(function () {
    'use strict';

    function KKPhimPlugin(object) {
        var network = new Lampa.Reguest();
        var scroll  = new Lampa.Scroll({mask: true, over: true});
        var items   = [];
        var html    = $('<div></div>');
        var body    = $('<div class="category-full"></div>');
        
        var currentPage = 1;
        var isLoading   = false;
        var isEnd       = false;

        // 1. Cấu hình danh mục
        var categories = [
            { title: 'Mới cập nhật', url: 'https://phimapi.com/danh-sach/phim-moi-cap-nhat' },
            { title: 'Phim Lẻ', url: 'https://phimapi.com/v1/api/danh-sach/phim-le' },
            { title: 'Phim Bộ', url: 'https://phimapi.com/v1/api/danh-sach/phim-bo' },
            { title: 'Hoạt Hình', url: 'https://phimapi.com/v1/api/danh-sach/hoat-hinh' },
            { title: 'TV Shows', url: 'https://phimapi.com/v1/api/danh-sach/tv-shows' }
        ];

        this.create = function () {
            var _this = this;

            if (!object.url && !object.search) {
                return this.renderCategories();
            }

            // Gắn sự kiện cuộn để Load More
            scroll.onScroll = function (y) {
                if (y > scroll.scrollHeight() - (window.innerHeight * 1.5) && !isLoading && !isEnd) {
                    _this.loadNextPage();
                }
            };

            this.loadNextPage(); // Tải trang đầu tiên

            return this.render();
        };

        this.loadNextPage = function () {
            var _this = this;
            isLoading = true;
            
            var apiUrl = object.url || 'https://phimapi.com/danh-sach/phim-moi-cap-nhat';
            if (object.search) {
                apiUrl = 'https://phimapi.com/v1/api/tim-kiem?keyword=' + encodeURIComponent(object.search);
            }

            // Thêm tham số page vào URL
            var separator = apiUrl.indexOf('?') > -1 ? '&' : '?';
            var finalUrl = apiUrl + separator + 'page=' + currentPage;

            network.silent(finalUrl, function (data) {
                var list = data.items || (data.data ? data.data.items : []);
                
                if (list && list.length) {
                    list.forEach(function (item) {
                        var card = Lampa.Template.get('card', {
                            title: item.name,
                            original_title: item.origin_name,
                            img: (item.thumb_url.indexOf('http') > -1 ? '' : 'https://phimimg.com/') + item.thumb_url,
                            year: item.year
                        });

                        card.on('click:select', function () {
                            _this.playMovie(item.slug);
                        });

                        body.append(card);
                        items.push(card);
                    });

                    currentPage++; // Tăng trang cho lần sau
                    isLoading = false;
                } else {
                    isEnd = true; // Hết phim để tải
                    if(currentPage === 1) Lampa.Noty.show('Không tìm thấy dữ liệu');
                }
            }, function() {
                isLoading = false;
                Lampa.Noty.show('Lỗi tải thêm phim');
            });
        };

        this.playMovie = function (slug) {
            Lampa.Noty.show('Đang lấy link...');
            fetch('https://phimapi.com/phim/' + slug)
                .then(res => res.json())
                .then(data => {
                    if (data.episodes && data.episodes[0].server_data.length > 0) {
                        var episodes = data.episodes[0].server_data;
                        var playlist = episodes.map(ep => ({ title: ep.name, url: ep.link_m3u8 }));
                        Lampa.Player.play({ url: episodes[0].link_m3u8, title: data.movie.name });
                        Lampa.Player.playlist(playlist);
                    }
                });
        };

        this.renderCategories = function () {
            var cat_html = $('<div class="category-full"></div>');
            categories.forEach(function (cat) {
                var item = $('<div class="selector item_menu" style="margin: 1%; padding: 25px; background: rgba(255,255,255,0.08); border-radius: 10px; text-align: center; width: 48%; float: left; cursor: pointer;">' + cat.title + '</div>');
                item.on('click:select', function () {
                    Lampa.Activity.push({ title: cat.title, component: 'kkphim', url: cat.url });
                });
                cat_html.append(item);
            });
            return cat_html;
        };

        this.render = function () { 
            html.append(body);
            html.append(scroll.render()); // Quan trọng: Phải render scroll
            return html; 
        };

        this.destroy = function () {
            network.clear();
            scroll.destroy();
            items.forEach(item => item.destroy());
            html.remove();
        };
    }

    function startPlugin() {
        Lampa.Component.add('kkphim', KKPhimPlugin);
        Lampa.Menu.add({
            title: 'KKPhim',
            component: 'kkphim',
            icon: '<svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" fill="white"/></svg>'
        });
        Lampa.Search.addSource(function (search_object) {
            return {
                title: 'KKPhim',
                search: function (query) {
                    return new Promise(function (resolve) {
                        resolve([{ title: 'Tìm: ' + query, component: 'kkphim', search: query }]);
                    });
                }
            };
        });
    }

    if (window.app_ready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') startPlugin(); });
})();

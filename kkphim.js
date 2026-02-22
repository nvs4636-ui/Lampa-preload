(function () {
    'use strict';

    function KKPhim(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({mask: true, over: true, check_bottom: true});
        var items = [];
        var html = $('<div></div>');
        
        // Danh sách các mục bạn muốn hiển thị đồng thời
        var categories = [
            { title: 'Phim Mới Cập Nhật', url: 'https://kkphim.vip/api/v1/danh-sach/phim-moi-cap-nhat' },
            { title: 'Phim Lẻ', url: 'https://kkphim.vip/api/v1/danh-sach/phim-le' },
            { title: 'Phim Bộ', url: 'https://kkphim.vip/api/v1/danh-sach/phim-bo' },
            { title: 'Hoạt Hình', url: 'https://kkphim.vip/api/v1/danh-sach/hoat-hinh' }
        ];

        this.create = function () {
            var _this = this;

            // Lặp qua từng danh mục để tạo hàng phim
            categories.forEach(function(cat) {
                _this.buildRow(cat);
            });

            scroll.append(html);
            return scroll.render();
        };

        this.buildRow = function (cat) {
            var row = $('<div class="category-full"><div class="category-full__title" style="padding: 20px 0 10px 20px; font-size: 1.5em; font-weight: bold;">' + cat.title + '</div><div class="category-full__body"></div></div>');
            var body = row.find('.category-full__body');

            network.silent(cat.url + '?page=1', function (json) {
                if (json.status && json.data.items) {
                    json.data.items.slice(0, 10).forEach(function (item) { // Lấy 10 phim mỗi hàng
                        var card = Lampa.Template.get('card', {
                            title: item.name,
                            release_year: item.year
                        });

                        card.find('.card__img').attr('src', 'https://phimimg.com/' + item.poster_url);
                        
                        // Xử lý phát phim ngay lập tức
                        card.on('hover:enter', function () {
                            Lampa.Noty.show('Đang lấy link phim...');
                            var detailUrl = 'https://kkphim.vip/api/v1/phim/' + item.slug;
                            
                            network.silent(detailUrl, function(detail) {
                                if(detail.status && detail.movie.episodes[0].server_data[0]) {
                                    var videoData = detail.movie.episodes[0].server_data[0];
                                    Lampa.Player.play({
                                        url: videoData.link_m3u8,
                                        title: item.name
                                    });
                                } else {
                                    Lampa.Noty.show('Lỗi lấy link!');
                                }
                            });
                        });

                        body.append(card);
                    });
                }
            });
            html.append(row);
        };

        this.start = function () {
            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(scroll.render());
                    Lampa.Controller.move('right');
                }
            });
            Lampa.Controller.enable('content');
        };

        this.pause = function () {};
        this.stop = function () {};
    }

    // Tích hợp vào Menu chính
    if (!window.kkphim_plugin_initialized) {
        Lampa.Component.add('kkphim', KKPhim);

        var addMenuItem = function() {
            var menu_item = $('<li class="menu__item selector" data-action="kkphim">' +
                '<div class="menu__ico"><svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M2 8L12 2L22 8V22H2V8Z"/></svg></div>' +
                '<div class="menu__text">KKPhim Full</div>' +
            '</li>');

            menu_item.on('hover:enter', function() {
                Lampa.Activity.push({
                    title: 'KKPhim',
                    component: 'kkphim'
                });
            });

            $('.menu .menu__list').append(menu_item);
        };

        if (window.appready) addMenuItem();
        else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') addMenuItem(); });
        
        window.kkphim_plugin_initialized = true;
    }
})();

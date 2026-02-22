(function () {
    'use strict';

    function KKPhim(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({mask: true, over: true, check_bottom: true});
        var items = [];
        var html = $('<div></div>');
        var body = $('<div class="category-full"></div>');
        
        // Giữ nguyên các danh mục theo ý bạn
        var categories = [
            { title: 'Phim Mới Cập Nhật', url: 'https://kkphim.vip/api/v1/danh-sach/phim-moi-cap-nhat' },
            { title: 'Phim Lẻ', url: 'https://kkphim.vip/api/v1/danh-sach/phim-le' },
            { title: 'Phim Bộ', url: 'https://kkphim.vip/api/v1/danh-sach/phim-bo' },
            { title: 'Hoạt Hình', url: 'https://kkphim.vip/api/v1/danh-sach/hoat-hinh' }
        ];

        this.create = function () {
            var _this = this;
            // Bố cục Menu ngang/dọc theo style mẫu
            var menu = $('<div class="category-full__menu"></div>');
            categories.forEach(function(cat) {
                var item = $('<div class="category-full__menu-item selector">' + cat.title + '</div>');
                item.on('hover:enter', function() {
                    _this.loadCategory(cat.url);
                });
                menu.append(item);
            });

            html.append(menu);
            html.append(body);
            scroll.append(html);
            
            this.loadCategory(categories[0].url);
            return scroll.render();
        };

        this.loadCategory = function (url) {
            body.empty();
            network.silent(url + '?page=1', function (json) {
                if (json.status && json.data.items) {
                    json.data.items.forEach(function (item) {
                        var card = Lampa.Template.get('card', {
                            title: item.name,
                            release_year: item.year
                        });

                        card.find('.card__img').attr('src', 'https://phimimg.com/' + item.poster_url);
                        
                        // PHẦN PHÁT PHIM LUÔN
                        card.on('hover:enter', function () {
                            Lampa.Select.show({
                                title: 'Đang lấy link...',
                                items: [{ title: 'Chờ trong giây lát' }]
                            });

                            // Gọi API chi tiết để lấy link m3u8
                            var detailUrl = 'https://kkphim.vip/api/v1/phim/' + item.slug;
                            network.silent(detailUrl, function(detail) {
                                Lampa.Select.close();
                                if(detail.status && detail.movie.episodes[0].server_data[0]) {
                                    var videoData = detail.movie.episodes[0].server_data[0];
                                    
                                    // Gọi trình phát của Lampa
                                    Lampa.Player.play({
                                        url: videoData.link_m3u8,
                                        title: item.name,
                                        video: {
                                            title: item.name,
                                            url: videoData.link_m3u8
                                        }
                                    });
                                    
                                    Lampa.Player.playlist([
                                        {
                                            title: item.name,
                                            url: videoData.link_m3u8
                                        }
                                    ]);
                                } else {
                                    Lampa.Noty.show('Không tìm thấy link phim!');
                                }
                            });
                        });

                        body.append(card);
                    });
                    Lampa.Controller.enable('content');
                }
            });
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

    // Đăng ký Plugin vào Menu trái của Lampa
    if (!window.kkphim_plugin_initialized) {
        Lampa.Component.add('kkphim', KKPhim);

        var addMenuItem = function() {
            var menu_item = $('<li class="menu__item selector" data-action="kkphim">' +
                '<div class="menu__ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg></div>' +
                '<div class="menu__text">KKPhim</div>' +
            '</li>');

            menu_item.on('hover:enter', function() {
                Lampa.Activity.push({
                    title: 'KKPhim',
                    component: 'kkphim',
                    page: 1
                });
            });

            $('.menu .menu__list').append(menu_item);
        };

        if (window.appready) addMenuItem();
        else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') addMenuItem(); });
        
        window.kkphim_plugin_initialized = true;
    }
})();

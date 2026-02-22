(function () {
    'use strict';

    function Component(object) {
        var network = new Lampa.Reguest();
        var scroll  = new Lampa.Scroll({mask:true,over:true,check_bottom:true});
        var items   = [];
        var html    = $('<div></div>');
        var body    = $('<div class="category-full"></div>');
        var info;
        var last;
        var wait_load;

        // Bê nguyên mảng mục lục của họ, chỉ thay chữ và link API KKPhim
        var menu = [
            {
                title: 'Phim mới',
                url: 'https://kkphim.vip/api/v1/danh-sach/phim-moi-cap-nhat'
            },
            {
                title: 'Phim bộ',
                url: 'https://kkphim.vip/api/v1/danh-sach/phim-bo'
            },
            {
                title: 'Phim lẻ',
                url: 'https://kkphim.vip/api/v1/danh-sach/phim-le'
            },
            {
                title: 'Hoạt hình',
                url: 'https://kkphim.vip/api/v1/danh-sach/hoat-hinh'
            },
            {
                title: 'TV Shows',
                url: 'https://kkphim.vip/api/v1/danh-sach/tv-shows'
            }
        ];

        this.create = function () {
            var _this = this;
            var menu_html = $('<div class="category-full__menu"></div>');

            menu.forEach(function (m) {
                var item = $('<div class="category-full__menu-item selector">' + m.title + '</div>');
                item.on('hover:enter', function () {
                    _this.load(m.url);
                });
                menu_html.append(item);
            });

            html.append(menu_html);
            html.append(body);
            scroll.append(html);

            this.load(menu[0].url);

            return scroll.render();
        };

        this.load = function (url) {
            var _this = this;
            body.empty();
            Lampa.Activity.loader(true); // Hiệu ứng load của Xsena

            network.silent(url + '?page=1', function (json) {
                Lampa.Activity.loader(false);
                if (json.status) {
                    json.data.items.forEach(function (item) {
                        // Card template chuẩn Lampa
                        var card = Lampa.Template.get('card', {
                            title: item.name,
                            release_year: item.year
                        });

                        card.find('.card__img').attr('src', 'https://phimimg.com/' + item.poster_url);

                        card.on('hover:enter', function () {
                            // Logic phát phim thẳng
                            Lampa.Activity.loader(true);
                            network.silent('https://kkphim.vip/api/v1/phim/' + item.slug, function (detail) {
                                Lampa.Activity.loader(false);
                                if (detail.status && detail.movie.episodes[0].server_data[0]) {
                                    var stream_url = detail.movie.episodes[0].server_data[0].link_m3u8;
                                    Lampa.Player.play({
                                        url: stream_url,
                                        title: item.name
                                    });
                                    Lampa.Player.playlist([{
                                        title: item.name,
                                        url: stream_url
                                    }]);
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
                },
                right: function () {
                    Lampa.Controller.set('content');
                }
            });
            Lampa.Controller.enable('content');
        };

        this.pause = function () {};
        this.stop = function () {};
    }

    // Phần đăng ký Plugin giữ nguyên mẫu
    if (!window.kkphim_plugin_initialized) {
        Lampa.Component.add('kkphim', Component);

        var add = function () {
            var item = $('<li class="menu__item selector" data-action="kkphim">' +
                '<div class="menu__ico"><svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M7 2H17L22 7V17L17 22H7L2 17V7L7 2Z"></path><path d="M12 8V16"></path><path d="M8 12H16"></path></svg></div>' +
                '<div class="menu__text">KKPhim</div>' +
            '</li>');

            item.on('hover:enter', function () {
                Lampa.Activity.push({
                    title: 'KKPhim',
                    component: 'kkphim',
                    page: 1
                });
            });

            $('.menu .menu__list').append(item);
        };

        if (window.appready) add();
        else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') add(); });

        window.kkphim_plugin_initialized = true;
    }
})();

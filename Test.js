(function () {
    'use strict';

    var plugin_name = 'KKPhim';
    var api_host = 'https://phimapi.com/';
    var img_proxy = 'https://phimimg.com/';

    // dọn menu cũ
    $('.menu__item[data-action="kkphim"]').remove();

    function KKPhim(object) {
        var network = new Lampa.Request();
        var scroll = new Lampa.Scroll({ mask: true });
        var items = [];
        var html = $('<div class="content"></div>');
        var self = this;

        var CATEGORIES = [
            { title: 'Phim Mới', url: api_host + 'danh-sach/phim-moi-cap-nhat' },
            { title: 'Phim Lẻ', url: api_host + 'v1/api/danh-sach/phim-le' },
            { title: 'Phim Bộ', url: api_host + 'v1/api/danh-sach/phim-bo' },
            { title: 'Hoạt Hình', url: api_host + 'v1/api/danh-sach/hoat-hinh' },
            { title: 'TV Shows', url: api_host + 'v1/api/danh-sach/tv-shows' }
        ];

        this.create = function () {
            Lampa.Loading.start();
            scroll.append(html);

            if (object.url) this.loadCategory(object);
            else this.loadHome();

            return scroll.render();
        };

        /* HOME */
        this.loadHome = function () {
            var index = 0;

            function next() {
                if (index >= CATEGORIES.length) {
                    self.finalize();
                    return;
                }

                self.loadRow(CATEGORIES[index], function () {
                    index++;
                    next();
                });
            }

            next();
        };

        this.loadRow = function (cat, done) {
            network.silent(cat.url + '?page=1', function (data) {
                var list = data?.data?.items || data?.items || [];
                if (!list.length) return done();

                var row = Lampa.Template.get('category', {
                    title: cat.title,
                    more: true
                });

                row.find('.category__more').on('click', function () {
                    Lampa.Activity.push({
                        component: 'kkphim',
                        title: cat.title,
                        url: cat.url,
                        page: 1
                    });
                });

                var cards = row.find('.category__items');

                list.slice(0, 15).forEach(function (item) {
                    var card = self.createCard(item);
                    cards.append(card);
                    items.push(card);
                });

                html.append(row);
                done();
            }, done);
        };

        /* CATEGORY GRID */
        this.loadCategory = function (object) {
            network.silent(object.url + '?page=' + (object.page || 1), function (data) {
                var list = data?.data?.items || data?.items || [];

                list.forEach(function (item) {
                    var card = self.createCard(item);
                    html.append(card);
                    items.push(card);
                });

                self.finalize();
            });
        };

        this.createCard = function (item) {
            var card = Lampa.Template.get('card', {
                title: item.name,
                release_year: item.year || ''
            });

            var img = item.poster_url || item.thumb_url || item.poster || '';
            card.find('.card__img').attr(
                'src',
                img.includes('http') ? img : img_proxy + img
            );

            card.addClass('selector');

            card.on('click', function () {
                self.openDetail(item);
            });

            return card;
        };

        this.openDetail = function (item) {
            Lampa.Loading.start();

            network.silent(api_host + 'phim/' + item.slug, function (data) {
                Lampa.Loading.stop();

                if (!data?.episodes?.length) return;

                var eps = data.episodes[0].server_data;

                Lampa.Select.show({
                    title: item.name,
                    items: eps.map(function (e) {
                        return {
                            title: 'Tập ' + e.name,
                            url: e.link_m3u8
                        };
                    }),
                    onSelect: function (play) {
                        Lampa.Player.play({
                            title: play.title,
                            url: play.url
                        });
                    }
                });
            });
        };

        this.finalize = function () {
            Lampa.Loading.stop();
            setTimeout(function () {
                scroll.update();
                self.start();
            }, 200);
        };

        this.start = function () {
            Lampa.Controller.add('kkphim', {
                toggle: function () {
                    Lampa.Controller.collectionSet(scroll.render());
                    Lampa.Controller.collectionFocus(false, scroll.render());
                },
                back: function () {
                    Lampa.Activity.backward();
                }
            });
            Lampa.Controller.toggle('kkphim');
        };

        this.destroy = function () {
            network.clear();
            scroll.destroy();
            html.remove();
            items = [];
        };
    }

    function startPlugin() {
        Lampa.Component.add('kkphim', KKPhim);

        var menu = $(`
            <li class="menu__item selector" data-action="kkphim">
                <div class="menu__ico">🎬</div>
                <div class="menu__text">KKPhim</div>
            </li>
        `);

        menu.on('click', function () {
            Lampa.Activity.push({
                component: 'kkphim',
                title: 'KKPhim'
            });
        });

        $('.menu .menu__list').append(menu);
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') startPlugin();
    });
})();
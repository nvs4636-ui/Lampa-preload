(function () {
    'use strict';

    if (!window.Lampa) return;

    var SOURCE_NAME = 'kkphim';
    var BASE_URL = 'https://phimapi.com';
    var IMG_URL = 'https://phimimg.com/';
    var NETWORK = new Lampa.Reguest();

    /* =========================
       CATEGORY
    ========================== */
    var CATEGORIES = [
        {
            title: 'Phim mới cập nhật',
            url: BASE_URL + '/danh-sach/phim-moi-cap-nhat'
        },
        {
            title: 'Phim lẻ',
            url: BASE_URL + '/v1/api/danh-sach/phim-le'
        },
        {
            title: 'Phim bộ',
            url: BASE_URL + '/v1/api/danh-sach/phim-bo'
        },
        {
            title: 'Hoạt hình',
            url: BASE_URL + '/v1/api/danh-sach/hoat-hinh'
        },
        {
            title: 'TV Shows',
            url: BASE_URL + '/v1/api/danh-sach/tv-shows'
        }
    ];

    /* =========================
       NORMALIZE DATA
    ========================== */
    function normalize(json) {
        var items = [];

        if (json?.data?.items) items = json.data.items;
        else if (json?.items) items = json.items;

        return {
            results: items.map(function (item) {
                return {
                    id: item._id || item.slug,
                    title: item.name,
                    original_title: item.origin_name,
                    overview: item.content || '',
                    poster_path: item.poster_url
                        ? (item.poster_url.indexOf('http') === 0
                            ? item.poster_url
                            : IMG_URL + item.poster_url)
                        : '',
                    backdrop_path: item.thumb_url
                        ? (item.thumb_url.indexOf('http') === 0
                            ? item.thumb_url
                            : IMG_URL + item.thumb_url)
                        : '',
                    release_date: item.year ? item.year + '-01-01' : '',
                    vote_average: 0,
                    source: SOURCE_NAME,
                    slug: item.slug
                };
            }),
            page: json?.data?.params?.page || 1,
            total_pages: json?.data?.params?.pagination?.totalPages || 1
        };
    }

    /* =========================
       API PART
    ========================== */
    function load(url, page, call) {
        var link = url.indexOf('/v1/api/') > -1
            ? url + '?page=' + page + '&limit=15'
            : url + '?page=' + page;

        NETWORK.silent(link, function (json) {
            call(normalize(json));
        }, function () {
            call({ results: [] });
        });
    }

    /* =========================
       MAIN COMPONENT
    ========================== */
    function Component() {
        var html = $('<div></div>');
        var scroll = new Lampa.Scroll({ mask: true });
        var items = new Lampa.Items({
            card: 'card',
            onSelect: function (e) {
                Lampa.Activity.push({
                    url: e.data.slug,
                    title: e.data.title,
                    component: 'full',
                    source: SOURCE_NAME
                });
            }
        });

        html.append(scroll.render());
        scroll.append(items.render());

        this.create = function () {
            scroll.add(items.render());
        };

        this.load = function () {
            CATEGORIES.forEach(function (cat) {
                var row = new Lampa.Row({
                    title: cat.title,
                    more: true
                });

                scroll.append(row.render());

                load(cat.url, 1, function (data) {
                    row.append(data.results);
                });

                row.onMore = function () {
                    Lampa.Activity.push({
                        title: cat.title,
                        component: 'category',
                        source: SOURCE_NAME,
                        url: cat.url
                    });
                };
            });
        };

        this.render = function () {
            return html;
        };

        this.destroy = function () {
            scroll.destroy();
            html.remove();
        };
    }

    /* =========================
       CATEGORY PAGE
    ========================== */
    Lampa.Component.add('category', function () {
        var component = this;
        var page = 1;
        var url;
        var scroll = new Lampa.Scroll({ mask: true });
        var items = new Lampa.Items({
            card: 'card',
            onSelect: function (e) {
                Lampa.Activity.push({
                    url: e.data.slug,
                    title: e.data.title,
                    component: 'full',
                    source: SOURCE_NAME
                });
            }
        });

        this.create = function () {
            component.activity.loader(true);
            url = component.activity.url;
            scroll.append(items.render());
            component.load();
        };

        this.load = function () {
            load(url, page, function (data) {
                component.activity.loader(false);
                items.append(data.results);
                page++;
            });
        };

        this.render = function () {
            return scroll.render();
        };

        this.destroy = function () {
            scroll.destroy();
        };
    });

    /* =========================
       FULL (DETAIL)
    ========================== */
    Lampa.Component.add('full', function () {
        var component = this;
        var slug;

        this.create = function () {
            slug = component.activity.url;

            NETWORK.silent(BASE_URL + '/phim/' + slug, function (json) {
                var movie = json.movie;

                component.activity.set({
                    title: movie.name,
                    description: movie.content || '',
                    poster: IMG_URL + movie.poster_url,
                    backdrop: IMG_URL + movie.thumb_url
                });

                if (movie.episodes && movie.episodes.length) {
                    var episodes = [];

                    movie.episodes[0].server_data.forEach(function (ep) {
                        episodes.push({
                            title: ep.name,
                            url: ep.link_m3u8 || ep.link_embed
                        });
                    });

                    component.activity.setEpisodes(episodes);
                }
            });
        };
    });

    /* =========================
       SOURCE REGISTER
    ========================== */
    Lampa.Source.add({
        title: 'KKPhim',
        name: SOURCE_NAME,
        component: 'kkphim'
    });

    Lampa.Component.add('kkphim', Component);

})();
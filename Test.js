(function () {
    'use strict';

    // Dọn dẹp tàn dư cũ
    $('.menu__item[data-action="kkphim"]').remove();
    $('#kk-style').remove();

    function KKPhim(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({mask: true, over: true});
        var items = [];
        var body = $('<div class="category-list"></div>'); // Đổi class để tránh xung đột CSS cũ
        var api_host = 'https://phimapi.com/';
        var img_proxy = 'https://phimimg.com/';
        var self = this;

        this.create = function () {
            if (!object.url) {
                this.buildHome();
            } else {
                this.loadCategory(object.url, object.title);
            }
            return scroll.render();
        };

        this.buildHome = function () {
            var categories = [
                { title: 'Phim Mới Cập Nhật', url: api_host + 'danh-sach/phim-moi-cap-nhat' },
                { title: 'Phim Lẻ', url: api_host + 'v1/api/danh-sach/phim-le' },
                { title: 'Phim Bộ', url: api_host + 'v1/api/danh-sach/phim-bo' },
                { title: 'Hoạt Hình', url: api_host + 'v1/api/danh-sach/hoat-hinh' }
            ];

            categories.forEach(function (cat) {
                var row = $(`
                    <div class="kk-row">
                        <div class="kk-row__header">
                            <span class="kk-row__title">${cat.title}</span>
                            <div class="kk-row__more selector">Xem thêm</div>
                        </div>
                        <div class="kk-row__content selector"></div>
                    </div>
                `);
                
                row.find('.kk-row__more').on('click hover:enter', function() {
                    Lampa.Activity.push({
                        title: cat.title,
                        url: cat.url,
                        component: 'kkphim',
                        page: 1
                    });
                });

                body.append(row);
                
                network.silent(cat.url + (cat.url.includes('?') ? '&' : '?') + 'page=1', function (data) {
                    var list = (data.data && data.data.items) ? data.data.items : (data.items || []);
                    var content = row.find('.kk-row__content');
                    
                    list.slice(0, 8).forEach(function (item) {
                        var card = Lampa.Template.get('card', { title: item.name, release_year: item.year });
                        var poster = item.poster_url || item.thumb_url || '';
                        card.find('.card__img').attr('src', poster.includes('http') ? poster : img_proxy + poster);
                        
                        card.addClass('selector');
                        card.on('click hover:enter', function (e) { 
                            e.stopPropagation();
                            self.getStream(item.slug, item.name); 
                        });
                        
                        content.append(card);
                    });
                    scroll.update();
                });
            });

            scroll.append(body);
        };

        this.loadCategory = function (url, title) {
            var grid = $('<div class="category-full"></div>');
            network.silent(url + (url.includes('?') ? '&' : '?') + 'page=' + (object.page || 1), function (data) {
                var list = (data.data && data.data.items) ? data.data.items : (data.items || []);
                list.forEach(function (item) {
                    var card = Lampa.Template.get('card', { title: item.name, release_year: item.year });
                    var poster = item.poster_url || item.thumb_url || '';
                    card.find('.card__img').attr('src', poster.includes('http') ? poster : img_proxy + poster);
                    card.addClass('selector');
                    card.on('click hover:enter', function () { self.getStream(item.slug, item.name); });
                    grid.append(card);
                });
                scroll.append(grid);
                scroll.update();
            });
        };

        this.getStream = function (slug, title) {
            // Dùng Noty thay vì Loading để tránh lỗi hàm không tồn tại
            Lampa.Noty.show('Đang lấy link phim...');
            network.silent(api_host + 'phim/' + slug, function (data) {
                if (data && data.episodes && data.episodes[0].server_data.length > 0) {
                    var server = data.episodes[0].server_data;
                    Lampa.Select.show({
                        title: title,
                        items: server.map(function(ep) { return { title: 'Tập ' + ep.name, url: ep.link_m3u8 }; }),
                        onSelect: function(selected) { 
                            Lampa.Player.play(selected); 
                        }
                    });
                } else {
                    Lampa.Noty.show('Không tìm thấy link phim!');
                }
            });
        };

        this.start = function () {
            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(scroll.render());
                    Lampa.Controller.collectionFocus(false, scroll.render());
                },
                up: function () { Lampa.Select.show(); },
                back: function () { Lampa.Activity.backward(); }
            });
            Lampa.Controller.toggle('content');
        };

        this.render = function () { return scroll.render(); };
        this.destroy = function () {
            network.clear();
            scroll.destroy();
            body.remove();
        };
    }

    function startPlugin() {
        Lampa.Component.add('kkphim', KKPhim);

        var menu_item = $('<li class="menu__item selector" data-action="kkphim">' +
            '<div class="menu__ico"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg></div>' +
            '<div class="menu__text">KKPhim</div>' +
            '</li>');

        menu_item.on('click', function () {
            Lampa.Activity.push({ title: 'KKPhim Home', component: 'kkphim', page: 1 });
        });

        $('.menu .menu__list').append(menu_item);

        // CSS mới tối ưu vuốt dọc và ngang tách biệt
        if (!$('#kk-style').length) {
            $('head').append(`<style id="kk-style">
                .kk-row { margin-bottom: 25px; pointer-events: all; }
                .kk-row__header { display: flex; justify-content: space-between; align-items: center; padding: 0 15px 10px; }
                .kk-row__title { font-size: 1.6em; font-weight: bold; color: #fff; }
                .kk-row__more { background: rgba(255,255,255,0.1); padding: 6px 15px; border-radius: 20px; font-size: 0.9em; }
                .kk-row__more.focus { background: #e74c3c; color: #fff; }
                .kk-row__content { 
                    display: flex; 
                    overflow-x: auto; 
                    overflow-y: hidden;
                    padding: 0 10px; 
                    -webkit-overflow-scrolling: touch; 
                    gap: 10px;
                }
                .kk-row__content::-webkit-scrollbar { display: none; }
                .kk-row__content .card { flex: 0 0 140px; width: 140px; margin: 0; }
                .category-list { padding-bottom: 50px; }
            </style>`);
        }
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') startPlugin(); });
})();

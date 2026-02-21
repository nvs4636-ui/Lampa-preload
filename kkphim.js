(function () {
    'use strict';

    function startPlugin() {
        // Xóa sạch các dấu vết cũ của kkphim nếu có
        $('[data-component="kkphim"]').remove();

        // Đăng ký Component
        Lampa.Component.add('kkphim', function(object) {
            var network = new Lampa.Reguest();
            var html = $('<div></div>');
            var body = $('<div class="category-full"></div>');

            this.create = function() {
                var _this = this;
                var url = object.search ? 'https://phimapi.com/v1/api/tim-kiem?keyword=' + encodeURIComponent(object.search) : 'https://phimapi.com/danh-sach/phim-moi-cap-nhat?page=1';
                
                network.silent(url, function(data) {
                    var list = data.items || (data.data ? data.data.items : []);
                    html.empty().append(body);
                    list.forEach(function(item) {
                        var card = Lampa.Template.get('card', {
                            title: item.name,
                            img: (item.thumb_url.indexOf('http') > -1 ? '' : 'https://phimimg.com/') + item.thumb_url
                        });
                        card.on('click:select', function() {
                            Lampa.Noty.show('Đang lấy link...');
                            fetch('https://phimapi.com/phim/' + item.slug).then(r => r.json()).then(d => {
                                var episodes = d.episodes[0].server_data;
                                Lampa.Player.play({ url: episodes[0].link_m3u8, title: d.movie.name });
                                Lampa.Player.playlist(episodes.map(e => ({title: e.name, url: e.link_m3u8})));
                            });
                        });
                        body.append(card);
                    });
                });
                return html;
            };
            this.render = function() { return html; };
            this.destroy = function() { network.clear(); html.remove(); };
        });

        // TẠO MENU VỚI CƠ CHẾ DÁN ĐÈ (FORCE)
        var addMenu = function() {
            var menu_item = {
                title: 'KKPhim',
                component: 'kkphim',
                icon: '<svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M18 3v2h-2V3H8v2H6V3H4v18h2v-2h2v2h8v-2h2v2h2V3h-2zM8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2zm10 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z" fill="white"/></svg>'
            };

            // Thêm vào danh sách menu của Lampa
            Lampa.Menu.add(menu_item);
            
            // Nếu vẫn không thấy, ép nó xuất hiện sau 1 giây
            setTimeout(function(){
                if($('.menu__item[data-component="kkphim"]').length == 0){
                    $('.menu__list').prepend('<li class="menu__item selector" data-component="kkphim"><div class="menu__ico">' + menu_item.icon + '</div><div class="menu__text">' + menu_item.title + '</div></li>');
                }
            }, 1000);
        };

        addMenu();
        Lampa.Noty.show('Đã sửa lỗi Menu KKPhim');
    }

    if (window.app_ready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') startPlugin(); });
})();

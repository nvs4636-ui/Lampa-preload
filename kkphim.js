(function () {
    'use strict';
    var start = function () {
        // Thông báo để kiểm tra plugin có chạy hay không
        Lampa.Noty.show('KKPhim đã sẵn sàng!');

        Lampa.Component.add('kkphim', function(object) {
            this.create = function () {
                var html = $('<div class="category-full"><div class="selector" style="padding: 20px; text-align: center;">Đang tải dữ liệu KKPhim...</div></div>');
                var url = object.search ? 'https://phimapi.com/v1/api/tim-kiem?keyword=' + encodeURIComponent(object.search) : 'https://phimapi.com/danh-sach/phim-moi-cap-nhat?page=1';
                
                $.getJSON(url, function(data) {
                    html.empty();
                    var list = data.items || (data.data ? data.data.items : []);
                    list.forEach(function(item) {
                        var card = Lampa.Template.get('card', {
                            title: item.name,
                            img: 'https://phimimg.com/' + item.thumb_url
                        });
                        card.on('click:select', function() {
                            // Gọi hàm phát phim ở đây
                        });
                        html.append(card);
                    });
                });
                return html;
            };
            this.render = function() { return this.create(); };
            this.destroy = function() {};
        });

        Lampa.Menu.add({
            title: 'KKPhim',
            component: 'kkphim',
            icon: '<svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M10 16.5l6-4.5-6-4.5v9z" fill="white"/></svg>'
        });
    };

    if (window.app_ready) start();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') start(); });
})();

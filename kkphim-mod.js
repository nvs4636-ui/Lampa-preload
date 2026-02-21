(function () {
    'use strict';

    function startPlugin() {
        // 1. Lắng nghe khi người dùng mở trang chi tiết một bộ phim
        Lampa.Listener.follow('full', function (e) {
            if (e.type == 'complite') {
                var movie = e.data.movie;
                var title = movie.title || movie.name;
                
                // 2. Tạo nút bấm KKPhim với giao diện giống nút 4K Showy
                // Chúng ta dùng class 'full-start__button' và 'selector' để nó có hiệu ứng khi di chuyển remote
                var btn = $('<div class="full-start__button selector btn--kkphim" style="background-color: #e67e22; color: #fff;">' +
                                '<svg height="18" viewBox="0 0 24 24" width="18" fill="white" style="margin-right: 5px; vertical-align: middle;"><path d="M10 16.5l6-4.5-6-4.5v9z"/></svg>' +
                                '<span>KKPhim</span>' +
                            '</div>');

                // 3. Xử lý khi bấm vào nút
                btn.on('click:select', function () {
                    Lampa.Noty.show('Đang tìm nguồn cho: ' + title);
                    
                    var searchUrl = 'https://phimapi.com/v1/api/tim-kiem?keyword=' + encodeURIComponent(title);
                    
                    $.getJSON(searchUrl, function (res) {
                        var found = res.data ? res.data.items[0] : null;
                        if (found) {
                            $.getJSON('https://phimapi.com/phim/' + found.slug, function (detail) {
                                var eps = detail.episodes[0].server_data;
                                // Hiện danh sách tập để chọn
                                Lampa.Select.show({
                                    title: detail.movie.name,
                                    items: eps.map(function(item) {
                                        return { title: 'Tập ' + item.name, url: item.link_m3u8 };
                                    }),
                                    onSelect: function (selected) {
                                        Lampa.Player.play({
                                            url: selected.url,
                                            title: detail.movie.name + ' - ' + selected.title
                                        });
                                        Lampa.Player.playlist(eps.map(i => ({ title: 'Tập ' + i.name, url: i.link_m3u8 })));
                                    }
                                });
                            });
                        } else {
                            Lampa.Noty.show('Không tìm thấy nguồn phim này trên KKPhim');
                        }
                    });
                });

                // 4. Chèn nút vào đúng hàng có các nút Play, Trailers, và 4K Showy
                var container = e.object.render().find('.full-start__buttons');
                if (container.length) {
                    container.append(btn);
                    // Refresh lại Controller để remote có thể nhận diện nút mới chèn vào
                    Lampa.Controller.add('full', {
                        toggle: function() {
                            Lampa.Controller.collectionSet(e.object.render());
                            Lampa.Controller.toggle('full');
                        }
                    });
                }
            }
        });

        // 5. Vẫn giữ lệnh Import Online Mod gốc để ní có đầy đủ nguồn khác
        $.getScript('https://nb557.github.io/plugins/online_mod.js');
        $.getScript('http://showy.online/m.js');
    }

    if (window.app_ready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') startPlugin(); });
})();

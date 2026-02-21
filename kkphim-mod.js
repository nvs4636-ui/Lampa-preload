(function () {
    'use strict';

    function startPlugin() {
        // 1. Nạp các nguồn quốc tế trước
        $.getScript('https://nb557.github.io/plugins/online_mod.js');
        $.getScript('http://showy.online/m.js');

        // 2. Đợi 1 chút cho các nút của họ hiện ra rồi mình mới "chen chân" vào
        Lampa.Listener.follow('full', function (e) {
            if (e.type == 'complite') {
                setTimeout(function() {
                    var render = e.object.render();
                    var container = render.find('.full-start__buttons');
                    
                    // Kiểm tra nếu nút KKPhim chưa tồn tại thì mới chèn (tránh trùng lặp)
                    if (container.length && !container.find('.btn--kkphim').length) {
                        var title = e.data.movie.title || e.data.movie.name;
                        
                        var btn = $('<div class="full-start__button selector btn--kkphim" style="background-color: #f39c12 !important; color: #fff !important; border-radius: 5px; margin-left: 10px;">' +
                                        '<span>KKPhim VN</span>' +
                                    '</div>');

                        btn.on('click:select', function () {
                            Lampa.Noty.show('Đang tìm: ' + title);
                            $.getJSON('https://phimapi.com/v1/api/tim-kiem?keyword=' + encodeURIComponent(title), function (res) {
                                if (res.data && res.data.items[0]) {
                                    $.getJSON('https://phimapi.com/phim/' + res.data.items[0].slug, function (d) {
                                        var eps = d.episodes[0].server_data;
                                        Lampa.Select.show({
                                            title: d.movie.name,
                                            items: eps.map(i => ({ title: 'Tập ' + i.name, url: i.link_m3u8 })),
                                            onSelect: function (sel) {
                                                Lampa.Player.play({ url: sel.url, title: d.movie.name + ' - ' + sel.title });
                                            }
                                        });
                                    });
                                } else { Lampa.Noty.show('Không tìm thấy nguồn!'); }
                            });
                        });

                        container.append(btn);
                        // Ép Remote nhận diện lại hàng nút
                        Lampa.Controller.add('full', {
                            toggle: function() {
                                Lampa.Controller.collectionSet(render);
                                Lampa.Controller.toggle('full');
                            }
                        });
                    }
                }, 1000); // Đợi 1 giây cho chắc cú
            }
        });
    }

    if (window.app_ready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') startPlugin(); });
})();

(function () {
    'use strict';

    function init() {
        // Lắng nghe sự kiện khi vào trang chi tiết phim
        Lampa.Listener.follow('full', function (e) {
            if (e.type == 'complite') {
                // FIX LỖI: Kiểm tra kỹ đối tượng render
                var render = e.object.render ? e.object.render() : $(e.object.html);
                var movie = e.data.movie;
                var title = movie.title || movie.name;

                var waitButtons = setInterval(function() {
                    var container = render.find('.full-start__buttons');
                    
                    if (container.length) {
                        if (!container.find('.view--kkphim').length) {
                            // Tạo nút bấm chuẩn
                            var btn = $('<div class="full-start__button selector view--kkphim" style="background-color: #e67e22 !important; color: #fff !important; border-radius: 6px; margin-left: 10px;">' +
                                            '<span>KKPhim 4K</span>' +
                                        '</div>');

                            btn.on('click:select', function () {
                                Lampa.Noty.show('Đang quét nguồn KKPhim...');
                                $.getJSON('https://phimapi.com/v1/api/tim-kiem?keyword=' + encodeURIComponent(title), function (res) {
                                    if (res.data && res.data.items[0]) {
                                        $.getJSON('https://phimapi.com/phim/' + res.data.items[0].slug, function (detail) {
                                            var eps = detail.episodes[0].server_data;
                                            Lampa.Select.show({
                                                title: detail.movie.name,
                                                items: eps.map(i => ({ title: 'Tập ' + i.name, url: i.link_m3u8 })),
                                                onSelect: function (sel) {
                                                    Lampa.Player.play({ url: sel.url, title: detail.movie.name + ' - ' + sel.title });
                                                    Lampa.Player.playlist(eps.map(i => ({ title: 'Tập ' + i.name, url: i.link_m3u8 })));
                                                }
                                            });
                                        });
                                    } else Lampa.Noty.show('Không tìm thấy phim!');
                                });
                            });

                            container.append(btn);
                            
                            // Cập nhật Controller để Remote bấm được
                            Lampa.Controller.add('full', {
                                toggle: function() {
                                    Lampa.Controller.collectionSet(render);
                                    Lampa.Controller.toggle('full');
                                }
                            });
                        }
                        clearInterval(waitButtons);
                    }
                }, 200);
                setTimeout(function() { clearInterval(waitButtons); }, 5000);
            }
        });
    }

    if (window.app_ready) init();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') init(); });
})();

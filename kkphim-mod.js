(function () {
    'use strict';

    function init() {
        // Lắng nghe sự kiện khi trang chi tiết phim được hiển thị hoàn tất
        Lampa.Listener.follow('full', function (e) {
            if (e.type == 'complite') {
                var render = e.object.render();
                var movie = e.data.movie;
                var title = movie.title || movie.name;

                // Sử dụng Interval để "canh" hàng nút xuất hiện (vì Lampa render nút hơi trễ)
                var waitButtons = setInterval(function() {
                    var container = render.find('.full-start__buttons');
                    
                    // Nếu thấy hàng nút và chưa có nút KKPhim thì chèn vào
                    if (container.length) {
                        if (!container.find('.view--kkphim').length) {
                            
                            // Tạo nút bấm chuẩn class Lampa để di chuyển remote mượt mà
                            var btn = $('<div class="full-start__button selector view--kkphim" style="background-color: #e67e22 !important; color: #fff !important; border-radius: 6px; margin-left: 10px;">' +
                                            '<span>KKPhim 4K</span>' +
                                        '</div>');

                            // Xử lý sự kiện bấm nút
                            btn.on('click:select', function () {
                                Lampa.Noty.show('Đang quét nguồn KKPhim...');
                                
                                var searchUrl = 'https://phimapi.com/v1/api/tim-kiem?keyword=' + encodeURIComponent(title);
                                
                                $.getJSON(searchUrl, function (res) {
                                    var found = res.data ? res.data.items[0] : null;
                                    if (found) {
                                        $.getJSON('https://phimapi.com/phim/' + found.slug, function (detail) {
                                            var eps = detail.episodes[0].server_data;
                                            
                                            // Hiển thị danh sách tập để chọn
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
                                                    // Thêm danh sách phát để chuyển tập nhanh
                                                    Lampa.Player.playlist(eps.map(i => ({ title: 'Tập ' + i.name, url: i.link_m3u8 })));
                                                }
                                            });
                                        });
                                    } else {
                                        Lampa.Noty.show('Không tìm thấy phim này trên KKPhim!');
                                    }
                                });
                            });

                            // Chèn nút vào hàng
                            container.append(btn);
                            
                            // Cập nhật lại điều khiển Remote cho hàng nút
                            Lampa.Controller.add('full', {
                                toggle: function() {
                                    Lampa.Controller.collectionSet(render);
                                    Lampa.Controller.toggle('full');
                                }
                            });
                        }
                        // Dừng vòng lặp sau khi đã chèn xong
                        clearInterval(waitButtons);
                    }
                }, 200);

                // Tự hủy vòng lặp sau 5 giây để tránh tốn tài nguyên nếu không tìm thấy chỗ chèn
                setTimeout(function() { clearInterval(waitButtons); }, 5000);
            }
        });
    }

    // Chạy plugin khi ứng dụng đã sẵn sàng
    if (window.app_ready) init();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') init(); });
})();

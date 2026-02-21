(function () {
    'use strict';

    function KKPhimProvider(object) {
        var network = new Lampa.Reguest();
        var modal = Lampa.UI.modal_loading(); // Hiển thị xoay xoay khi đang tìm link

        this.search = function () {
            var _this = this;
            // Tìm kiếm dựa trên tiêu đề phim đang xem
            var title = object.movie.title || object.movie.name;
            var url = 'https://phimapi.com/v1/api/tim-kiem?keyword=' + encodeURIComponent(title);

            network.silent(url, function (data) {
                var list = data.data ? data.data.items : [];
                // Tìm phim có tên khớp nhất
                var movie = list.find(function(m) {
                    return m.name.toLowerCase() === title.toLowerCase() || 
                           m.origin_name.toLowerCase() === title.toLowerCase();
                }) || list[0]; // Nếu không khớp hoàn toàn thì lấy cái đầu tiên

                if (movie) {
                    _this.getLinks(movie.slug);
                } else {
                    Lampa.UI.modal_close();
                    Lampa.Noty.show('Không tìm thấy nguồn trên KKPhim');
                }
            }, function () {
                Lampa.UI.modal_close();
                Lampa.Noty.show('Lỗi kết nối KKPhim');
            });
        };

        this.getLinks = function (slug) {
            fetch('https://phimapi.com/phim/' + slug)
                .then(res => res.json())
                .then(data => {
                    Lampa.UI.modal_close();
                    if (data.episodes && data.episodes[0].server_data.length > 0) {
                        var episodes = data.episodes[0].server_data;
                        
                        // Nếu là phim lẻ (1 tập), phát luôn
                        if (episodes.length === 1) {
                            Lampa.Player.play({
                                url: episodes[0].link_m3u8,
                                title: data.movie.name
                            });
                        } else {
                            // Nếu phim bộ, hiện danh sách tập
                            var playlist = episodes.map(function(ep) {
                                return {
                                    title: ep.name,
                                    url: ep.link_m3u8
                                };
                            });
                            Lampa.Player.play({
                                url: episodes[0].link_m3u8,
                                title: data.movie.name
                            });
                            Lampa.Player.playlist(playlist);
                        }
                    }
                }).catch(() => {
                    Lampa.UI.modal_close();
                    Lampa.Noty.show('Lỗi lấy link stream');
                });
        };
    }

    function startPlugin() {
        // Đăng ký vào sự kiện khi mở card phim
        Lampa.Listener.follow('full', function (e) {
            if (e.type == 'complite') {
                // Tạo một dòng nút mới trong mục Source
                var container = e.object.render().find('.full-start__buttons');
                var button = $('<div class="full-start__button selector button--kkphim"><span>KKPhim</span></div>');

                button.on('hover:focus', function () {
                    // Hiệu ứng focus trên TV
                }).on('click:select', function () {
                    var provider = new KKPhimProvider(e.data);
                    provider.search();
                });

                // Chèn nút vào trước hoặc sau các nút hiện có
                container.append(button);
            }
        });
        
        // Thêm CSS để nút trông đẹp hơn
        Lampa.Template.add('kkphim_style', '<style>.button--kkphim{background: #e74c3c !important; color: #fff !important;}</style>');
        $('body').append(Lampa.Template.get('kkphim_style', {}, true));
        
        console.log('KKPhim Source Plugin: Ready');
    }

    if (window.app_ready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') startPlugin(); });
})();

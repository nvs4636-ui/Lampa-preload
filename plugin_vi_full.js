(function () {
    'use strict';

    function waitReady() {
        if (
            window.Lampa &&
            Lampa.Lang &&
            Lampa.Lang.data &&
            Object.keys(Lampa.Lang.data).length
        ) {
            applyVietnamese();
        } else {
            setTimeout(waitReady, 500);
        }
    }

    function applyVietnamese() {

        var vi = {
            search: 'Tìm kiếm',
            settings: 'Cài đặt',
            movies: 'Phim lẻ',
            tv: 'Phim bộ',
            cartoons: 'Hoạt hình',
            anime: 'Anime',
            genres: 'Thể loại',
            year: 'Năm',
            rating: 'Đánh giá',
            sort: 'Sắp xếp',
            filter: 'Bộ lọc',
            loading: 'Đang tải...',
            empty: 'Không có dữ liệu',
            error: 'Đã xảy ra lỗi',
            retry: 'Thử lại',
            cancel: 'Hủy',
            ok: 'OK',

            watch: 'Xem',
            continue: 'Xem tiếp',
            favorite: 'Yêu thích',
            favorites: 'Danh sách yêu thích',
            history: 'Lịch sử',

            quality: 'Chất lượng',
            subtitle: 'Phụ đề',
            audio: 'Âm thanh',
            speed: 'Tốc độ',

            login: 'Đăng nhập',
            logout: 'Đăng xuất',

            yes: 'Có',
            no: 'Không'
        };

        // Ghi đè trực tiếp
        Object.keys(Lampa.Lang.data).forEach(function (key) {
            if (vi[key]) {
                Lampa.Lang.data[key] = vi[key];
            }
        });

        // Ép reload ngôn ngữ
        Lampa.Lang.set(Lampa.Storage.get('language'));

        console.log('🇻🇳 Lampa Vietnamese loaded (Android)');
    }

    waitReady();
})();
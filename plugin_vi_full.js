(function () {
    'use strict';

    if (!window.Lampa || !Lampa.Lang) return;

    // Bản dịch tiếng Việt
    var vi = {
        lang_choice: 'Ngôn ngữ',
        title: 'Tiêu đề',
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
        clear: 'Xóa',
        empty: 'Không có dữ liệu',
        loading: 'Đang tải...',
        error: 'Đã xảy ra lỗi',
        retry: 'Thử lại',
        cancel: 'Hủy',
        ok: 'OK',

        watch: 'Xem',
        continue: 'Xem tiếp',
        favorite: 'Yêu thích',
        favorites: 'Danh sách yêu thích',
        history: 'Lịch sử xem',
        remove: 'Xóa',
        added: 'Đã thêm',
        removed: 'Đã xóa',

        quality: 'Chất lượng',
        subtitle: 'Phụ đề',
        subtitles: 'Phụ đề',
        audio: 'Âm thanh',
        speed: 'Tốc độ',
        select: 'Chọn',
        close: 'Đóng',

        login: 'Đăng nhập',
        logout: 'Đăng xuất',
        profile: 'Hồ sơ',
        account: 'Tài khoản',

        network_error: 'Lỗi kết nối mạng',
        no_internet: 'Không có kết nối Internet',

        settings_general: 'Cài đặt chung',
        settings_player: 'Trình phát',
        settings_interface: 'Giao diện',
        settings_language: 'Ngôn ngữ',
        settings_plugins: 'Plugin',
        settings_clear_cache: 'Xóa bộ nhớ đệm',

        cache_cleared: 'Đã xóa cache',

        yes: 'Có',
        no: 'Không'
    };

    // Lấy ngôn ngữ gốc để fallback
    var original = Lampa.Lang.get();

    // Merge: VI ghi đè, thiếu thì lấy bản gốc
    var full_vi = {};
    Object.keys(original).forEach(function (key) {
        full_vi[key] = vi[key] || original[key];
    });

    // Đăng ký ngôn ngữ
    Lampa.Lang.add({
        name: 'Tiếng Việt',
        code: 'vi',
        data: full_vi
    });

    // Set mặc định
    Lampa.Storage.set('language', 'vi');
    Lampa.Lang.set('vi');

    console.log('🇻🇳 Lampa FULL Vietnamese loaded');
})();
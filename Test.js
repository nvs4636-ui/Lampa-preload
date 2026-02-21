// kkphim-button-plugin.js
(function(){
    'use strict';

    var PLUGIN_NAME = 'KKPhimButton';
    var BASE = 'https://kkphim.com'; // đổi nếu cần

    // Helper: tạo element từ HTML
    function el(html){
        var div = document.createElement('div');
        div.innerHTML = html.trim();
        return div.firstChild;
    }

    // Tạo modal đơn giản
    function showModal(title, contentHtml){
        // nếu modal đã tồn tại thì cập nhật
        var existing = document.getElementById('kkphim-modal');
        if(existing){
            existing.querySelector('.kk-title').textContent = title;
            existing.querySelector('.kk-body').innerHTML = contentHtml;
            existing.style.display = 'block';
            return;
        }

        var modal = el('\
            <div id="kkphim-modal" style="position:fixed;left:0;top:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:99999;display:block;">\
                <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:80%;max-width:720px;background:#111;color:#fff;border-radius:8px;overflow:hidden;">\
                    <div style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;justify-content:space-between;align-items:center;">\
                        <div class="kk-title" style="font-weight:600"></div>\
                        <button id="kkphim-close" style="background:transparent;border:0;color:#fff;font-size:18px;cursor:pointer">✕</button>\
                    </div>\
                    <div class="kk-body" style="padding:12px 16px;max-height:60vh;overflow:auto"></div>\
                </div>\
            </div>');
        modal.querySelector('.kk-title').textContent = title;
        modal.querySelector('.kk-body').innerHTML = contentHtml;
        document.body.appendChild(modal);
        modal.querySelector('#kkphim-close').addEventListener('click', function(){
            modal.style.display = 'none';
        });
    }

    // Build list HTML from sources array
    function buildSourcesHtml(sources){
        if(!sources || !sources.length) return '<div style="padding:12px">Không tìm thấy nguồn.</div>';
        var html = '<div style="display:flex;flex-direction:column;gap:8px;padding:8px">';
        sources.forEach(function(s, idx){
            var q = s.quality ? ' • ' + s.quality : '';
            html += '<div style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.03);padding:8px;border-radius:6px;">' +
                        '<div style="flex:1;min-width:0;">' +
                          '<div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + (s.title || 'Nguồn ' + (idx+1)) + q + '</div>' +
                          '<div style="font-size:12px;color:#bbb;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + s.url + '</div>' +
                        '</div>' +
                        '<div style="margin-left:12px">' +
                          '<button class="kk-play" data-url="' + encodeURIComponent(s.url) + '" style="padding:6px 10px;border-radius:4px;border:0;background:#2ecc71;color:#000;cursor:pointer">Play</button>' +
                        '</div>' +
                      '</div>';
        });
        html += '</div>';
        return html;
    }

    // Gọi API KKPhim (thử nhiều endpoint)
    function fetchMovieSources(base, idOrSlug){
        var tries = [
            base + '/api/v1/movies/' + idOrSlug,
            base + '/api/v1/film/' + idOrSlug,
            base + '/api/v1/movie/' + idOrSlug
        ];

        function tryNext(i){
            if(i >= tries.length) return Promise.reject(new Error('No endpoint matched'));
            return fetch(tries[i], { headers: { 'Accept': 'application/json' } })
                .then(function(r){
                    if(!r.ok) throw new Error('HTTP ' + r.status);
                    return r.json();
                })
                .then(function(json){
                    // parse sources: cố gắng lấy data.sources, data.episodes, hoặc fields trực tiếp
                    var list = [];
                    if(json.sources && Array.isArray(json.sources)){
                        json.sources.forEach(function(s){
                            if(typeof s === 'string') list.push({ title: 'Nguồn', url: s });
                            else list.push({ title: s.name || s.title || 'Nguồn', url: s.link_m3u8 || s.file || s.url || s.magnet, quality: s.quality || '' });
                        });
                    }
                    if(list.length) return list;
                    if(json.episodes && Array.isArray(json.episodes)){
                        json.episodes.forEach(function(ep){
                            if(ep.sources && Array.isArray(ep.sources)){
                                ep.sources.forEach(function(s){
                                    list.push({ title: s.name || ep.title || 'EP', url: s.link_m3u8 || s.file || s.url || s.magnet, quality: s.quality || '' });
                                });
                            } else {
                                if(ep.link_m3u8 || ep.file || ep.url || ep.magnet) list.push({ title: ep.title || 'EP', url: ep.link_m3u8 || ep.file || ep.url || ep.magnet });
                            }
                        });
                    }
                    // direct fields
                    if(json.stream) list.push({ title: 'Stream', url: json.stream, quality: json.quality || '' });
                    if(json.file) list.push({ title: 'File', url: json.file, quality: json.quality || '' });
                    if(json.link_m3u8) list.push({ title: 'HLS', url: json.link_m3u8, quality: json.quality || '' });
                    if(json.magnet) list.push({ title: 'Magnet', url: json.magnet, quality: json.quality || '' });

                    if(list.length) return list;
                    // nếu không có, thử endpoint tiếp theo
                    return tryNext(i+1);
                })
                .catch(function(){
                    return tryNext(i+1);
                });
        }

        return tryNext(0);
    }

    // Chèn button vào container action khi trang phim được load
    function injectButtonWhenReady(movieData){
        // thử nhiều selector phổ biến
        var selectors = ['.movie__actions', '.actions', '.movie-actions', '.movie__info .actions'];
        var container = null;
        for(var i=0;i<selectors.length;i++){
            container = document.querySelector(selectors[i]);
            if(container) break;
        }
        // nếu chưa có container, thử chờ DOM thay đổi (MutationObserver)
        if(!container){
            var observer = new MutationObserver(function(mutations, obs){
                for(var i=0;i<selectors.length;i++){
                    var c = document.querySelector(selectors[i]);
                    if(c){
                        obs.disconnect();
                        createButton(c, movieData);
                        return;
                    }
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
        } else {
            createButton(container, movieData);
        }
    }

    // Tạo button và gắn sự kiện
    function createButton(container, movieData){
        // tránh chèn nhiều lần
        if(container.querySelector('#kkphim-btn')) return;

        var btn = el('<button id="kkphim-btn" style="margin-left:8px;padding:8px 12px;border-radius:6px;border:0;background:#ffb86b;color:#000;cursor:pointer;font-weight:600">Nguồn KKPhim</button>');
        container.appendChild(btn);

        btn.addEventListener('click', function(){
            var id = movieData && (movieData.id || movieData.slug || movieData.url || movieData.tmdb_id || movieData.title);
            if(!id){
                showModal('KKPhim', '<div style="padding:12px">Không xác định được ID/slug phim.</div>');
                return;
            }
            showModal('KKPhim', '<div style="padding:12px">Đang lấy nguồn...</div>');
            fetchMovieSources(BASE, id).then(function(sources){
                var html = buildSourcesHtml(sources);
                showModal('KKPhim', html);
                // gắn sự kiện play cho các nút
                var modal = document.getElementById('kkphim-modal');
                modal.querySelectorAll('.kk-play').forEach(function(p){
                    p.addEventListener('click', function(){
                        var url = decodeURIComponent(this.getAttribute('data-url'));
                        // Nếu Lampa có API để phát trực tiếp, bạn có thể gọi ở đây.
                        // Mặc định: mở link trong new tab (hoặc copy vào clipboard)
                        try { window.open(url, '_blank'); } catch(e){ console.log('Open failed', e); }
                    });
                });
            }).catch(function(){
                showModal('KKPhim', '<div style="padding:12px">Không lấy được nguồn. Có thể endpoint khác hoặc bị chặn (CORS).</div>');
            });
        });
    }

    // Hook: khi plugin khởi tạo, cố gắng lấy movie data từ trang (nếu Lampa expose global movie object)
    function initPlugin(){
        // Thử lấy movie data từ global Lampa context
        var movieData = null;
        try {
            // Một số build Lampa có biến global 'Lampa' với activity data
            if(window.Lampa && Lampa.Activity && Lampa.Activity.current && Lampa.Activity.current.data){
                movieData = Lampa.Activity.current.data;
            }
        } catch(e){ movieData = null; }

        // Nếu không có, cố gắng parse từ DOM (ví dụ data-id attribute)
        if(!movieData){
            var elMovie = document.querySelector('[data-id], [data-slug]');
            if(elMovie){
                movieData = {
                    id: elMovie.getAttribute('data-id') || elMovie.getAttribute('data-slug'),
                    title: elMovie.getAttribute('data-title') || document.title
                };
            }
        }

        injectButtonWhenReady(movieData);
    }

    // Đăng ký plugin với Lampa (nếu Lampa.Plugin API có sẵn)
    try {
        Lampa.Plugin && Lampa.Plugin.add && Lampa.Plugin.add({
            manifest: { name: PLUGIN_NAME, version: '1.0.0', description: 'Chèn nút KKPhim trên trang phim' },
            init: initPlugin
        });
    } catch(e){
        // Nếu Lampa không expose Plugin API, khởi chạy trực tiếp
        setTimeout(initPlugin, 800);
    }

    // fallback: chạy sau DOM load
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(initPlugin, 500); });

})();
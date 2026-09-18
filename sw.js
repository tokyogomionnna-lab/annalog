/* あんなログ service worker
   キャッシュ名は固定です。ファイルを更新してもこのファイルを書き換える必要はありません。
   ・画面本体(index.html)はネットを優先するので、上書きアップロードすればすぐ反映されます
   ・アイコンなどはキャッシュを表示しつつ裏で最新に差し替えます(次回起動から新しくなります)
   ・オフラインのときは保存済みのキャッシュで起動します */
const CACHE = 'annalog';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(ASSETS.map(u => c.add(new Request(u, {cache: 'reload'})))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  // 画面本体:ネット優先。取得できたら保存し、失敗したらキャッシュで起動する
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(new Request(req, {cache: 'no-cache'}))
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  // それ以外:キャッシュを返しつつ、裏で最新版に差し替える
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});

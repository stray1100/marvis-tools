/* 川麻血战到底·拍照算番 —— Service Worker（完全离线）
 * 升级：改动页面后把 CACHE_VERSION 递增，重新部署，用户下次联网打开即自动换新版本。
 */
var CACHE_VERSION = 'cm-pwa-v1.2.3';
var CACHE_NAME = CACHE_VERSION;

var PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icons/apple-touch-icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return Promise.all(
        PRECACHE_URLS.map(function (url) {
          return cache.add(new Request(url, { cache: 'reload' })).catch(function () {});
        })
      );
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key !== CACHE_NAME && key.indexOf('cm-pwa-') === 0) return caches.delete(key);
        return Promise.resolve();
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('message', function (event) {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html', { ignoreSearch: true }).then(function (hit) {
        /* 缓存优先：飞行模式秒开；同时后台拉新，下次打开即最新 */
        var net = fetch(new Request(req.url, { cache: 'no-store' })).then(function (res) {
          if (res && res.status === 200) {
            var copy = res.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put('./index.html', copy.clone());
              cache.put(req, copy);
            });
          }
          return res;
        }).catch(function () { return null; });
        return hit || net.then(function (r) { return r || caches.match('./index.html'); });
      }).catch(function () { return caches.match('./index.html'); })
    );
    return;
  }

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && res.status === 200 && res.type === 'basic') {
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(req, copy); });
        }
        return res;
      });
    })
  );
});

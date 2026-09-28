// PWA Service Worker - 离线缓存
const CACHE_NAME = 'thermometer-pwa-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// 安装：缓存核心文件
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => {
      return self.skipWaiting(); // 立即激活
    })
  );
});

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      return self.clients.claim(); // 立即接管所有页面
    })
  );
});

// 拦截请求：缓存优先，网络回退
self.addEventListener('fetch', (event) => {
  // 只缓存 GET 请求
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // 缓存命中，直接返回
      if (cachedResponse) {
        // 同时后台更新缓存（保证下次打开是新版本）
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
            });
          }
        }).catch(() => {}); // 网络失败不影响
        return cachedResponse;
      }

      // 缓存未命中，走网络
      return fetch(event.request).then((networkResponse) => {
        // 成功的话也存一份缓存
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // 网络失败，返回离线页面
        return caches.match('./index.html');
      });
    })
  );
});

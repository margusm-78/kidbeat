const CACHE_NAME = "kidbeat-cache-v1";
const CORE_ASSETS = ["./","./index.html","./manifest.webmanifest","./icons/icon-192.png","./icons/icon-512.png"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c)=>c.addAll(CORE_ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks)=>Promise.all(ks.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method === "GET" && new URL(req.url).origin === self.location.origin) {
    e.respondWith(caches.match(req).then((hit)=>hit || fetch(req).then((resp)=>{ const copy=resp.clone(); caches.open(CACHE_NAME).then(c=>c.put(req, copy)); return resp; }).catch(()=>hit)));
  }
});
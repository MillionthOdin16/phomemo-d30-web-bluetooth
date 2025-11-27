/**
 * Service Worker for Phomemo Web Bluetooth
 * Enables offline functionality and caching
 */

const CACHE_NAME = "phomemo-v1";
const ASSETS_TO_CACHE = [
	"/",
	"/index.html",
	"/index.css",
	"/index.js",
	"/src/printer.js",
	"/src/dithering.js",
	"/src/printerModels.js",
	"/src/canvasEditor.js",
	"/src/printerStatus.js",
	"/src/storage.js",
	"/src/voiceControl.js",
	"/src/cameraScanner.js",
	"/src/smartFeatures.js",
	"/manifest.json",
];

const EXTERNAL_RESOURCES = [
	"https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.3/css/bootstrap.min.css",
	"https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.11.3/font/bootstrap-icons.min.css",
	"https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.3/js/bootstrap.min.js",
	"https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.6/JsBarcode.all.min.js",
	"https://cdnjs.cloudflare.com/ajax/libs/qrcode/1.5.1/qrcode.min.js",
	"https://cdn.jsdelivr.net/npm/canvas-txt@4.1.1/+esm",
];

// Install event - cache assets
self.addEventListener("install", (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => {
			console.log("Caching app assets");
			// Cache local assets
			const localPromise = cache.addAll(ASSETS_TO_CACHE).catch((err) => {
				console.warn("Some local assets failed to cache:", err);
			});
			// Try to cache external resources (may fail due to CORS)
			const externalPromise = Promise.all(
				EXTERNAL_RESOURCES.map((url) =>
					fetch(url)
						.then((response) => {
							if (response.ok) {
								return cache.put(url, response);
							}
						})
						.catch(() => {
							console.warn(`Failed to cache external resource: ${url}`);
						})
				)
			);
			return Promise.all([localPromise, externalPromise]);
		})
	);
	// Activate immediately
	self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches.keys().then((cacheNames) => {
			return Promise.all(
				cacheNames
					.filter((name) => name !== CACHE_NAME)
					.map((name) => caches.delete(name))
			);
		})
	);
	// Take control of all pages immediately
	self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
	// Skip non-GET requests
	if (event.request.method !== "GET") return;

	// Skip Bluetooth API requests (they won't work offline anyway)
	if (event.request.url.includes("bluetooth")) return;

	event.respondWith(
		caches.match(event.request).then((cachedResponse) => {
			if (cachedResponse) {
				// Return cached response and update cache in background
				event.waitUntil(
					fetch(event.request)
						.then((networkResponse) => {
							if (networkResponse.ok) {
								const responseToCache = networkResponse.clone();
								caches.open(CACHE_NAME).then((cache) => {
									cache.put(event.request, responseToCache);
								});
							}
						})
						.catch(() => {
							// Network failed, but we already have cache
						})
				);
				return cachedResponse;
			}

			// Not in cache, fetch from network
			return fetch(event.request)
				.then((networkResponse) => {
					// Cache successful responses
					if (networkResponse.ok) {
						const responseToCache = networkResponse.clone();
						caches.open(CACHE_NAME).then((cache) => {
							cache.put(event.request, responseToCache);
						});
					}
					return networkResponse;
				})
				.catch(() => {
					// Network failed and not in cache
					// Return offline page for navigation requests
					if (event.request.mode === "navigate") {
						return caches.match("/");
					}
					return new Response("Offline", {
						status: 503,
						statusText: "Service Unavailable",
					});
				});
		})
	);
});

// Handle push notifications (future feature)
self.addEventListener("push", (event) => {
	if (!event.data) return;

	const data = event.data.json();
	const options = {
		body: data.body || "New notification",
		icon: "/icon-192.png",
		badge: "/badge-72.png",
		vibrate: [100, 50, 100],
		data: data.url || "/",
	};

	event.waitUntil(
		self.registration.showNotification(data.title || "Phomemo Print", options)
	);
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
	event.notification.close();
	event.waitUntil(
		clients.openWindow(event.notification.data || "/")
	);
});

// Handle background sync (for queued prints)
self.addEventListener("sync", (event) => {
	if (event.tag === "print-queue") {
		event.waitUntil(
			// Notify the main thread to process print queue
			self.clients.matchAll().then((clients) => {
				clients.forEach((client) => {
					client.postMessage({ type: "PROCESS_PRINT_QUEUE" });
				});
			})
		);
	}
});

// Message handler for communication with main thread
self.addEventListener("message", (event) => {
	if (event.data.type === "SKIP_WAITING") {
		self.skipWaiting();
	}
});

console.log("Phomemo Service Worker loaded");

/**
 * Camera Scanner Module
 * Enables scanning text from images using OCR and camera
 */

export class CameraScanner {
	constructor() {
		this.stream = null;
		this.video = null;
		this.canvas = null;
		this.ctx = null;
		this.callbacks = {
			onScan: null,
			onError: null,
			onCameraStart: null,
			onCameraStop: null,
		};
		this.scanning = false;
		this.barcodeDetector = null;
		this.initBarcodeDetector();
	}

	async initBarcodeDetector() {
		// Check for BarcodeDetector API support
		if ("BarcodeDetector" in window) {
			try {
				const formats = await BarcodeDetector.getSupportedFormats();
				this.barcodeDetector = new BarcodeDetector({
					formats: formats,
				});
			} catch (e) {
				console.warn("BarcodeDetector initialization failed:", e);
			}
		}
	}

	async startCamera(videoElement) {
		try {
			this.video = videoElement;
			
			const constraints = {
				video: {
					facingMode: "environment", // Prefer back camera
					width: { ideal: 1280 },
					height: { ideal: 720 },
				},
			};

			this.stream = await navigator.mediaDevices.getUserMedia(constraints);
			this.video.srcObject = this.stream;
			await this.video.play();

			// Create canvas for frame capture
			this.canvas = document.createElement("canvas");
			this.ctx = this.canvas.getContext("2d");

			this.callbacks.onCameraStart?.();
			return true;
		} catch (e) {
			this.callbacks.onError?.(e.message);
			return false;
		}
	}

	stopCamera() {
		if (this.stream) {
			this.stream.getTracks().forEach(track => track.stop());
			this.stream = null;
		}
		if (this.video) {
			this.video.srcObject = null;
		}
		this.scanning = false;
		this.callbacks.onCameraStop?.();
	}

	captureFrame() {
		if (!this.video || !this.canvas) return null;

		this.canvas.width = this.video.videoWidth;
		this.canvas.height = this.video.videoHeight;
		this.ctx.drawImage(this.video, 0, 0);

		return this.canvas.toDataURL("image/png");
	}

	async scanBarcode() {
		if (!this.barcodeDetector || !this.video) {
			return null;
		}

		try {
			const barcodes = await this.barcodeDetector.detect(this.video);
			if (barcodes.length > 0) {
				return {
					format: barcodes[0].format,
					value: barcodes[0].rawValue,
					boundingBox: barcodes[0].boundingBox,
				};
			}
		} catch (e) {
			console.error("Barcode scan error:", e);
		}
		return null;
	}

	async startContinuousScan(callback, intervalMs = 500) {
		this.scanning = true;
		
		const scan = async () => {
			if (!this.scanning) return;

			const result = await this.scanBarcode();
			if (result) {
				callback(result);
			}

			if (this.scanning) {
				setTimeout(scan, intervalMs);
			}
		};

		scan();
	}

	stopContinuousScan() {
		this.scanning = false;
	}

	on(event, callback) {
		if (event in this.callbacks) {
			this.callbacks[event] = callback;
		}
	}

	isSupported() {
		return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
	}

	isBarcodeDetectorSupported() {
		return "BarcodeDetector" in window;
	}
}

/**
 * Simple OCR using Tesseract.js (loaded dynamically)
 */
export class OCRScanner {
	constructor() {
		this.worker = null;
		this.ready = false;
		this.loading = false;
	}

	async init() {
		if (this.ready || this.loading) return;
		
		this.loading = true;

		try {
			// Dynamically load Tesseract.js
			if (!window.Tesseract) {
				await this.loadScript("https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/tesseract.min.js");
			}

			this.worker = await Tesseract.createWorker("eng", 1, {
				logger: (m) => {
					if (m.status === "recognizing text") {
						console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
					}
				},
			});

			this.ready = true;
		} catch (e) {
			console.error("Failed to initialize OCR:", e);
			throw e;
		} finally {
			this.loading = false;
		}
	}

	async loadScript(src) {
		return new Promise((resolve, reject) => {
			const script = document.createElement("script");
			script.src = src;
			script.onload = resolve;
			script.onerror = reject;
			document.head.appendChild(script);
		});
	}

	async recognize(imageSource) {
		if (!this.ready) {
			await this.init();
		}

		try {
			const result = await this.worker.recognize(imageSource);
			return {
				text: result.data.text.trim(),
				confidence: result.data.confidence,
				words: result.data.words,
			};
		} catch (e) {
			console.error("OCR recognition error:", e);
			throw e;
		}
	}

	async terminate() {
		if (this.worker) {
			await this.worker.terminate();
			this.worker = null;
			this.ready = false;
		}
	}
}

export const cameraScanner = new CameraScanner();
export const ocrScanner = new OCRScanner();

/**
 * Smart Clipboard Module
 * Detects and suggests label content from clipboard
 */

export class SmartClipboard {
	constructor() {
		this.lastClipboardContent = null;
		this.callbacks = {
			onSuggestion: null,
			onError: null,
		};
		this.patterns = this.initPatterns();
	}

	initPatterns() {
		return {
			// URLs
			url: {
				regex: /^(https?:\/\/[^\s]+)$/i,
				type: "qr",
				format: (match) => ({ data: match[1], suggestion: "QR Code for URL" }),
			},
			// Email addresses
			email: {
				regex: /^([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/,
				type: "qr",
				format: (match) => ({ data: `mailto:${match[1]}`, suggestion: "QR Code for email" }),
			},
			// Phone numbers
			phone: {
				regex: /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/,
				type: "qr",
				format: (match) => ({ data: `tel:${match[0].replace(/[\s\.\-()]/g, "")}`, suggestion: "QR Code for phone" }),
			},
			// UPC/EAN barcodes (12-13 digits)
			upc: {
				regex: /^[0-9]{12,13}$/,
				type: "barcode",
				format: (match) => ({
					data: match[0],
					barcodeFormat: match[0].length === 13 ? "EAN13" : "UPC",
					suggestion: `${match[0].length === 13 ? "EAN-13" : "UPC"} Barcode`,
				}),
			},
			// Generic numeric barcode
			numericBarcode: {
				regex: /^[0-9]{6,11}$/,
				type: "barcode",
				format: (match) => ({ data: match[0], barcodeFormat: "CODE128", suggestion: "CODE128 Barcode" }),
			},
			// Price format
			price: {
				regex: /^[\$\€\£]?\s*[0-9]+[.,][0-9]{2}$/,
				type: "text",
				format: (match) => ({
					text: match[0].replace(",", "."),
					preset: "price",
					suggestion: "Price Tag",
				}),
			},
			// WiFi credentials (SSID:password)
			wifi: {
				regex: /^WIFI:T:([^;]*);S:([^;]*);P:([^;]*);?;?$/i,
				type: "qr",
				format: (match) => ({ data: match[0], suggestion: "WiFi QR Code" }),
			},
			// Simple WiFi format (ssid:password)
			simpleWifi: {
				regex: /^([^:]+):([^:]+)$/,
				type: "qr",
				format: (match) => ({
					data: `WIFI:T:WPA;S:${match[1]};P:${match[2]};;`,
					suggestion: "WiFi QR Code",
				}),
			},
			// vCard format
			vcard: {
				regex: /^BEGIN:VCARD/i,
				type: "qr",
				format: (match) => ({ data: match.input, suggestion: "Contact QR Code" }),
			},
			// Short text (likely a name or label)
			shortText: {
				regex: /^.{1,50}$/,
				type: "text",
				format: (match) => ({ text: match[0], suggestion: "Text Label" }),
			},
		};
	}

	async readClipboard() {
		try {
			const text = await navigator.clipboard.readText();
			return text.trim();
		} catch (e) {
			console.error("Clipboard read error:", e);
			return null;
		}
	}

	async checkClipboard() {
		const content = await this.readClipboard();
		
		if (!content || content === this.lastClipboardContent) {
			return null;
		}

		this.lastClipboardContent = content;
		return this.analyzeContent(content);
	}

	analyzeContent(content) {
		const trimmed = content.trim();

		for (const [name, pattern] of Object.entries(this.patterns)) {
			const match = trimmed.match(pattern.regex);
			if (match) {
				const formatted = pattern.format(match);
				return {
					originalContent: content,
					patternName: name,
					type: pattern.type,
					...formatted,
				};
			}
		}

		// Default: treat as text
		return {
			originalContent: content,
			patternName: "text",
			type: "text",
			text: content,
			suggestion: "Text Label",
		};
	}

	async startMonitoring(intervalMs = 1000) {
		this.monitoring = true;
		
		const check = async () => {
			if (!this.monitoring) return;

			const suggestion = await this.checkClipboard();
			if (suggestion) {
				this.callbacks.onSuggestion?.(suggestion);
			}

			if (this.monitoring) {
				setTimeout(check, intervalMs);
			}
		};

		check();
	}

	stopMonitoring() {
		this.monitoring = false;
	}

	on(event, callback) {
		if (event in this.callbacks) {
			this.callbacks[event] = callback;
		}
	}

	// Generate WiFi QR code data
	static generateWifiQR(ssid, password, encryption = "WPA") {
		return `WIFI:T:${encryption};S:${ssid};P:${password};;`;
	}

	// Generate vCard data
	static generateVCard(contact) {
		const lines = [
			"BEGIN:VCARD",
			"VERSION:3.0",
			`FN:${contact.name || ""}`,
			contact.email ? `EMAIL:${contact.email}` : "",
			contact.phone ? `TEL:${contact.phone}` : "",
			contact.company ? `ORG:${contact.company}` : "",
			contact.title ? `TITLE:${contact.title}` : "",
			"END:VCARD",
		].filter(Boolean);
		return lines.join("\n");
	}
}

/**
 * CSV Parser for batch imports
 */
export class CSVParser {
	static parse(csvText, hasHeader = true) {
		const lines = csvText.trim().split(/\r?\n/);
		if (lines.length === 0) return { headers: [], rows: [] };

		const headers = hasHeader ? CSVParser.parseLine(lines[0]) : [];
		const dataLines = hasHeader ? lines.slice(1) : lines;
		const rows = dataLines.map(line => CSVParser.parseLine(line));

		return { headers, rows };
	}

	static parseLine(line) {
		const result = [];
		let current = "";
		let inQuotes = false;

		for (let i = 0; i < line.length; i++) {
			const char = line[i];
			const nextChar = line[i + 1];

			if (inQuotes) {
				if (char === '"' && nextChar === '"') {
					current += '"';
					i++; // Skip next quote
				} else if (char === '"') {
					inQuotes = false;
				} else {
					current += char;
				}
			} else {
				if (char === '"') {
					inQuotes = true;
				} else if (char === ",") {
					result.push(current.trim());
					current = "";
				} else {
					current += char;
				}
			}
		}
		result.push(current.trim());
		return result;
	}

	static toCSV(data, headers) {
		const escapeValue = (val) => {
			if (typeof val !== "string") val = String(val || "");
			if (val.includes(",") || val.includes('"') || val.includes("\n")) {
				return `"${val.replace(/"/g, '""')}"`;
			}
			return val;
		};

		const headerLine = headers.map(escapeValue).join(",");
		const dataLines = data.map(row => 
			(Array.isArray(row) ? row : headers.map(h => row[h] || ""))
				.map(escapeValue)
				.join(",")
		);

		return [headerLine, ...dataLines].join("\n");
	}
}

/**
 * Print Queue Manager
 */
export class PrintQueue {
	constructor() {
		this.queue = [];
		this.processing = false;
		this.currentIndex = 0;
		this.callbacks = {
			onProgress: null,
			onComplete: null,
			onError: null,
			onItemStart: null,
			onItemComplete: null,
		};
	}

	add(item) {
		const queueItem = {
			id: Date.now() + Math.random(),
			status: "pending",
			...item,
		};
		this.queue.push(queueItem);
		return queueItem.id;
	}

	addBatch(items) {
		return items.map(item => this.add(item));
	}

	remove(id) {
		const index = this.queue.findIndex(item => item.id === id);
		if (index > -1) {
			this.queue.splice(index, 1);
			return true;
		}
		return false;
	}

	clear() {
		this.queue = [];
		this.currentIndex = 0;
	}

	async process(printFunction, delayBetweenPrints = 500) {
		if (this.processing) return;
		
		this.processing = true;
		this.currentIndex = 0;
		const total = this.queue.length;

		try {
			for (let i = 0; i < this.queue.length; i++) {
				if (!this.processing) break;

				const item = this.queue[i];
				this.currentIndex = i;
				item.status = "printing";

				this.callbacks.onItemStart?.(item, i, total);
				this.callbacks.onProgress?.(i, total);

				try {
					await printFunction(item);
					item.status = "completed";
					this.callbacks.onItemComplete?.(item, i, total, true);
				} catch (e) {
					item.status = "failed";
					item.error = e.message;
					this.callbacks.onItemComplete?.(item, i, total, false);
					this.callbacks.onError?.(item, e);
				}

				// Delay between prints
				if (i < this.queue.length - 1 && this.processing) {
					await new Promise(resolve => setTimeout(resolve, delayBetweenPrints));
				}
			}

			this.callbacks.onComplete?.(this.queue);
		} finally {
			this.processing = false;
		}
	}

	pause() {
		this.processing = false;
	}

	resume(printFunction, delayBetweenPrints = 500) {
		// Resume from current position
		const remaining = this.queue.slice(this.currentIndex);
		this.queue = remaining;
		this.process(printFunction, delayBetweenPrints);
	}

	getStatus() {
		return {
			total: this.queue.length,
			pending: this.queue.filter(i => i.status === "pending").length,
			completed: this.queue.filter(i => i.status === "completed").length,
			failed: this.queue.filter(i => i.status === "failed").length,
			processing: this.processing,
			currentIndex: this.currentIndex,
		};
	}

	getQueue() {
		return [...this.queue];
	}

	on(event, callback) {
		if (event in this.callbacks) {
			this.callbacks[event] = callback;
		}
	}
}

export const smartClipboard = new SmartClipboard();
export const printQueue = new PrintQueue();

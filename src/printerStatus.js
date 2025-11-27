/**
 * Printer Status and Communication Module
 * Handles printer status queries and notifications
 * Based on theacodes/phomemo_m02s and jeffrafter/phomemo
 */

// ESC/POS Command Constants
const ESC = 0x1b;
const US = 0x1f;

// Status codes
export const PrinterStatus = {
	READY: "ready",
	PRINTING: "printing",
	PAPER_OUT: "paper_out",
	COVER_OPEN: "cover_open",
	LOW_BATTERY: "low_battery",
	ERROR: "error",
	UNKNOWN: "unknown",
};

// Status event types
export const StatusEventType = {
	BATTERY: "battery",
	PAPER: "paper",
	COVER: "cover",
	PRINT_COMPLETE: "print_complete",
	ERROR: "error",
	SERIAL: "serial",
	FIRMWARE: "firmware",
};

/**
 * Printer Status Manager
 * Manages printer status queries and notification handling
 */
export class PrinterStatusManager {
	constructor() {
		this.characteristic = null;
		this.notifyCharacteristic = null;
		this.status = {
			connected: false,
			battery: null,
			hasPaper: null,
			coverClosed: null,
			serialNumber: null,
			firmwareVersion: null,
			lastUpdate: null,
		};
		this.listeners = new Map();
	}

	/**
	 * Initialize with BLE characteristics
	 * @param {BluetoothRemoteGATTCharacteristic} writeChar - Write characteristic
	 * @param {BluetoothRemoteGATTCharacteristic} notifyChar - Notify characteristic
	 */
	async init(writeChar, notifyChar) {
		this.characteristic = writeChar;
		this.notifyCharacteristic = notifyChar;
		this.status.connected = true;

		if (notifyChar) {
			try {
				await notifyChar.startNotifications();
				notifyChar.addEventListener("characteristicvaluechanged", this.handleNotification.bind(this));
			} catch (e) {
				console.warn("Could not enable notifications:", e);
			}
		}
	}

	/**
	 * Handle incoming notifications from printer
	 * @param {Event} event - Characteristic value changed event
	 */
	handleNotification(event) {
		const value = new Uint8Array(event.target.value.buffer);
		console.log("Printer notification:", Array.from(value));

		this.parseNotification(value);
		this.status.lastUpdate = Date.now();
	}

	/**
	 * Parse notification data
	 * @param {Uint8Array} data - Notification data
	 */
	parseNotification(data) {
		if (data.length < 2) return;

		// Common notification format: [command, subcommand, ...data]
		if (data[0] === 0x1a) {
			switch (data[1]) {
				case 0x04: // Print status
					this.emit(StatusEventType.PRINT_COMPLETE, { success: true });
					break;

				case 0x05: // Cover status
					// 0x98 = closed, other = open
					const coverClosed = data[2] === 0x98;
					this.status.coverClosed = coverClosed;
					this.emit(StatusEventType.COVER, { closed: coverClosed });
					break;

				case 0x06: // Paper status
					// 0x89 = has paper, other = no paper
					const hasPaper = data[2] === 0x89;
					this.status.hasPaper = hasPaper;
					this.emit(StatusEventType.PAPER, { hasPaper });
					break;

				case 0x07: // Firmware version (5 bytes)
					if (data.length >= 5) {
						const version = `${data[4]}.${data[3]}.${data[2]}`;
						this.status.firmwareVersion = version;
						this.emit(StatusEventType.FIRMWARE, { version });
					}
					break;

				case 0x08: // Serial number
					if (data.length >= 15) {
						const serial = String.fromCharCode(...data.slice(2, 15));
						this.status.serialNumber = serial;
						this.emit(StatusEventType.SERIAL, { serial });
					}
					break;

				case 0x09: // Battery level
					if (data.length >= 3) {
						const battery = data[2];
						this.status.battery = battery;
						this.emit(StatusEventType.BATTERY, { level: battery });
					}
					break;
			}
		}

		// Handle simple status responses
		if (data[0] === 0x01 && data[1] === 0x01) {
			// Ready/idle status
		}

		// Handle error responses
		if (data[0] === 0x02) {
			this.emit(StatusEventType.ERROR, { code: data[1], data: data });
		}
	}

	/**
	 * Query printer for all status information
	 */
	async queryAllStatus() {
		if (!this.characteristic) return;

		try {
			// Query serial number
			await this.sendCommand([US, 0x11, 0x13]);
			await this.delay(100);

			// Query firmware version
			await this.sendCommand([US, 0x11, 0x07]);
			await this.delay(100);

			// Query battery/energy
			await this.sendCommand([US, 0x11, 0x08]);
			await this.delay(100);

			// Query paper state
			await this.sendCommand([US, 0x11, 0x11]);
			await this.delay(100);

			// Query device timer
			await this.sendCommand([US, 0x11, 0x0e]);
		} catch (e) {
			console.error("Failed to query status:", e);
		}
	}

	/**
	 * Query battery level
	 */
	async queryBattery() {
		if (!this.characteristic) return;
		await this.sendCommand([US, 0x11, 0x08]);
	}

	/**
	 * Query paper status
	 */
	async queryPaper() {
		if (!this.characteristic) return;
		await this.sendCommand([US, 0x11, 0x11]);
	}

	/**
	 * Query serial number
	 */
	async querySerial() {
		if (!this.characteristic) return;
		await this.sendCommand([US, 0x11, 0x13]);
	}

	/**
	 * Query firmware version
	 */
	async queryFirmware() {
		if (!this.characteristic) return;
		await this.sendCommand([US, 0x11, 0x07]);
	}

	/**
	 * Send a command to the printer
	 * @param {number[]} command - Command bytes
	 */
	async sendCommand(command) {
		if (!this.characteristic) {
			throw new Error("Not connected");
		}
		await this.characteristic.writeValueWithResponse(new Uint8Array(command));
	}

	/**
	 * Add event listener
	 * @param {string} eventType - Event type from StatusEventType
	 * @param {Function} callback - Callback function
	 */
	on(eventType, callback) {
		if (!this.listeners.has(eventType)) {
			this.listeners.set(eventType, []);
		}
		this.listeners.get(eventType).push(callback);
	}

	/**
	 * Remove event listener
	 * @param {string} eventType - Event type
	 * @param {Function} callback - Callback to remove
	 */
	off(eventType, callback) {
		if (!this.listeners.has(eventType)) return;
		const listeners = this.listeners.get(eventType);
		const index = listeners.indexOf(callback);
		if (index > -1) {
			listeners.splice(index, 1);
		}
	}

	/**
	 * Emit an event to all listeners
	 * @param {string} eventType - Event type
	 * @param {Object} data - Event data
	 */
	emit(eventType, data) {
		if (!this.listeners.has(eventType)) return;
		for (const callback of this.listeners.get(eventType)) {
			try {
				callback(data);
			} catch (e) {
				console.error("Event handler error:", e);
			}
		}
	}

	/**
	 * Get current status
	 * @returns {Object} Current status object
	 */
	getStatus() {
		return { ...this.status };
	}

	/**
	 * Check if printer is ready
	 * @returns {boolean}
	 */
	isReady() {
		return this.status.connected && this.status.hasPaper !== false && this.status.coverClosed !== false;
	}

	/**
	 * Get status message
	 * @returns {string}
	 */
	getStatusMessage() {
		if (!this.status.connected) return "Not connected";
		if (this.status.coverClosed === false) return "Cover is open";
		if (this.status.hasPaper === false) return "Out of paper";
		if (this.status.battery !== null && this.status.battery < 10) return "Low battery";
		return "Ready";
	}

	/**
	 * Get battery icon class
	 * @returns {string}
	 */
	getBatteryIcon() {
		const level = this.status.battery;
		if (level === null) return "bi-battery";
		if (level >= 75) return "bi-battery-full";
		if (level >= 50) return "bi-battery-half";
		if (level >= 25) return "bi-battery";
		return "bi-battery-charging";
	}

	/**
	 * Disconnect and cleanup
	 */
	disconnect() {
		this.status.connected = false;
		if (this.notifyCharacteristic) {
			try {
				this.notifyCharacteristic.stopNotifications();
			} catch (e) {
				// Ignore errors on disconnect
			}
		}
		this.characteristic = null;
		this.notifyCharacteristic = null;
	}

	/**
	 * Helper delay function
	 * @param {number} ms - Milliseconds to delay
	 */
	delay(ms) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

// Export singleton instance
export const printerStatus = new PrinterStatusManager();

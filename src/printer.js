import {
	PrinterModel,
	PrinterConfigs,
	isDType,
	isMType,
	isM1Type,
	SizeMode,
	Justification,
	LabelType,
} from "./printerModels.js";

// Packet sizes - can be adjusted based on printer
export const PacketSize = {
	P8: 8,
	P16: 16,
	P32: 32,
	P64: 64,
	P128: 128,
	P256: 256,
	P512: 512,
};

// Default packet size - 128 works well for most printers
let PACKET_SIZE_BYTES = PacketSize.P128;

/**
 * Set the packet size for data transmission
 * @param {number} size - Packet size from PacketSize enum
 */
export const setPacketSize = (size) => {
	PACKET_SIZE_BYTES = size;
};

/**
 * ESC/POS Command Constants
 * Based on Epson ESC/POS protocol used by Phomemo printers
 */
const ESC = 0x1b; // Escape
const GS = 0x1d; // Group Separator
const US = 0x1f; // Unit Separator
const NAK = 0x15; // Negative Acknowledge

/**
 * Generate header data for D-type printers (D30, D35, P12Pro)
 * Based on polskafan/phomemo_d30 initialization sequence
 */
const D_TYPE_INIT = new Uint8Array([
	0x1f,
	0x11,
	0x38, // 1f1138
	0x1f,
	0x11,
	0x12,
	0x1f,
	0x11,
	0x13, // 1f11121f1113
	0x1f,
	0x11,
	0x09, // 1f1109
	0x1f,
	0x11,
	0x11, // 1f1111
	0x1f,
	0x11,
	0x19, // 1f1119
	0x1f,
	0x11,
	0x07, // 1f1107
	0x1f,
	0x11,
	0x0a,
	0x1f,
	0x11,
	0x02,
	0x02, // 1f110a1f110202
]);

/**
 * Return the header data needed to start the print session.
 * Adapted from multiple sources:
 * - {@link https://github.com/Knightro63/phomemo}
 * - {@link https://github.com/vivier/phomemo-tools}
 * - {@link https://github.com/theacodes/phomemo_m02s}
 *
 * @param {string} printerModel - The printer model from PrinterModel enum
 * @param {object} options - Print options
 * @returns {Uint8Array}
 */
const getHeaderData = (printerModel, options = {}) => {
	const { speed = 5, density = 0x0f, labelType = LabelType.GAPS, justification = Justification.CENTER } = options;

	if (printerModel === PrinterModel.P12PRO || isDType(printerModel)) {
		return new Uint8Array([ESC, 0x40]); // ESC @ - Initialize printer
	} else if (isMType(printerModel)) {
		// M110, M120, M220 header with speed, density, and label type
		return new Uint8Array([
			ESC,
			0x4e,
			0x0d, // Print Speed command
			Math.min(5, Math.max(1, speed)), // Speed: 1-5
			ESC,
			0x4e,
			0x04, // Print Density command
			Math.min(0x0f, Math.max(0x01, density)), // Density: 01-0f
			US,
			0x11, // Media Type command
			labelType, // 0x0a=Gaps, 0x0b=Continuous, 0x26=Marks
		]);
	} else if (printerModel === PrinterModel.M02) {
		// M02 header with justification
		return new Uint8Array([
			ESC,
			0x40, // ESC @ - Initialize printer
			ESC,
			0x61, // ESC a - Select justification
			justification, // 0=left, 1=center, 2=right
			US,
			0x11,
			0x02,
			0x04,
		]);
	}
	// Default D30 style
	return new Uint8Array([ESC, 0x40]);
};

/**
 * Return the block marker data for raster bit image
 * GS v 0 command - Print raster bit image
 *
 * @param {number} width - Width in bytes
 * @param {number} height - Height in lines (max 255 per block)
 * @param {number} sizeMode - Size mode (normal, double-width, double-height, quadruple)
 * @returns {Uint8Array}
 */
const getMarkerData = (width, height, sizeMode = SizeMode.NORMAL) => {
	return new Uint8Array([
		GS,
		0x76,
		0x30, // GS v 0 - Print raster bit image
		sizeMode, // Mode: 0=normal, 1=double-width, 2=double-height, 3=quadruple
		width & 0xff,
		width >> 8, // Width in bytes (little-endian)
		height & 0xff,
		height >> 8, // Height in lines (little-endian)
	]);
};

/**
 * Return the footer data to end the print session.
 * Different printers have different footer requirements.
 *
 * @param {string} printerModel - The printer model
 * @returns {Uint8Array}
 */
const getFooterData = (printerModel) => {
	if (isDType(printerModel)) {
		return new Uint8Array([ESC, 0x64, 0x00]); // ESC d 0 - Feed 0 lines
	} else if (printerModel === PrinterModel.P12PRO) {
		return new Uint8Array([ESC, 0x64, 0x0e]); // ESC d 14 - Feed 14 lines
	} else if (isMType(printerModel)) {
		return new Uint8Array([US, 0xf0, 0x05, 0x00, US, 0xf0, 0x03, 0x00]);
	} else if (printerModel === PrinterModel.M02) {
		return new Uint8Array([
			ESC,
			0x64,
			0x02, // Feed 2 lines
			ESC,
			0x64,
			0x02, // Feed 2 more lines
			US,
			0x11,
			0x08,
			US,
			0x11,
			0x0e,
			US,
			0x11,
			0x07,
			US,
			0x11,
			0x09,
		]);
	}
	// Default
	return new Uint8Array([ESC, 0x64, 0x00]);
};

// Legacy constant for backward compatibility
const HEADER_DATA = (mmWidth, bytes) =>
	new Uint8Array([
		0x1b,
		0x40,
		0x1d,
		0x76,
		0x30,
		0x00,
		mmWidth % 256,
		Math.floor(mmWidth / 256),
		bytes % 256,
		Math.floor(bytes / 256),
	]);

/** Constant data which ends the print session (legacy). */
const END_DATA = new Uint8Array([0x1b, 0x64, 0x00]);

/**
 * Determines a given pixel to be either black (0) or white (1).
 * Adapted from {@link https://github.com/WebBluetoothCG/demos/tree/gh-pages/bluetooth-printer}
 *
 * @param {HTMLCanvasElement} canvas the canvas you're printing
 * @param {Uint8Array} imageData the image data to check
 * @param {number} x X of the pixel to check
 * @param {number} y Y of the pixel to check
 * @returns {number} 0 if pixel should be printed black, 1 if white
 */
const getWhitePixel = (canvas, imageData, x, y) => {
	const red = imageData[(canvas.width * y + x) * 4];
	const green = imageData[(canvas.width * y + x) * 4 + 1];
	const blue = imageData[(canvas.width * y + x) * 4 + 2];
	return red + green + blue > 0 ? 0 : 1;
};

/**
 * Given a canvas, converts it to a byte array in the format expected by the Phomemo D30.
 * Adapted from {@link https://github.com/WebBluetoothCG/demos/tree/gh-pages/bluetooth-printer}
 *
 * @param {HTMLCanvasElement} canvas the canvas to convert to print data
 * @returns {Uint8Array} the byte array to transmit (in chunks) to the Bluetooth printer
 */
const getPrintData = (canvas) => {
	const ctx = canvas.getContext("2d");
	const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

	// Each 8 pixels in a row is represented by a byte
	const data = new Uint8Array((canvas.width / 8) * canvas.height + 8);
	let offset = 0;
	// Loop through image rows in bytes
	for (let i = 0; i < canvas.height; ++i) {
		for (let k = 0; k < canvas.width / 8; ++k) {
			const k8 = k * 8;
			// Pixel to bit position mapping
			let byte =
				getWhitePixel(canvas, imageData, k8 + 0, i) * 128 +
				getWhitePixel(canvas, imageData, k8 + 1, i) * 64 +
				getWhitePixel(canvas, imageData, k8 + 2, i) * 32 +
				getWhitePixel(canvas, imageData, k8 + 3, i) * 16 +
				getWhitePixel(canvas, imageData, k8 + 4, i) * 8 +
				getWhitePixel(canvas, imageData, k8 + 5, i) * 4 +
				getWhitePixel(canvas, imageData, k8 + 6, i) * 2 +
				getWhitePixel(canvas, imageData, k8 + 7, i);

			// Handle 0x0A byte which conflicts with line feed
			// Based on vivier/phomemo-tools fix
			if (byte === 0x0a) {
				byte = 0x14;
			}
			data[offset++] = byte;
		}
	}

	return data;
};

/**
 * Given a Bluetooth characteristic and a canvas, sends the necessary data to print it.
 * @param {BluetoothRemoteGATTCharacteristic} characteristic
 * @param {HTMLCanvasElement} canvas
 */
export const printCanvas = async (characteristic, canvas) => {
	const data = getPrintData(canvas);

	await characteristic.writeValueWithResponse(
		HEADER_DATA(canvas.width / 8, data.length / (canvas.width / 8))
	);

	for (let i = 0; ; i += PACKET_SIZE_BYTES) {
		if (i < data.length) {
			await characteristic.writeValueWithResponse(data.slice(i, i + PACKET_SIZE_BYTES));
		} else {
			await characteristic.writeValueWithResponse(data.slice(i * PACKET_SIZE_BYTES, data.length));
			break;
		}

		console.log(`Sent ${i}/${data.length} bytes`);
	}

	console.log(`Sent ${data.length}/${data.length} bytes (done)`);
	await characteristic.writeValueWithResponse(END_DATA);
};

/**
 * Advanced print function with support for multiple printer models and options
 * @param {BluetoothRemoteGATTCharacteristic} characteristic - BLE characteristic
 * @param {HTMLCanvasElement} canvas - Canvas to print
 * @param {string} printerModel - Printer model from PrinterModel enum
 * @param {object} options - Print options (speed, density, labelType, etc.)
 * @param {function} onProgress - Progress callback function
 */
export const printCanvasAdvanced = async (
	characteristic,
	canvas,
	printerModel = PrinterModel.D30,
	options = {},
	onProgress = null
) => {
	const { sizeMode = SizeMode.NORMAL, copies = 1, spacing = 0 } = options;

	const data = getPrintData(canvas);
	const widthBytes = canvas.width / 8;
	const heightLines = canvas.height;

	// Send initialization header
	const header = getHeaderData(printerModel, options);
	await characteristic.writeValueWithResponse(header);

	// For D-type printers, send extended init sequence
	if (isDType(printerModel)) {
		await characteristic.writeValueWithResponse(D_TYPE_INIT);
	}

	// Print requested number of copies
	for (let copy = 0; copy < copies; copy++) {
		// Split image into blocks of max 255 lines (protocol limitation)
		let remaining = heightLines;
		let lineOffset = 0;

		while (remaining > 0) {
			const blockLines = Math.min(remaining, 255);

			// Send block marker
			const marker = getMarkerData(widthBytes, blockLines, sizeMode);
			await characteristic.writeValueWithResponse(marker);

			// Send image data for this block
			const blockStart = lineOffset * widthBytes;
			const blockEnd = (lineOffset + blockLines) * widthBytes;
			const blockData = data.slice(blockStart, blockEnd);

			for (let i = 0; i < blockData.length; i += PACKET_SIZE_BYTES) {
				const chunk = blockData.slice(i, Math.min(i + PACKET_SIZE_BYTES, blockData.length));
				await characteristic.writeValueWithResponse(chunk);

				if (onProgress) {
					const totalBytes = data.length * copies;
					const sentBytes = copy * data.length + blockStart + i + chunk.length;
					onProgress(sentBytes, totalBytes);
				}
			}

			remaining -= blockLines;
			lineOffset += blockLines;
		}

		// Add spacing between copies for label printers
		if (copy < copies - 1 && spacing > 0 && isDType(printerModel)) {
			const spacingData = new Uint8Array(spacing * widthBytes).fill(0);
			const spacingMarker = getMarkerData(widthBytes, spacing, sizeMode);
			await characteristic.writeValueWithResponse(spacingMarker);
			await characteristic.writeValueWithResponse(spacingData);
		}
	}

	// Send footer
	const footer = getFooterData(printerModel);
	await characteristic.writeValueWithResponse(footer);

	console.log("Print complete");
};

/**
 * Query printer status (for supported printers)
 * Based on theacodes/phomemo_m02s
 * @param {BluetoothRemoteGATTCharacteristic} characteristic
 * @returns {object} Printer status
 */
export const queryPrinterStatus = async (characteristic) => {
	// Request serial number
	await characteristic.writeValueWithResponse(new Uint8Array([US, 0x11, 0x13]));
	// Request firmware version
	await characteristic.writeValueWithResponse(new Uint8Array([US, 0x11, 0x07]));
	// Request energy/battery level
	await characteristic.writeValueWithResponse(new Uint8Array([US, 0x11, 0x08]));
	// Request paper state
	await characteristic.writeValueWithResponse(new Uint8Array([US, 0x11, 0x11]));
};

/**
 * Set print concentration/density for M02 printers
 * @param {BluetoothRemoteGATTCharacteristic} characteristic
 * @param {number} value - Concentration value (1-15)
 */
export const setConcentration = async (characteristic, value = 2) => {
	const val = Math.min(15, Math.max(1, value));
	await characteristic.writeValueWithResponse(new Uint8Array([ESC, 0x4e, 0x04, val]));
};

/**
 * Feed paper by specified lines
 * @param {BluetoothRemoteGATTCharacteristic} characteristic
 * @param {number} lines - Number of lines to feed
 */
export const feedPaper = async (characteristic, lines = 2) => {
	await characteristic.writeValueWithResponse(new Uint8Array([ESC, 0x64, lines]));
};

/**
 * Initialize/reset the printer
 * @param {BluetoothRemoteGATTCharacteristic} characteristic
 */
export const initializePrinter = async (characteristic) => {
	await characteristic.writeValueWithResponse(new Uint8Array([ESC, 0x40]));
};

// Re-export for external use
export {
	PrinterModel,
	PrinterConfigs,
	SizeMode,
	Justification,
	LabelType,
	isDType,
	isMType,
	isM1Type,
	getHeaderData,
	getMarkerData,
	getFooterData,
	getPrintData,
};

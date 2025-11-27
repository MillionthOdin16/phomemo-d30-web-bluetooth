/**
 * Phomemo Printer Model Definitions
 * Based on research from multiple repositories:
 * - Knightro63/phomemo (Flutter)
 * - vivier/phomemo-tools
 * - theacodes/phomemo_m02s
 * - crabdancing/phomemo-d30
 */

// Printer model enumeration
export const PrinterModel = {
	D30: "d30",
	D35: "d35",
	P12PRO: "p12pro",
	M02: "m02",
	M110: "m110",
	M120: "m120",
	M220: "m220",
	T02: "t02",
	Q30: "q30",
};

// Size modes for M-type printers
export const SizeMode = {
	NORMAL: 0,
	DOUBLE_WIDTH: 1,
	DOUBLE_HEIGHT: 2,
	QUADRUPLE: 3,
};

// Text justification
export const Justification = {
	LEFT: 0,
	CENTER: 1,
	RIGHT: 2,
};

// Label types for M-type printers
export const LabelType = {
	GAPS: 0x0a,
	CONTINUOUS: 0x0b,
	MARKS: 0x26,
};

// Printer configurations
export const PrinterConfigs = {
	[PrinterModel.D30]: {
		name: "Phomemo D30",
		serviceUUID: "0000ff00-0000-1000-8000-00805f9b34fb",
		characteristicUUID: "0000ff02-0000-1000-8000-00805f9b34fb",
		notifyCharacteristicUUID: "0000ff03-0000-1000-8000-00805f9b34fb",
		maxWidth: 96, // pixels (12mm * 8 dpi)
		dpi: 203,
		rotate: true,
		supportsSettings: false,
		defaultLabelSize: { width: 40, height: 12 },
		presets: [
			{ name: "Standard (40x12mm)", width: 40, height: 12 },
			{ name: "Fruit Label", width: 40, height: 10, offset: -60 },
			{ name: "Square (12x12mm)", width: 12, height: 12 },
			{ name: "Long (50x12mm)", width: 50, height: 12 },
		],
	},
	[PrinterModel.D35]: {
		name: "Phomemo D35",
		serviceUUID: "0000ff00-0000-1000-8000-00805f9b34fb",
		characteristicUUID: "0000ff02-0000-1000-8000-00805f9b34fb",
		notifyCharacteristicUUID: "0000ff03-0000-1000-8000-00805f9b34fb",
		maxWidth: 96,
		dpi: 203,
		rotate: true,
		supportsSettings: false,
		defaultLabelSize: { width: 40, height: 12 },
		presets: [
			{ name: "Standard (40x15mm)", width: 40, height: 15 },
			{ name: "Square (15x15mm)", width: 15, height: 15 },
		],
	},
	[PrinterModel.P12PRO]: {
		name: "Phomemo P12 Pro",
		serviceUUID: "0000ff00-0000-1000-8000-00805f9b34fb",
		characteristicUUID: "0000ff02-0000-1000-8000-00805f9b34fb",
		notifyCharacteristicUUID: "0000ff03-0000-1000-8000-00805f9b34fb",
		maxWidth: 96,
		dpi: 203,
		rotate: true,
		supportsSettings: false,
		defaultLabelSize: { width: 40, height: 12 },
		presets: [{ name: "Standard (40x12mm)", width: 40, height: 12 }],
	},
	[PrinterModel.M02]: {
		name: "Phomemo M02",
		serviceUUID: "0000ff00-0000-1000-8000-00805f9b34fb",
		characteristicUUID: "0000ff02-0000-1000-8000-00805f9b34fb",
		notifyCharacteristicUUID: "0000ff03-0000-1000-8000-00805f9b34fb",
		maxWidth: 384, // 48mm * 8 dpi
		dpi: 203,
		rotate: false,
		supportsSettings: true,
		supportsJustification: true,
		supportsDensity: true,
		defaultLabelSize: { width: 53, height: 30 },
		presets: [
			{ name: "Receipt (53mm width)", width: 53, height: 30 },
			{ name: "Small (53x20mm)", width: 53, height: 20 },
		],
	},
	[PrinterModel.M110]: {
		name: "Phomemo M110",
		serviceUUID: "0000ff00-0000-1000-8000-00805f9b34fb",
		characteristicUUID: "0000ff02-0000-1000-8000-00805f9b34fb",
		notifyCharacteristicUUID: "0000ff03-0000-1000-8000-00805f9b34fb",
		maxWidth: 344, // 43 bytes * 8 pixels
		dpi: 203,
		rotate: false,
		supportsSettings: true,
		supportsSpeed: true,
		supportsDensity: true,
		supportsLabelType: true,
		defaultLabelSize: { width: 40, height: 30 },
		presets: [
			{ name: "Standard (40x30mm)", width: 40, height: 30 },
			{ name: "Small (30x20mm)", width: 30, height: 20 },
			{ name: "Round (30x30mm)", width: 30, height: 30 },
		],
	},
	[PrinterModel.M120]: {
		name: "Phomemo M120",
		serviceUUID: "0000ff00-0000-1000-8000-00805f9b34fb",
		characteristicUUID: "0000ff02-0000-1000-8000-00805f9b34fb",
		notifyCharacteristicUUID: "0000ff03-0000-1000-8000-00805f9b34fb",
		maxWidth: 344,
		dpi: 203,
		rotate: false,
		supportsSettings: true,
		supportsSpeed: true,
		supportsDensity: true,
		supportsLabelType: true,
		defaultLabelSize: { width: 40, height: 30 },
		presets: [
			{ name: "Standard (40x30mm)", width: 40, height: 30 },
			{ name: "Small (30x20mm)", width: 30, height: 20 },
		],
	},
	[PrinterModel.M220]: {
		name: "Phomemo M220",
		serviceUUID: "0000ff00-0000-1000-8000-00805f9b34fb",
		characteristicUUID: "0000ff02-0000-1000-8000-00805f9b34fb",
		notifyCharacteristicUUID: "0000ff03-0000-1000-8000-00805f9b34fb",
		maxWidth: 576, // 72 bytes * 8 pixels
		dpi: 203,
		rotate: false,
		supportsSettings: true,
		supportsSpeed: true,
		supportsDensity: true,
		supportsLabelType: true,
		defaultLabelSize: { width: 50, height: 30 },
		presets: [
			{ name: "Standard (50x30mm)", width: 50, height: 30 },
			{ name: "Shipping (100x50mm)", width: 100, height: 50 },
		],
	},
	[PrinterModel.T02]: {
		name: "Phomemo T02 (Cat Printer)",
		serviceUUID: "0000ff00-0000-1000-8000-00805f9b34fb",
		characteristicUUID: "0000ff02-0000-1000-8000-00805f9b34fb",
		notifyCharacteristicUUID: "0000ff03-0000-1000-8000-00805f9b34fb",
		maxWidth: 384,
		dpi: 203,
		rotate: false,
		supportsSettings: false,
		supportsNotifications: true,
		defaultLabelSize: { width: 53, height: 30 },
		presets: [{ name: "Receipt (53mm width)", width: 53, height: 30 }],
	},
	[PrinterModel.Q30]: {
		name: "Phomemo Q30",
		serviceUUID: "0000af30-0000-1000-8000-00805f9b34fb",
		characteristicUUID: "0000ff02-0000-1000-8000-00805f9b34fb",
		notifyCharacteristicUUID: "0000ff03-0000-1000-8000-00805f9b34fb",
		maxWidth: 96,
		dpi: 203,
		rotate: true,
		supportsSettings: false,
		defaultLabelSize: { width: 50, height: 12 },
		presets: [{ name: "Standard (50x12mm)", width: 50, height: 12 }],
	},
};

// Helper functions
export const isDType = (model) => model === PrinterModel.D30 || model === PrinterModel.D35;
export const isMType = (model) =>
	model === PrinterModel.M110 || model === PrinterModel.M120 || model === PrinterModel.M220;
export const isM1Type = (model) => model === PrinterModel.M110 || model === PrinterModel.M120;

// Get printer model from device name
export const detectPrinterModel = (deviceName) => {
	const name = deviceName.toLowerCase();
	if (name.includes("d30")) return PrinterModel.D30;
	if (name.includes("d35")) return PrinterModel.D35;
	if (name.includes("p12")) return PrinterModel.P12PRO;
	if (name.includes("m02")) return PrinterModel.M02;
	if (name.includes("m110")) return PrinterModel.M110;
	if (name.includes("m120")) return PrinterModel.M120;
	if (name.includes("m220")) return PrinterModel.M220;
	if (name.includes("t02")) return PrinterModel.T02;
	if (name.includes("q30")) return PrinterModel.Q30;
	// Default to D30 if unknown
	return PrinterModel.D30;
};

// Density levels for compatible printers
export const DensityLevels = [
	{ name: "Lowest", value: 0x01 },
	{ name: "Very Light", value: 0x03 },
	{ name: "Light", value: 0x05 },
	{ name: "Medium Light", value: 0x07 },
	{ name: "Medium", value: 0x09 },
	{ name: "Medium Dark", value: 0x0b },
	{ name: "Dark", value: 0x0d },
	{ name: "Darkest", value: 0x0f },
];

// Speed levels for M-type printers
export const SpeedLevels = [
	{ name: "Slowest", value: 1 },
	{ name: "Slow", value: 2 },
	{ name: "Medium", value: 3 },
	{ name: "Fast", value: 4 },
	{ name: "Fastest", value: 5 },
];

"use strict";

import { drawText } from "https://cdn.jsdelivr.net/npm/canvas-txt@4.1.1/+esm";
import {
	printCanvas,
	printCanvasAdvanced,
	PrinterModel,
	PrinterConfigs,
	isDType,
	isMType,
} from "./src/printer.js";
import { applyDithering, DitheringAlgorithm, DitheringInfo } from "./src/dithering.js";
import { detectPrinterModel } from "./src/printerModels.js";
import { CanvasEditor } from "./src/canvasEditor.js";
import { printerStatus, StatusEventType } from "./src/printerStatus.js";
import {
	getTemplates,
	saveTemplate,
	deleteTemplate,
	getTemplateById,
	exportTemplates,
	importTemplates,
	getPrintHistory,
	addToHistory,
	clearHistory,
	getSettings,
	saveSettings,
	saveDevice,
	getSavedDevices,
} from "./src/storage.js";

const $ = document.querySelector.bind(document);
const $all = document.querySelectorAll.bind(document);

// State management
const state = {
	labelSize: { width: 40, height: 12 },
	connected: false,
	printerModel: PrinterModel.D30,
	device: null,
	characteristic: null,
	notifyCharacteristic: null,
	canvasEditor: null,
	currentTab: "text",
};

// ================== Utility Functions ==================

const handleError = (err) => {
	console.error(err);
	const toast = bootstrap.Toast.getOrCreateInstance($("#errorToast"));
	$("#errorText").textContent = err.toString();
	toast.show();
};

const showSuccess = (message) => {
	const toast = bootstrap.Toast.getOrCreateInstance($("#successToast"));
	$("#successText").textContent = message;
	toast.show();
};

const updateConnectionStatus = (connected, deviceName = null) => {
	const statusBadge = $("#connectionStatus");
	state.connected = connected;

	if (connected) {
		statusBadge.textContent = `Connected: ${deviceName}`;
		statusBadge.classList.remove("bg-secondary");
		statusBadge.classList.add("connected", "bg-success");
		$("#btnConnect").innerHTML = '<i class="bi bi-bluetooth"></i> Disconnect';
		$("#printerSettingsCard").style.display = "block";
		$("#printerStatusCard").style.display = "block";
		$("#printerName").textContent = deviceName;
	} else {
		statusBadge.innerHTML = '<i class="bi bi-bluetooth"></i> Not Connected';
		statusBadge.classList.remove("connected", "bg-success");
		statusBadge.classList.add("bg-secondary");
		$("#btnConnect").innerHTML = '<i class="bi bi-bluetooth"></i> Connect Printer';
		$("#printerSettingsCard").style.display = "none";
		$("#printerStatusCard").style.display = "none";
	}
};

const updatePrinterSettings = (model) => {
	state.printerModel = model;
	const config = PrinterConfigs[model];

	// Show/hide relevant settings based on printer capabilities
	$("#densityGroup").style.display = config?.supportsDensity ? "block" : "none";
	$("#speedGroup").style.display = config?.supportsSpeed ? "block" : "none";
	$("#labelTypeGroup").style.display = config?.supportsLabelType ? "block" : "none";

	// Update label presets
	updateLabelPresets(model);
};

const updateLabelPresets = (model) => {
	const config = PrinterConfigs[model];
	const select = $("#labelPreset");

	// Clear existing options except "Custom"
	while (select.options.length > 1) {
		select.remove(1);
	}

	// Add presets for this printer
	if (config?.presets) {
		config.presets.forEach((preset) => {
			const option = document.createElement("option");
			option.value = `${preset.width}x${preset.height}`;
			option.textContent = preset.name;
			select.appendChild(option);
		});
	}

	// Set default
	if (config?.defaultLabelSize) {
		$("#inputWidth").value = config.defaultLabelSize.width;
		$("#inputHeight").value = config.defaultLabelSize.height;
	}
};

const showProgress = (show, value = 0) => {
	const progressDiv = $("#printProgress");
	const progressBar = $("#progressBar");

	progressDiv.style.display = show ? "flex" : "none";
	progressBar.style.width = `${value}%`;
	progressBar.textContent = `${Math.round(value)}%`;
};

// ================== Canvas Drawing Functions ==================

const updateLabelSize = (canvas) => {
	const inputWidth = $("#inputWidth").valueAsNumber;
	const inputHeight = $("#inputHeight").valueAsNumber;

	if (isNaN(inputWidth) || isNaN(inputHeight) || inputWidth < 1 || inputHeight < 1) {
		handleError("Invalid label size");
		return;
	}

	state.labelSize.width = inputWidth;
	state.labelSize.height = inputHeight;

	// Image sent to printer is printed top to bottom, so reverse width and height
	// 8 pixels per mm at 203 DPI
	canvas.width = state.labelSize.height * 8;
	canvas.height = state.labelSize.width * 8;

	// Trigger redraw of current tab
	const activeTab = $(".nav-link.active");
	if (activeTab) {
		activeTab.click();
	}
};

const updateCanvasText = (canvas) => {
	const text = $("#inputText").value;
	const fontSize = $("#inputFontSize").valueAsNumber;
	const textAlign = $("#textAlign").value;
	const fontFamily = $("#fontFamily").value;
	const fontWeight = $("#fontWeight").value;

	if (isNaN(fontSize) || fontSize < 1) {
		handleError("Invalid font size");
		return;
	}

	const ctx = canvas.getContext("2d");
	ctx.fillStyle = "#fff";
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	ctx.save();
	ctx.translate(canvas.width / 2, canvas.height / 2);
	ctx.rotate(Math.PI / 2);

	ctx.fillStyle = "#000";
	ctx.textAlign = textAlign;
	ctx.textBaseline = "top";

	// Parse font weight
	let fontStyle = "";
	if (fontWeight.includes("bold")) fontStyle += "bold ";
	if (fontWeight.includes("italic")) fontStyle += "italic ";

	drawText(ctx, text, {
		x: -canvas.height / 2,
		y: -canvas.width / 2,
		width: canvas.height,
		height: canvas.width,
		font: fontFamily,
		fontSize,
		fontStyle: fontStyle.trim() || "normal",
		align: textAlign,
		vAlign: "middle",
	});

	ctx.restore();
};

const updateCanvasBarcode = (canvas) => {
	const barcodeData = $("#inputBarcode").value;
	const barcodeFormat = $("#barcodeFormat").value;
	const barcodeWidth = parseInt($("#barcodeWidth").value) || 2;
	const showText = $("#barcodeShowText").checked;

	const image = document.createElement("img");

	image.addEventListener("load", () => {
		const ctx = canvas.getContext("2d");
		ctx.fillStyle = "#fff";
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		ctx.save();
		ctx.translate(canvas.width / 2, canvas.height / 2);
		ctx.rotate(Math.PI / 2);

		ctx.imageSmoothingEnabled = false;

		// Scale barcode to fit
		const scale = Math.min(canvas.height / image.width, canvas.width / image.height) * 0.9;
		const drawWidth = image.width * scale;
		const drawHeight = image.height * scale;

		ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
		ctx.restore();
	});

	image.addEventListener("error", () => {
		handleError("Invalid barcode data for selected format");
	});

	try {
		JsBarcode(image, barcodeData, {
			format: barcodeFormat,
			width: barcodeWidth,
			height: state.labelSize.height * 6,
			displayValue: showText,
			margin: 5,
		});
	} catch (e) {
		handleError(`Barcode error: ${e.message}`);
	}
};

const drawImageToCanvas = (ctx, url, canvas, options = {}) => {
	const { doScale = true, dithering = DitheringAlgorithm.FLOYD_STEINBERG, threshold = 128, invert = false } = options;

	const img = new Image();

	img.addEventListener("load", () => {
		ctx.fillStyle = "#fff";
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		ctx.save();
		ctx.translate(canvas.width / 2, canvas.height / 2);
		ctx.rotate(Math.PI / 2);

		ctx.imageSmoothingEnabled = true;

		// Calculate scale
		const scale = doScale ? Math.min(canvas.height / img.width, canvas.width / img.height) : 1;
		const drawWidth = img.width * scale;
		const drawHeight = img.height * scale;

		ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
		ctx.restore();

		// Apply dithering if needed
		if (dithering !== DitheringAlgorithm.NONE) {
			const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

			// Invert if requested
			if (invert) {
				for (let i = 0; i < imageData.data.length; i += 4) {
					imageData.data[i] = 255 - imageData.data[i];
					imageData.data[i + 1] = 255 - imageData.data[i + 1];
					imageData.data[i + 2] = 255 - imageData.data[i + 2];
				}
			}

			applyDithering(imageData, dithering, threshold);
			ctx.putImageData(imageData, 0, 0);
		}
	});

	img.addEventListener("error", () => {
		handleError("Failed to load image");
	});

	img.src = url;
};

const updateCanvasImage = (canvas) => {
	const ctx = canvas.getContext("2d");
	const file = $("#inputImage").files[0];

	if (!file) {
		ctx.fillStyle = "#fff";
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		return;
	}

	const reader = new FileReader();

	reader.addEventListener("load", (e) => {
		const dithering = $("#ditheringAlgorithm").value;
		const threshold = parseInt($("#imageThreshold").value) || 128;
		const invert = $("#imageInvert").checked;
		const fitToLabel = $("#imageFitToLabel").checked;

		drawImageToCanvas(ctx, e.target.result, canvas, {
			doScale: fitToLabel,
			dithering,
			threshold,
			invert,
		});
	});

	reader.addEventListener("error", () => {
		handleError("Failed to read image file");
	});

	reader.readAsDataURL(file);
};

const updateCanvasQR = async (canvas) => {
	const data = $("#inputQR").value;
	const errorCorrection = $("#qrErrorCorrection").value;
	const margin = parseInt($("#qrMargin").value) || 2;

	if (!data) {
		const ctx = canvas.getContext("2d");
		ctx.fillStyle = "#fff";
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		return;
	}

	try {
		const qrSize = Math.min(canvas.width, canvas.height) - 16;
		const qrImg = await QRCode.toDataURL(data, {
			width: qrSize,
			margin: margin,
			errorCorrectionLevel: errorCorrection,
		});

		const ctx = canvas.getContext("2d");
		drawImageToCanvas(ctx, qrImg, canvas, {
			doScale: false,
			dithering: DitheringAlgorithm.NONE,
		});
	} catch (e) {
		handleError(`QR Code error: ${e.message}`);
	}
};

// ================== Bluetooth Functions ==================

const connectPrinter = async () => {
	try {
		const device = await navigator.bluetooth.requestDevice({
			acceptAllDevices: true,
			optionalServices: [
				"0000ff00-0000-1000-8000-00805f9b34fb",
				"0000af30-0000-1000-8000-00805f9b34fb",
			],
		});

		// Detect printer model from name
		if (device.name) {
			const detectedModel = detectPrinterModel(device.name);
			state.printerModel = detectedModel;
			$("#printerModel").value = detectedModel;
			updatePrinterSettings(detectedModel);
		}

		const server = await device.gatt.connect();

		// Try to get the service
		let service;
		try {
			service = await server.getPrimaryService("0000ff00-0000-1000-8000-00805f9b34fb");
		} catch {
			service = await server.getPrimaryService("0000af30-0000-1000-8000-00805f9b34fb");
		}

		const characteristic = await service.getCharacteristic("0000ff02-0000-1000-8000-00805f9b34fb");

		// Try to get notify characteristic for status updates
		try {
			const notifyChar = await service.getCharacteristic("0000ff03-0000-1000-8000-00805f9b34fb");
			await notifyChar.startNotifications();
			notifyChar.addEventListener("characteristicvaluechanged", handlePrinterNotification);
			state.notifyCharacteristic = notifyChar;
		} catch (e) {
			console.log("Notifications not available:", e);
		}

		state.device = device;
		state.characteristic = characteristic;

		// Listen for disconnect
		device.addEventListener("gattserverdisconnected", () => {
			updateConnectionStatus(false);
			state.device = null;
			state.characteristic = null;
			showSuccess("Printer disconnected");
		});

		updateConnectionStatus(true, device.name);
		showSuccess(`Connected to ${device.name}`);

		return characteristic;
	} catch (e) {
		if (e.name !== "NotFoundError") {
			handleError(e);
		}
		return null;
	}
};

const disconnectPrinter = () => {
	if (state.device && state.device.gatt.connected) {
		state.device.gatt.disconnect();
	}
	updateConnectionStatus(false);
};

const handlePrinterNotification = (event) => {
	const value = new Uint8Array(event.target.value.buffer);
	console.log("Printer notification:", value);

	// Parse common notifications based on theacodes/phomemo_m02s
	if (value.length >= 3) {
		if (value[0] === 0x1a) {
			switch (value[1]) {
				case 0x06:
					console.log("Paper status:", value[2] === 0x89 ? "Have paper" : "Out of paper");
					break;
				case 0x05:
					console.log("Cover status:", value[2] === 0x98 ? "Closed" : "Open");
					break;
				case 0x04:
					console.log("Print complete");
					break;
			}
		}
	}
};

// ================== Print Function ==================

const print = async (canvas) => {
	const btnPrint = $("#btnPrint");
	btnPrint.disabled = true;
	btnPrint.classList.add("printing");
	btnPrint.innerHTML = '<i class="bi bi-printer"></i> Printing...';

	try {
		let char = state.characteristic;

		// Connect if not already connected
		if (!char) {
			char = await connectPrinter();
			if (!char) {
				throw new Error("Failed to connect to printer");
			}
		}

		showProgress(true, 0);

		// Get print options
		const options = {
			speed: parseInt($("#printSpeed").value) || 5,
			density: parseInt($("#printDensity").value) || 9,
			labelType: parseInt($("#labelType").value) || 0x0a,
			copies: parseInt($("#printCopies").value) || 1,
			spacing: parseInt($("#labelSpacing").value) || 0,
		};

		// Print with progress callback
		await printCanvasAdvanced(char, canvas, state.printerModel, options, (sent, total) => {
			const progress = (sent / total) * 100;
			showProgress(true, progress);
		});

		showProgress(true, 100);
		showSuccess("Print complete!");

		// Add to print history
		addToHistory({
			templateName: state.currentTab,
			type: state.currentTab,
			preview: canvas.toDataURL("image/png"),
			success: true,
		});
		updatePrintHistory();

		setTimeout(() => showProgress(false), 1500);
	} catch (e) {
		handleError(e);
		showProgress(false);
		// Add failed print to history
		addToHistory({
			templateName: state.currentTab,
			type: state.currentTab,
			preview: canvas.toDataURL("image/png"),
			success: false,
		});
		updatePrintHistory();
	} finally {
		btnPrint.disabled = false;
		btnPrint.classList.remove("printing");
		btnPrint.innerHTML = '<i class="bi bi-printer"></i> Print Label';
	}
};

// ================== Dithering Preview ==================

const showDitheringPreview = () => {
	const container = $("#ditheringPreviewContainer");
	container.innerHTML = "";

	const file = $("#inputImage").files[0];
	if (!file) {
		handleError("Please select an image first");
		return;
	}

	const reader = new FileReader();

	reader.addEventListener("load", (e) => {
		const img = new Image();

		img.addEventListener("load", () => {
			Object.keys(DitheringAlgorithm).forEach((key) => {
				const algo = DitheringAlgorithm[key];
				const info = DitheringInfo[algo];

				const col = document.createElement("div");
				col.className = "col-md-4 col-sm-6 dithering-preview";

				const previewCanvas = document.createElement("canvas");
				previewCanvas.width = 160;
				previewCanvas.height = 160;

				const ctx = previewCanvas.getContext("2d");
				ctx.fillStyle = "#fff";
				ctx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);

				// Draw scaled image
				const scale = Math.min(previewCanvas.width / img.width, previewCanvas.height / img.height);
				const w = img.width * scale;
				const h = img.height * scale;
				ctx.drawImage(img, (previewCanvas.width - w) / 2, (previewCanvas.height - h) / 2, w, h);

				// Apply dithering
				const imageData = ctx.getImageData(0, 0, previewCanvas.width, previewCanvas.height);
				applyDithering(imageData, algo, 128);
				ctx.putImageData(imageData, 0, 0);

				const label = document.createElement("div");
				label.className = "preview-label";
				label.textContent = info?.name || key;

				col.appendChild(previewCanvas);
				col.appendChild(label);
				container.appendChild(col);
			});

			const modal = new bootstrap.Modal($("#ditheringModal"));
			modal.show();
		});

		img.src = e.target.result;
	});

	reader.readAsDataURL(file);
};

// ================== Download Function ==================

const downloadImage = () => {
	const canvas = $("#canvas");
	const link = document.createElement("a");
	link.download = "label.png";
	link.href = canvas.toDataURL("image/png");
	link.click();
};

// ================== Template Functions ==================

const updateTemplatesList = () => {
	const container = $("#templatesList");
	const templates = getTemplates();

	if (templates.length === 0) {
		container.innerHTML = `
			<div class="text-muted text-center py-3">
				<i class="bi bi-inbox fs-1"></i>
				<p>No saved templates yet</p>
			</div>
		`;
		return;
	}

	container.innerHTML = templates
		.map(
			(t) => `
		<div class="template-item" data-id="${t.id}">
			<img src="${t.preview || ""}" alt="${t.name}" class="template-preview" />
			<div class="template-info">
				<div class="template-name">${t.name}</div>
				<div class="template-meta">${t.type} • ${new Date(t.createdAt).toLocaleDateString()}</div>
			</div>
			<div class="template-actions">
				<button type="button" class="btn btn-sm btn-outline-primary btn-load-template" title="Load">
					<i class="bi bi-box-arrow-in-down"></i>
				</button>
				<button type="button" class="btn btn-sm btn-outline-danger btn-delete-template" title="Delete">
					<i class="bi bi-trash"></i>
				</button>
			</div>
		</div>
	`
		)
		.join("");

	// Add event listeners
	container.querySelectorAll(".btn-load-template").forEach((btn) => {
		btn.addEventListener("click", (e) => {
			const id = e.target.closest(".template-item").dataset.id;
			loadTemplate(id);
		});
	});

	container.querySelectorAll(".btn-delete-template").forEach((btn) => {
		btn.addEventListener("click", (e) => {
			const id = e.target.closest(".template-item").dataset.id;
			if (confirm("Delete this template?")) {
				deleteTemplate(id);
				updateTemplatesList();
				showSuccess("Template deleted");
			}
		});
	});
};

const saveCurrentAsTemplate = () => {
	const canvas = $("#canvas");
	const name = $("#templateName").value.trim();

	if (!name) {
		handleError("Please enter a template name");
		return;
	}

	const template = {
		name,
		type: state.currentTab,
		preview: canvas.toDataURL("image/png"),
		labelSize: { ...state.labelSize },
		content: getCurrentContent(),
		settings: {
			printerModel: state.printerModel,
			density: parseInt($("#printDensity").value) || 9,
			speed: parseInt($("#printSpeed").value) || 5,
		},
	};

	saveTemplate(template);
	updateTemplatesList();
	showSuccess("Template saved!");

	// Close modal
	bootstrap.Modal.getInstance($("#saveTemplateModal"))?.hide();
};

const getCurrentContent = () => {
	switch (state.currentTab) {
		case "text":
			return {
				text: $("#inputText").value,
				fontSize: parseInt($("#inputFontSize").value),
				fontFamily: $("#fontFamily").value,
				fontWeight: $("#fontWeight").value,
				textAlign: $("#textAlign").value,
			};
		case "barcode":
			return {
				data: $("#inputBarcode").value,
				format: $("#barcodeFormat").value,
				width: parseInt($("#barcodeWidth").value),
				showText: $("#barcodeShowText").checked,
			};
		case "qr":
			return {
				data: $("#inputQR").value,
				errorCorrection: $("#qrErrorCorrection").value,
				margin: parseInt($("#qrMargin").value),
			};
		default:
			return {};
	}
};

const loadTemplate = (id) => {
	const template = getTemplateById(id);
	if (!template) {
		handleError("Template not found");
		return;
	}

	// Set label size
	$("#inputWidth").value = template.labelSize.width;
	$("#inputHeight").value = template.labelSize.height;
	updateLabelSize($("#canvas"));

	// Set content based on type
	if (template.type === "text" && template.content) {
		$("#inputText").value = template.content.text || "";
		$("#inputFontSize").value = template.content.fontSize || 48;
		$("#fontFamily").value = template.content.fontFamily || "sans-serif";
		$("#fontWeight").value = template.content.fontWeight || "normal";
		$("#textAlign").value = template.content.textAlign || "center";

		// Switch to text tab
		document.querySelector("#nav-text-tab").click();
	} else if (template.type === "barcode" && template.content) {
		$("#inputBarcode").value = template.content.data || "";
		$("#barcodeFormat").value = template.content.format || "CODE128";
		$("#barcodeWidth").value = template.content.width || 2;
		$("#barcodeShowText").checked = template.content.showText !== false;

		document.querySelector("#nav-barcode-tab").click();
	} else if (template.type === "qr" && template.content) {
		$("#inputQR").value = template.content.data || "";
		$("#qrErrorCorrection").value = template.content.errorCorrection || "M";
		$("#qrMargin").value = template.content.margin || 2;

		document.querySelector("#nav-qr-tab").click();
	}

	showSuccess(`Loaded template: ${template.name}`);
};

// ================== Print History Functions ==================

const updatePrintHistory = () => {
	const container = $("#printHistoryList");
	const history = getPrintHistory(10);

	if (history.length === 0) {
		container.innerHTML = '<div class="text-muted text-center py-2">No print history yet</div>';
		return;
	}

	container.innerHTML = history
		.map(
			(h) => `
		<div class="history-item">
			<span class="history-icon">
				<i class="bi ${h.success ? "bi-check-circle text-success" : "bi-x-circle text-danger"}"></i>
			</span>
			<div class="history-info">
				${h.type} label
				<div class="history-time">${new Date(h.timestamp).toLocaleString()}</div>
			</div>
		</div>
	`
		)
		.join("");
};

// ================== Printer Status Functions ==================

const updateStatusDisplay = () => {
	const status = printerStatus.getStatus();

	// Battery
	if (status.battery !== null) {
		$("#batteryLevel").textContent = `${status.battery}%`;
		$("#batteryIcon").className = `bi ${printerStatus.getBatteryIcon()} fs-4`;
	}

	// Paper
	if (status.hasPaper !== null) {
		$("#paperStatus").textContent = status.hasPaper ? "OK" : "Empty";
		$("#paperIcon").className = `bi bi-file-earmark fs-4 ${status.hasPaper ? "text-success" : "text-danger"}`;
	}

	// Cover
	if (status.coverClosed !== null) {
		$("#coverStatus").textContent = status.coverClosed ? "Closed" : "Open";
		$("#coverIcon").className = `bi bi-box fs-4 ${status.coverClosed ? "text-success" : "text-warning"}`;
	}

	// Ready status
	$("#printerReadyStatus").textContent = printerStatus.getStatusMessage();
	$("#readyIcon").className = `bi fs-4 ${
		printerStatus.isReady() ? "bi-check-circle text-success" : "bi-exclamation-circle text-warning"
	}`;
};

// ================== Keyboard Shortcuts ==================

const setupKeyboardShortcuts = () => {
	document.addEventListener("keydown", (e) => {
		// Ctrl+P - Print
		if (e.ctrlKey && e.key === "p") {
			e.preventDefault();
			$("#btnPrint").click();
		}

		// Ctrl+S - Save template
		if (e.ctrlKey && e.key === "s") {
			e.preventDefault();
			$("#btnSaveTemplate").click();
		}

		// Ctrl+Z - Undo (in draw mode)
		if (e.ctrlKey && e.key === "z" && state.currentTab === "draw" && state.canvasEditor) {
			e.preventDefault();
			state.canvasEditor.undo();
		}

		// Ctrl+Y - Redo (in draw mode)
		if (e.ctrlKey && e.key === "y" && state.currentTab === "draw" && state.canvasEditor) {
			e.preventDefault();
			state.canvasEditor.redo();
		}
	});
};

// ================== Event Handlers ==================

document.addEventListener("DOMContentLoaded", function () {
	const canvas = $("#canvas");

	// Tab change events
	document.addEventListener("shown.bs.tab", (e) => {
		state.currentTab = e.target.id.replace("nav-", "").replace("-tab", "");
		
		if (e.target.id === "nav-text-tab") updateCanvasText(canvas);
		else if (e.target.id === "nav-barcode-tab") updateCanvasBarcode(canvas);
		else if (e.target.id === "nav-image-tab") updateCanvasImage(canvas);
		else if (e.target.id === "nav-qr-tab") updateCanvasQR(canvas);
		else if (e.target.id === "nav-draw-tab") {
			// Initialize canvas editor if not already done
			if (!state.canvasEditor) {
				state.canvasEditor = new CanvasEditor(canvas);
			}
		} else if (e.target.id === "nav-templates-tab") {
			updateTemplatesList();
		}
	});

	// Label size inputs
	$all("#inputWidth, #inputHeight").forEach((e) =>
		e.addEventListener("input", () => updateLabelSize(canvas))
	);

	// Label preset
	$("#labelPreset").addEventListener("change", (e) => {
		const value = e.target.value;
		if (value === "custom") return;

		if (value === "fruit") {
			$("#inputWidth").value = 40;
			$("#inputHeight").value = 10;
		} else {
			const [width, height] = value.split("x").map(Number);
			$("#inputWidth").value = width;
			$("#inputHeight").value = height;
		}
		updateLabelSize(canvas);
	});

	// Text inputs
	$all("#inputText, #inputFontSize, #textAlign, #fontFamily, #fontWeight").forEach((e) =>
		e.addEventListener("input", () => updateCanvasText(canvas))
	);

	// Barcode inputs
	$all("#inputBarcode, #barcodeFormat, #barcodeWidth, #barcodeShowText").forEach((e) =>
		e.addEventListener("input", () => updateCanvasBarcode(canvas))
	);
	$("#barcodeShowText").addEventListener("change", () => updateCanvasBarcode(canvas));

	// Image inputs
	$("#inputImage").addEventListener("change", () => updateCanvasImage(canvas));
	$all("#ditheringAlgorithm, #imageThreshold, #imageInvert, #imageFitToLabel").forEach((e) =>
		e.addEventListener("change", () => updateCanvasImage(canvas))
	);

	// Threshold value display
	$("#imageThreshold").addEventListener("input", (e) => {
		$("#thresholdValue").textContent = e.target.value;
		updateCanvasImage(canvas);
	});

	// QR inputs
	$all("#inputQR, #qrErrorCorrection, #qrMargin").forEach((e) =>
		e.addEventListener("input", () => updateCanvasQR(canvas))
	);

	// Printer model change
	$("#printerModel").addEventListener("change", (e) => {
		updatePrinterSettings(e.target.value);
		updateLabelSize(canvas);
	});

	// Connect button
	$("#btnConnect").addEventListener("click", () => {
		if (state.connected) {
			disconnectPrinter();
		} else {
			connectPrinter();
		}
	});

	// Print form submit
	$("#printForm").addEventListener("submit", (e) => {
		e.preventDefault();
		print(canvas);
	});

	// Download button
	$("#btnDownload").addEventListener("click", downloadImage);

	// Dithering preview button
	$("#btnPreviewDithering").addEventListener("click", showDitheringPreview);

	// ================== Drawing Tools ==================
	
	// Tool buttons
	const toolButtons = {
		toolPen: "pen",
		toolEraser: "eraser",
		toolLine: "line",
		toolRect: "rectangle",
		toolCircle: "circle",
	};

	Object.keys(toolButtons).forEach((btnId) => {
		const btn = $(`#${btnId}`);
		if (btn) {
			btn.addEventListener("click", () => {
				// Remove active from all tool buttons
				Object.keys(toolButtons).forEach((id) => $(`#${id}`)?.classList.remove("active"));
				btn.classList.add("active");
				if (state.canvasEditor) {
					state.canvasEditor.setTool(toolButtons[btnId]);
				}
			});
		}
	});

	// Undo/Redo
	$("#btnUndo")?.addEventListener("click", () => state.canvasEditor?.undo());
	$("#btnRedo")?.addEventListener("click", () => state.canvasEditor?.redo());

	// Clear canvas
	$("#btnClearCanvas")?.addEventListener("click", () => {
		if (state.canvasEditor) {
			state.canvasEditor.clear();
		}
	});

	// Invert canvas
	$("#btnInvertCanvas")?.addEventListener("click", () => {
		if (state.canvasEditor) {
			state.canvasEditor.invert();
		}
	});

	// Drawing color
	$("#drawColor")?.addEventListener("input", (e) => {
		if (state.canvasEditor) {
			state.canvasEditor.setColor(e.target.value);
		}
	});

	// Drawing line width
	$("#drawLineWidth")?.addEventListener("input", (e) => {
		if (state.canvasEditor) {
			state.canvasEditor.setLineWidth(parseInt(e.target.value));
		}
	});

	// ================== Template Management ==================

	// Save template button
	$("#btnSaveTemplate")?.addEventListener("click", () => {
		// Copy canvas to template preview
		const templatePreview = $("#templatePreview");
		if (templatePreview) {
			templatePreview.width = canvas.width;
			templatePreview.height = canvas.height;
			const ctx = templatePreview.getContext("2d");
			ctx.drawImage(canvas, 0, 0);
		}
		$("#templateName").value = "";
		const modal = new bootstrap.Modal($("#saveTemplateModal"));
		modal.show();
	});

	// Confirm save template
	$("#btnConfirmSaveTemplate")?.addEventListener("click", saveCurrentAsTemplate);

	// Export templates
	$("#btnExportTemplates")?.addEventListener("click", () => {
		const data = exportTemplates();
		const blob = new Blob([data], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = "phomemo-templates.json";
		link.click();
		URL.revokeObjectURL(url);
		showSuccess("Templates exported!");
	});

	// Import templates
	$("#btnImportTemplates")?.addEventListener("click", () => {
		$("#importTemplateFile").click();
	});

	$("#importTemplateFile")?.addEventListener("change", (e) => {
		const file = e.target.files[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (event) => {
			try {
				const count = importTemplates(event.target.result, true);
				updateTemplatesList();
				showSuccess(`Imported ${count} template(s)!`);
			} catch (err) {
				handleError("Failed to import templates: " + err.message);
			}
		};
		reader.readAsText(file);
		e.target.value = ""; // Reset file input
	});

	// ================== Print History ==================

	// Clear history button
	$("#btnClearHistory")?.addEventListener("click", () => {
		if (confirm("Clear all print history?")) {
			clearHistory();
			updatePrintHistory();
			showSuccess("Print history cleared");
		}
	});

	// ================== Printer Status ==================

	// Refresh status button
	$("#btnRefreshStatus")?.addEventListener("click", async () => {
		if (state.connected) {
			await printerStatus.queryAllStatus();
			updateStatusDisplay();
		}
	});

	// Status event listeners
	printerStatus.on(StatusEventType.BATTERY, updateStatusDisplay);
	printerStatus.on(StatusEventType.PAPER, updateStatusDisplay);
	printerStatus.on(StatusEventType.COVER, updateStatusDisplay);

	// ================== Initialize ==================

	// Setup keyboard shortcuts
	setupKeyboardShortcuts();

	// Load saved settings
	const settings = getSettings();
	if (settings.defaultPrinter) {
		$("#printerModel").value = settings.defaultPrinter;
	}

	// Initialize display
	updateLabelSize(canvas);
	updateCanvasText(canvas);
	updatePrinterSettings(PrinterModel.D30);
	updateTemplatesList();
	updatePrintHistory();
});

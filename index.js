"use strict";

import { drawText } from "https://cdn.jsdelivr.net/npm/canvas-txt@4.1.1/+esm";
import { printCanvas } from "./src/printer.js";

const $ = document.querySelector.bind(document);
const $all = document.querySelectorAll.bind(document);

const labelSize = { width: 40, height: 12 };

const updateLabelSize = (canvas) => {
	const inputWidth = $("#inputWidth").valueAsNumber;
	const inputHeight = $("#inputHeight").valueAsNumber;
	if (isNaN(inputWidth) || isNaN(inputHeight)) {
		handleError("label size invalid");
		return;
	}

	labelSize.width = inputWidth;
	labelSize.height = inputHeight;

	// Image sent to printer is printed top to bottom, so reverse width and height
	canvas.width = labelSize.height * 8;
	canvas.height = labelSize.width * 8;
};

const updateCanvasText = (canvas) => {
	const text = $("#inputText").value;
	const fontSize = $("#inputFontSize").valueAsNumber;
	if (isNaN(fontSize)) {
		handleError("font size invalid");
		return;
	}

	const ctx = canvas.getContext("2d");
	ctx.fillStyle = "#fff";
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	ctx.translate(canvas.width / 2, canvas.height / 2);
	ctx.rotate(Math.PI / 2);

	ctx.fillStyle = "#000";
	ctx.textAlign = "center";
	ctx.textBaseline = "top";
	drawText(ctx, text, {
		x: -canvas.height / 2,
		y: -canvas.width / 2,
		width: canvas.height,
		height: canvas.width,
		font: "sans-serif",
		fontSize,
	});

	ctx.rotate(-Math.PI / 2);
	ctx.translate(-canvas.width / 2, -canvas.height / 2);
};

const updateCanvasBarcode = (canvas) => {
	const barcodeData = $("#inputBarcode").value;
	const image = document.createElement("img");
	image.addEventListener("load", () => {
		const ctx = canvas.getContext("2d");
		ctx.fillStyle = "#fff";
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		ctx.translate(canvas.width / 2, canvas.height / 2);
		ctx.rotate(Math.PI / 2);

		ctx.imageSmoothingEnabled = false;
		ctx.drawImage(image, -image.width / 2, -image.height / 2);

		ctx.rotate(-Math.PI / 2);
		ctx.translate(-canvas.width / 2, -canvas.height / 2);
	});

	JsBarcode(image, barcodeData, {
		format: "CODE128",
		width: 2,
		height: labelSize.height * 7,
		displayValue: false,
	});
};

const drawImageToCanvas = (ctx, url, doScale = true) => {
	const img = new Image();
	img.addEventListener("load", () => {
		ctx.fillStyle = "#fff";
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		ctx.translate(canvas.width / 2, canvas.height / 2);
		ctx.rotate(Math.PI / 2);

		ctx.imageSmoothingEnabled = false;
		// draw image in center of canvas, scaled to fit
		const scale = doScale ? Math.min(canvas.height / img.width, canvas.width / img.height) : 1;
		const drawWidth = img.width * scale;
		const drawHeight = img.height * scale;
		ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

		ctx.rotate(-Math.PI / 2);
		ctx.translate(-canvas.width / 2, -canvas.height / 2);
	});
	img.addEventListener("error", () => {
		handleError("failed to load image");
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
		drawImageToCanvas(ctx, e.target.result);
	});
	reader.addEventListener("error", () => {
		handleError("failed to read image file");
	});

	reader.readAsDataURL(file);
};

const updateCanvasQR = async (canvas) => {
	const data = $("#inputQR").value;
	const ctx = canvas.getContext("2d");
	const qrImg = await QRCode.toDataURL(data, { width: canvas.width - 8, margin: 2 });
	drawImageToCanvas(ctx, qrImg, false);
};

/**
 * Get filament data from form inputs
 * @returns {Object} Filament data object
 */
const getFilamentData = () => ({
	brand: $("#inputFilamentBrand").value.trim(),
	material: $("#inputFilamentMaterial").value.trim(),
	color: $("#inputFilamentColor").value.trim(),
	name: $("#inputFilamentName").value.trim(),
	nozzleTemp: $("#inputFilamentNozzle").value.trim(),
	bedTemp: $("#inputFilamentBed").value.trim(),
	notes: $("#inputFilamentNotes").value.trim(),
});

/**
 * Get the selected label template
 * @returns {string} Template name
 */
const getSelectedTemplate = () => {
	const selected = document.querySelector('input[name="labelTemplate"]:checked');
	return selected ? selected.value : "compact";
};

/**
 * Render filament label on canvas using the compact template
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} data Filament data
 * @param {number} width Canvas logical width (after rotation)
 * @param {number} height Canvas logical height (after rotation)
 */
const renderCompactTemplate = (ctx, data, width, height) => {
	const padding = 4;
	const availWidth = width - padding * 2;
	const availHeight = height - padding * 2;

	// Main text: Material + Color (e.g., "PLA Black")
	const mainText = [data.material, data.color].filter(Boolean).join(" ") || "Filament";
	const mainFontSize = Math.min(36, availHeight * 0.35);
	ctx.font = `bold ${mainFontSize}px sans-serif`;
	ctx.fillText(mainText, padding, padding + mainFontSize * 0.85, availWidth);

	// Brand line
	if (data.brand) {
		const brandFontSize = Math.min(20, availHeight * 0.2);
		ctx.font = `${brandFontSize}px sans-serif`;
		ctx.fillText(data.brand, padding, padding + mainFontSize + brandFontSize * 0.9, availWidth);
	}

	// Temperature info on bottom
	const temps = [];
	if (data.nozzleTemp) temps.push(`🔥${data.nozzleTemp}°C`);
	if (data.bedTemp) temps.push(`🛏️${data.bedTemp}°C`);
	if (temps.length > 0) {
		const tempFontSize = Math.min(18, availHeight * 0.18);
		ctx.font = `${tempFontSize}px sans-serif`;
		ctx.fillText(temps.join("  "), padding, height - padding - 2, availWidth);
	}
};

/**
 * Render filament label on canvas using the detailed template
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} data Filament data
 * @param {number} width Canvas logical width (after rotation)
 * @param {number} height Canvas logical height (after rotation)
 */
const renderDetailedTemplate = (ctx, data, width, height) => {
	const padding = 4;
	const lineHeight = height / 5;
	let y = padding;

	// Line 1: Brand
	if (data.brand) {
		const fontSize = Math.min(22, lineHeight * 0.9);
		ctx.font = `bold ${fontSize}px sans-serif`;
		ctx.fillText(data.brand, padding, y + fontSize * 0.85, width - padding * 2);
		y += lineHeight;
	}

	// Line 2: Material
	if (data.material) {
		const fontSize = Math.min(28, lineHeight * 1.1);
		ctx.font = `bold ${fontSize}px sans-serif`;
		ctx.fillText(data.material, padding, y + fontSize * 0.85, width - padding * 2);
		y += lineHeight;
	}

	// Line 3: Color/Name
	const colorName = data.name || data.color;
	if (colorName) {
		const fontSize = Math.min(20, lineHeight * 0.85);
		ctx.font = `${fontSize}px sans-serif`;
		ctx.fillText(colorName, padding, y + fontSize * 0.85, width - padding * 2);
		y += lineHeight;
	}

	// Line 4: Temps
	const tempParts = [];
	if (data.nozzleTemp) tempParts.push(`Nozzle: ${data.nozzleTemp}°C`);
	if (data.bedTemp) tempParts.push(`Bed: ${data.bedTemp}°C`);
	if (tempParts.length > 0) {
		const fontSize = Math.min(16, lineHeight * 0.7);
		ctx.font = `${fontSize}px sans-serif`;
		ctx.fillText(tempParts.join(" | "), padding, y + fontSize * 0.85, width - padding * 2);
		y += lineHeight;
	}

	// Line 5: Notes
	if (data.notes) {
		const fontSize = Math.min(14, lineHeight * 0.6);
		ctx.font = `italic ${fontSize}px sans-serif`;
		ctx.fillText(data.notes, padding, y + fontSize * 0.85, width - padding * 2);
	}
};

/**
 * Render filament label on canvas using the minimal template
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} data Filament data
 * @param {number} width Canvas logical width (after rotation)
 * @param {number} height Canvas logical height (after rotation)
 */
const renderMinimalTemplate = (ctx, data, width, height) => {
	const padding = 6;

	// Single large text: Material + Color
	const mainText = [data.material, data.color].filter(Boolean).join("\n") || "Filament";
	const fontSize = Math.min(42, height * 0.4);
	ctx.font = `bold ${fontSize}px sans-serif`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";

	// Handle multi-line text
	const lines = mainText.split("\n");
	const totalHeight = lines.length * fontSize * 1.1;
	let startY = (height - totalHeight) / 2 + fontSize * 0.5;

	lines.forEach((line) => {
		ctx.fillText(line, width / 2, startY, width - padding * 2);
		startY += fontSize * 1.1;
	});
};

/**
 * Update canvas with filament label
 * @param {HTMLCanvasElement} canvas
 */
const updateCanvasFilament = (canvas) => {
	const ctx = canvas.getContext("2d");
	const data = getFilamentData();
	const template = getSelectedTemplate();

	// Clear canvas with white background
	ctx.fillStyle = "#fff";
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	// Save context state
	ctx.save();

	// Rotate for proper label orientation (same as other label types)
	ctx.translate(canvas.width / 2, canvas.height / 2);
	ctx.rotate(Math.PI / 2);

	// After rotation, the effective dimensions are swapped
	const effectiveWidth = canvas.height;
	const effectiveHeight = canvas.width;

	// Move origin to top-left of rotated space
	ctx.translate(-effectiveWidth / 2, -effectiveHeight / 2);

	// Set default text properties
	ctx.fillStyle = "#000";
	ctx.textAlign = "left";
	ctx.textBaseline = "top";

	// Render based on template
	switch (template) {
		case "detailed":
			renderDetailedTemplate(ctx, data, effectiveWidth, effectiveHeight);
			break;
		case "minimal":
			renderMinimalTemplate(ctx, data, effectiveWidth, effectiveHeight);
			break;
		case "compact":
		default:
			renderCompactTemplate(ctx, data, effectiveWidth, effectiveHeight);
			break;
	}

	// Restore context state
	ctx.restore();
};

/**
 * Parse filament data from URL parameters
 * @returns {Object|null} Parsed filament data or null
 */
const parseFilamentFromURL = () => {
	const params = new URLSearchParams(window.location.search);
	const filamentParam = params.get("filament");
	if (!filamentParam) return null;

	try {
		return JSON.parse(filamentParam);
	} catch {
		console.error("Failed to parse filament data from URL");
		return null;
	}
};

/**
 * Populate filament form fields with data
 * @param {Object} data Filament data object
 */
const populateFilamentForm = (data) => {
	if (data.brand) $("#inputFilamentBrand").value = data.brand;
	if (data.material) $("#inputFilamentMaterial").value = data.material;
	if (data.color) $("#inputFilamentColor").value = data.color;
	if (data.name) $("#inputFilamentName").value = data.name;
	if (data.nozzleTemp) $("#inputFilamentNozzle").value = data.nozzleTemp;
	if (data.bedTemp) $("#inputFilamentBed").value = data.bedTemp;
	if (data.notes) $("#inputFilamentNotes").value = data.notes;
};

const handleError = (err) => {
	console.error(err);

	const toast = bootstrap.Toast.getOrCreateInstance($("#errorToast"));
	$("#errorText").textContent = err.toString();
	toast.show();
};

document.addEventListener("DOMContentLoaded", function () {
	const canvas = document.querySelector("#canvas");

	document.addEventListener("shown.bs.tab", (e) => {
		if (e.target.id === "nav-text-tab") updateCanvasText(canvas);
		else if (e.target.id === "nav-barcode-tab") updateCanvasBarcode(canvas);
		else if (e.target.id === "nav-image-tab") updateCanvasImage(canvas);
		else if (e.target.id === "nav-qr-tab") updateCanvasQR(canvas);
		else if (e.target.id === "nav-filament-tab") updateCanvasFilament(canvas);
	});

	$all("#inputWidth, #inputHeight").forEach((e) =>
		e.addEventListener("input", () => updateLabelSize(canvas)),
	);
	updateLabelSize(canvas);

	$all("#inputText, #inputFontSize").forEach((e) =>
		e.addEventListener("input", () => updateCanvasText(canvas)),
	);
	updateCanvasText(canvas);

	$("#inputBarcode").addEventListener("input", () => updateCanvasBarcode(canvas));
	$("#inputImage").addEventListener("change", () => updateCanvasImage(canvas));
	$("#inputQR").addEventListener("input", () => updateCanvasQR(canvas));

	// Filament label event listeners
	$all(
		"#inputFilamentBrand, #inputFilamentMaterial, #inputFilamentColor, #inputFilamentName, #inputFilamentNozzle, #inputFilamentBed, #inputFilamentNotes",
	).forEach((e) => e.addEventListener("input", () => updateCanvasFilament(canvas)));

	$all('input[name="labelTemplate"]').forEach((e) =>
		e.addEventListener("change", () => updateCanvasFilament(canvas)),
	);

	// Check for filament data in URL parameters (from bookmarklet)
	const filamentData = parseFilamentFromURL();
	if (filamentData) {
		populateFilamentForm(filamentData);
		// Switch to filament tab
		const filamentTab = document.querySelector("#nav-filament-tab");
		if (filamentTab) {
			const tab = new bootstrap.Tab(filamentTab);
			tab.show();
		}
		// Update canvas after a short delay to ensure tab is visible
		setTimeout(() => updateCanvasFilament(canvas), 100);
	}

	$("form").addEventListener("submit", (e) => {
		e.preventDefault();
		navigator.bluetooth
			.requestDevice({
				acceptAllDevices: true,
				optionalServices: ["0000ff00-0000-1000-8000-00805f9b34fb"],
			})
			.then((device) => device.gatt.connect())
			.then((server) => server.getPrimaryService("0000ff00-0000-1000-8000-00805f9b34fb"))
			.then((service) => service.getCharacteristic("0000ff02-0000-1000-8000-00805f9b34fb"))
			.then((char) => printCanvas(char, canvas))
			.catch(handleError);
	});
});

/**
 * Canvas Editor for Drawing and Editing Labels
 * Provides basic drawing tools for creating custom labels
 */

export class CanvasEditor {
	constructor(canvas) {
		this.canvas = canvas;
		this.ctx = canvas.getContext("2d");
		this.isDrawing = false;
		this.tool = "pen"; // pen, eraser, line, rectangle, circle, text
		this.color = "#000000";
		this.lineWidth = 2;
		this.lastX = 0;
		this.lastY = 0;
		this.startX = 0;
		this.startY = 0;
		this.history = [];
		this.historyIndex = -1;
		this.maxHistory = 50;

		// Shape preview canvas
		this.previewCanvas = document.createElement("canvas");
		this.previewCtx = this.previewCanvas.getContext("2d");

		this.setupEvents();
		this.saveState();
	}

	setupEvents() {
		this.canvas.addEventListener("mousedown", this.handleMouseDown.bind(this));
		this.canvas.addEventListener("mousemove", this.handleMouseMove.bind(this));
		this.canvas.addEventListener("mouseup", this.handleMouseUp.bind(this));
		this.canvas.addEventListener("mouseleave", this.handleMouseUp.bind(this));

		// Touch support
		this.canvas.addEventListener("touchstart", this.handleTouchStart.bind(this));
		this.canvas.addEventListener("touchmove", this.handleTouchMove.bind(this));
		this.canvas.addEventListener("touchend", this.handleTouchEnd.bind(this));
	}

	// ================== Event Handlers ==================

	handleMouseDown(e) {
		const rect = this.canvas.getBoundingClientRect();
		const scaleX = this.canvas.width / rect.width;
		const scaleY = this.canvas.height / rect.height;

		this.startX = (e.clientX - rect.left) * scaleX;
		this.startY = (e.clientY - rect.top) * scaleY;
		this.lastX = this.startX;
		this.lastY = this.startY;
		this.isDrawing = true;

		if (this.tool === "pen" || this.tool === "eraser") {
			this.ctx.beginPath();
			this.ctx.moveTo(this.startX, this.startY);
		}

		// Save canvas state for shape preview
		if (["line", "rectangle", "circle"].includes(this.tool)) {
			this.previewCanvas.width = this.canvas.width;
			this.previewCanvas.height = this.canvas.height;
			this.previewCtx.drawImage(this.canvas, 0, 0);
		}
	}

	handleMouseMove(e) {
		if (!this.isDrawing) return;

		const rect = this.canvas.getBoundingClientRect();
		const scaleX = this.canvas.width / rect.width;
		const scaleY = this.canvas.height / rect.height;

		const x = (e.clientX - rect.left) * scaleX;
		const y = (e.clientY - rect.top) * scaleY;

		switch (this.tool) {
			case "pen":
				this.drawLine(this.lastX, this.lastY, x, y);
				break;
			case "eraser":
				this.erase(x, y);
				break;
			case "line":
			case "rectangle":
			case "circle":
				this.previewShape(x, y);
				break;
		}

		this.lastX = x;
		this.lastY = y;
	}

	handleMouseUp(e) {
		if (!this.isDrawing) return;

		if (["line", "rectangle", "circle"].includes(this.tool)) {
			const rect = this.canvas.getBoundingClientRect();
			const scaleX = this.canvas.width / rect.width;
			const scaleY = this.canvas.height / rect.height;

			const x = (e.clientX - rect.left) * scaleX;
			const y = (e.clientY - rect.top) * scaleY;

			this.drawShape(x, y);
		}

		this.isDrawing = false;
		this.saveState();
	}

	handleTouchStart(e) {
		e.preventDefault();
		const touch = e.touches[0];
		const mouseEvent = new MouseEvent("mousedown", {
			clientX: touch.clientX,
			clientY: touch.clientY,
		});
		this.handleMouseDown(mouseEvent);
	}

	handleTouchMove(e) {
		e.preventDefault();
		const touch = e.touches[0];
		const mouseEvent = new MouseEvent("mousemove", {
			clientX: touch.clientX,
			clientY: touch.clientY,
		});
		this.handleMouseMove(mouseEvent);
	}

	handleTouchEnd(e) {
		e.preventDefault();
		const mouseEvent = new MouseEvent("mouseup", {});
		this.handleMouseUp(mouseEvent);
	}

	// ================== Drawing Functions ==================

	drawLine(x1, y1, x2, y2) {
		this.ctx.strokeStyle = this.color;
		this.ctx.lineWidth = this.lineWidth;
		this.ctx.lineCap = "round";
		this.ctx.lineJoin = "round";

		this.ctx.lineTo(x2, y2);
		this.ctx.stroke();
	}

	erase(x, y) {
		const size = this.lineWidth * 5;
		this.ctx.fillStyle = "#ffffff";
		this.ctx.beginPath();
		this.ctx.arc(x, y, size, 0, Math.PI * 2);
		this.ctx.fill();
	}

	previewShape(endX, endY) {
		// Restore original canvas state
		this.ctx.drawImage(this.previewCanvas, 0, 0);

		// Draw shape preview
		this.ctx.strokeStyle = this.color;
		this.ctx.lineWidth = this.lineWidth;

		switch (this.tool) {
			case "line":
				this.ctx.beginPath();
				this.ctx.moveTo(this.startX, this.startY);
				this.ctx.lineTo(endX, endY);
				this.ctx.stroke();
				break;
			case "rectangle":
				this.ctx.strokeRect(this.startX, this.startY, endX - this.startX, endY - this.startY);
				break;
			case "circle":
				const radius = Math.sqrt(Math.pow(endX - this.startX, 2) + Math.pow(endY - this.startY, 2));
				this.ctx.beginPath();
				this.ctx.arc(this.startX, this.startY, radius, 0, Math.PI * 2);
				this.ctx.stroke();
				break;
		}
	}

	drawShape(endX, endY) {
		// Restore and commit the shape
		this.ctx.drawImage(this.previewCanvas, 0, 0);

		this.ctx.strokeStyle = this.color;
		this.ctx.lineWidth = this.lineWidth;

		switch (this.tool) {
			case "line":
				this.ctx.beginPath();
				this.ctx.moveTo(this.startX, this.startY);
				this.ctx.lineTo(endX, endY);
				this.ctx.stroke();
				break;
			case "rectangle":
				this.ctx.strokeRect(this.startX, this.startY, endX - this.startX, endY - this.startY);
				break;
			case "circle":
				const radius = Math.sqrt(Math.pow(endX - this.startX, 2) + Math.pow(endY - this.startY, 2));
				this.ctx.beginPath();
				this.ctx.arc(this.startX, this.startY, radius, 0, Math.PI * 2);
				this.ctx.stroke();
				break;
		}
	}

	addText(text, x, y, fontSize = 16) {
		this.ctx.fillStyle = this.color;
		this.ctx.font = `${fontSize}px sans-serif`;
		this.ctx.fillText(text, x, y);
		this.saveState();
	}

	// ================== Tool Settings ==================

	setTool(tool) {
		this.tool = tool;
	}

	setColor(color) {
		this.color = color;
	}

	setLineWidth(width) {
		this.lineWidth = width;
	}

	// ================== History (Undo/Redo) ==================

	saveState() {
		// Remove any redo history
		this.history = this.history.slice(0, this.historyIndex + 1);

		// Save current state
		const imageData = this.canvas.toDataURL();
		this.history.push(imageData);

		// Limit history size
		if (this.history.length > this.maxHistory) {
			this.history.shift();
		} else {
			this.historyIndex++;
		}
	}

	undo() {
		if (this.historyIndex > 0) {
			this.historyIndex--;
			this.restoreState(this.history[this.historyIndex]);
		}
	}

	redo() {
		if (this.historyIndex < this.history.length - 1) {
			this.historyIndex++;
			this.restoreState(this.history[this.historyIndex]);
		}
	}

	restoreState(dataUrl) {
		const img = new Image();
		img.onload = () => {
			this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
			this.ctx.drawImage(img, 0, 0);
		};
		img.src = dataUrl;
	}

	// ================== Canvas Operations ==================

	clear() {
		this.ctx.fillStyle = "#ffffff";
		this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
		this.saveState();
	}

	fill(color) {
		this.ctx.fillStyle = color;
		this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
		this.saveState();
	}

	invert() {
		const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
		const data = imageData.data;

		for (let i = 0; i < data.length; i += 4) {
			data[i] = 255 - data[i]; // R
			data[i + 1] = 255 - data[i + 1]; // G
			data[i + 2] = 255 - data[i + 2]; // B
		}

		this.ctx.putImageData(imageData, 0, 0);
		this.saveState();
	}

	rotate(degrees) {
		const tempCanvas = document.createElement("canvas");
		const tempCtx = tempCanvas.getContext("2d");

		if (degrees === 90 || degrees === -90 || degrees === 270) {
			tempCanvas.width = this.canvas.height;
			tempCanvas.height = this.canvas.width;
		} else {
			tempCanvas.width = this.canvas.width;
			tempCanvas.height = this.canvas.height;
		}

		tempCtx.save();
		tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
		tempCtx.rotate((degrees * Math.PI) / 180);
		tempCtx.drawImage(this.canvas, -this.canvas.width / 2, -this.canvas.height / 2);
		tempCtx.restore();

		// Resize canvas if needed
		if (degrees === 90 || degrees === -90 || degrees === 270) {
			const oldWidth = this.canvas.width;
			this.canvas.width = this.canvas.height;
			this.canvas.height = oldWidth;
		}

		this.ctx.drawImage(tempCanvas, 0, 0);
		this.saveState();
	}

	flipHorizontal() {
		const tempCanvas = document.createElement("canvas");
		tempCanvas.width = this.canvas.width;
		tempCanvas.height = this.canvas.height;
		const tempCtx = tempCanvas.getContext("2d");

		tempCtx.translate(this.canvas.width, 0);
		tempCtx.scale(-1, 1);
		tempCtx.drawImage(this.canvas, 0, 0);

		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.ctx.drawImage(tempCanvas, 0, 0);
		this.saveState();
	}

	flipVertical() {
		const tempCanvas = document.createElement("canvas");
		tempCanvas.width = this.canvas.width;
		tempCanvas.height = this.canvas.height;
		const tempCtx = tempCanvas.getContext("2d");

		tempCtx.translate(0, this.canvas.height);
		tempCtx.scale(1, -1);
		tempCtx.drawImage(this.canvas, 0, 0);

		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.ctx.drawImage(tempCanvas, 0, 0);
		this.saveState();
	}

	// ================== Export ==================

	toDataURL(type = "image/png") {
		return this.canvas.toDataURL(type);
	}

	toBlob(callback, type = "image/png") {
		this.canvas.toBlob(callback, type);
	}
}

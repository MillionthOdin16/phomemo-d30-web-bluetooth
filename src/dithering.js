/**
 * Dithering Algorithms for Thermal Printing
 * Ported from SaschaLucius/node-phomemo-printer
 * These algorithms convert grayscale images to black & white
 * suitable for thermal printers
 */

export const DitheringAlgorithm = {
	THRESHOLD: "threshold",
	FLOYD_STEINBERG: "floydSteinberg",
	ATKINSON: "atkinson",
	ORDERED_BAYER: "orderedBayer",
	BURKES: "burkes",
	SIERRA2: "sierra2",
	JARVIS_JUDICE_NINKE: "jarvisJudiceNinke",
	STUCKI: "stucki",
	RANDOM: "random",
	NONE: "none",
};

export const DitheringInfo = {
	[DitheringAlgorithm.THRESHOLD]: {
		name: "Simple Threshold",
		description: "Basic black/white conversion using a threshold value",
	},
	[DitheringAlgorithm.FLOYD_STEINBERG]: {
		name: "Floyd-Steinberg",
		description: "Classic error-diffusion dithering with good quality",
	},
	[DitheringAlgorithm.ATKINSON]: {
		name: "Atkinson",
		description: "Lighter dithering, good for text and line art",
	},
	[DitheringAlgorithm.ORDERED_BAYER]: {
		name: "Ordered (Bayer)",
		description: "Pattern-based dithering, creates a crosshatch effect",
	},
	[DitheringAlgorithm.BURKES]: {
		name: "Burkes",
		description: "Similar to Floyd-Steinberg with different weights",
	},
	[DitheringAlgorithm.SIERRA2]: {
		name: "Sierra-2",
		description: "Two-row Sierra, good balance of speed and quality",
	},
	[DitheringAlgorithm.JARVIS_JUDICE_NINKE]: {
		name: "Jarvis-Judice-Ninke",
		description: "High quality error diffusion, slower but smoother",
	},
	[DitheringAlgorithm.STUCKI]: {
		name: "Stucki",
		description: "Modified Jarvis with sharper results",
	},
	[DitheringAlgorithm.RANDOM]: {
		name: "Random",
		description: "Random threshold per pixel, creates noise effect",
	},
	[DitheringAlgorithm.NONE]: {
		name: "None",
		description: "No dithering, use for already processed images",
	},
};

/**
 * Apply dithering to image data
 * @param {ImageData} imageData - Canvas ImageData object
 * @param {string} algorithm - Dithering algorithm to use
 * @param {number} threshold - Threshold value (0-255, default 128)
 * @returns {ImageData} - Modified image data
 */
export const applyDithering = (imageData, algorithm, threshold = 128) => {
	// First convert to grayscale
	toGrayscale(imageData);

	switch (algorithm) {
		case DitheringAlgorithm.THRESHOLD:
			return thresholdDither(imageData, threshold);
		case DitheringAlgorithm.FLOYD_STEINBERG:
			return floydSteinberg(imageData);
		case DitheringAlgorithm.ATKINSON:
			return atkinson(imageData);
		case DitheringAlgorithm.ORDERED_BAYER:
			return orderedBayer(imageData);
		case DitheringAlgorithm.BURKES:
			return burkes(imageData);
		case DitheringAlgorithm.SIERRA2:
			return sierra2(imageData);
		case DitheringAlgorithm.JARVIS_JUDICE_NINKE:
			return jarvisJudiceNinke(imageData);
		case DitheringAlgorithm.STUCKI:
			return stucki(imageData);
		case DitheringAlgorithm.RANDOM:
			return randomDither(imageData);
		case DitheringAlgorithm.NONE:
		default:
			return imageData;
	}
};

/**
 * Convert image to grayscale
 */
const toGrayscale = (imageData) => {
	const data = imageData.data;
	for (let i = 0; i < data.length; i += 4) {
		const lum = Math.floor(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
		data[i] = data[i + 1] = data[i + 2] = lum;
	}
};

/**
 * Simple threshold dithering
 */
const thresholdDither = (imageData, threshold = 128) => {
	const data = imageData.data;
	for (let i = 0; i < data.length; i += 4) {
		const newPixel = data[i] < threshold ? 0 : 255;
		data[i] = data[i + 1] = data[i + 2] = newPixel;
	}
	return imageData;
};

/**
 * Add error to neighboring pixel
 */
const addError = (data, width, height, x, y, error, factor) => {
	if (x < 0 || x >= width || y < 0 || y >= height) return;
	const idx = (y * width + x) * 4;
	let newVal = data[idx] + error * factor;
	newVal = Math.max(0, Math.min(255, newVal));
	data[idx] = data[idx + 1] = data[idx + 2] = newVal;
};

/**
 * Generic error diffusion function
 */
const errorDiffusion = (imageData, kernel, divisor) => {
	const { width, height, data } = imageData;
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const idx = (y * width + x) * 4;
			const oldPixel = data[idx];
			const newPixel = oldPixel < 128 ? 0 : 255;
			const error = oldPixel - newPixel;
			data[idx] = data[idx + 1] = data[idx + 2] = newPixel;
			for (const [dx, dy, weight] of kernel) {
				addError(data, width, height, x + dx, y + dy, error, weight / divisor);
			}
		}
	}
	return imageData;
};

/**
 * Floyd-Steinberg dithering
 */
const floydSteinberg = (imageData) => {
	return errorDiffusion(
		imageData,
		[
			[1, 0, 7],
			[-1, 1, 3],
			[0, 1, 5],
			[1, 1, 1],
		],
		16
	);
};

/**
 * Atkinson dithering
 */
const atkinson = (imageData) => {
	return errorDiffusion(
		imageData,
		[
			[1, 0, 1],
			[2, 0, 1],
			[-1, 1, 1],
			[0, 1, 1],
			[1, 1, 1],
			[0, 2, 1],
		],
		8
	);
};

/**
 * Ordered Bayer dithering
 */
const orderedBayer = (imageData) => {
	const { width, height, data } = imageData;
	const bayerMatrix = [
		[0, 8, 2, 10],
		[12, 4, 14, 6],
		[3, 11, 1, 9],
		[15, 7, 13, 5],
	];
	const matrixSize = 4;
	const scale = 255 / (matrixSize * matrixSize);

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const idx = (y * width + x) * 4;
			const threshold = (bayerMatrix[y % matrixSize][x % matrixSize] + 0.5) * scale;
			const newPixel = data[idx] < threshold ? 0 : 255;
			data[idx] = data[idx + 1] = data[idx + 2] = newPixel;
		}
	}
	return imageData;
};

/**
 * Burkes dithering
 */
const burkes = (imageData) => {
	return errorDiffusion(
		imageData,
		[
			[1, 0, 8],
			[2, 0, 4],
			[-2, 1, 2],
			[-1, 1, 4],
			[0, 1, 8],
			[1, 1, 4],
			[2, 1, 2],
		],
		32
	);
};

/**
 * Sierra-2 dithering
 */
const sierra2 = (imageData) => {
	return errorDiffusion(
		imageData,
		[
			[1, 0, 4],
			[2, 0, 3],
			[-2, 1, 1],
			[-1, 1, 2],
			[0, 1, 3],
			[1, 1, 2],
			[2, 1, 1],
		],
		16
	);
};

/**
 * Jarvis-Judice-Ninke dithering
 */
const jarvisJudiceNinke = (imageData) => {
	return errorDiffusion(
		imageData,
		[
			[1, 0, 7],
			[2, 0, 5],
			[-2, 1, 3],
			[-1, 1, 5],
			[0, 1, 7],
			[1, 1, 5],
			[2, 1, 3],
			[-2, 2, 1],
			[-1, 2, 3],
			[0, 2, 5],
			[1, 2, 3],
			[2, 2, 1],
		],
		48
	);
};

/**
 * Stucki dithering
 */
const stucki = (imageData) => {
	return errorDiffusion(
		imageData,
		[
			[1, 0, 8],
			[2, 0, 4],
			[-2, 1, 2],
			[-1, 1, 4],
			[0, 1, 8],
			[1, 1, 4],
			[2, 1, 2],
			[-2, 2, 1],
			[-1, 2, 2],
			[0, 2, 4],
			[1, 2, 2],
			[2, 2, 1],
		],
		42
	);
};

/**
 * Random dithering
 */
const randomDither = (imageData) => {
	const data = imageData.data;
	for (let i = 0; i < data.length; i += 4) {
		const threshold = Math.random() * 255;
		const newPixel = data[i] < threshold ? 0 : 255;
		data[i] = data[i + 1] = data[i + 2] = newPixel;
	}
	return imageData;
};

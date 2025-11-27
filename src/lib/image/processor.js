
/**
 * Processes an image file (File object) or URL into a 1-bit monochrome Uint8Array
 * ready for the printer. Implements Floyd-Steinberg dithering.
 */
export async function processImageForPrinter(imageSource, targetWidth = 384) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      // 1. Calculate dimensions
      // Maintain aspect ratio
      const scale = targetWidth / img.width;
      const targetHeight = Math.floor(img.height * scale);

      // 2. Create Canvas
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');

      // Fill white background first (for transparency)
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      // Draw image
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      // 3. Get Pixel Data
      const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
      const data = imageData.data;

      // 4. Floyd-Steinberg Dithering
      const width = targetWidth;
      const height = targetHeight;

      // Convert to grayscale first for easier processing
      // We will modify 'data' in place, but we only care about one channel really
      // Or we can create a luminance array
      // Let's modify the alpha channel to store luminance or something, or just use R

      // Better: Create a 2D array for errors
      // But 1D array is faster

      const getPixelIndex = (x, y) => (y * width + x) * 4;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = getPixelIndex(x, y);
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          // Luminance
          const oldPixel = (r * 0.299 + g * 0.587 + b * 0.114);
          const newPixel = oldPixel < 128 ? 0 : 255;

          // Set pixel to black or white
          data[idx] = newPixel;
          data[idx + 1] = newPixel;
          data[idx + 2] = newPixel;

          const quantError = oldPixel - newPixel;

          // Distribute error
          if (x + 1 < width) {
             // Right
             distributeError(data, x + 1, y, quantError * 7 / 16, width);
          }
          if (x - 1 >= 0 && y + 1 < height) {
             // Bottom Left
             distributeError(data, x - 1, y + 1, quantError * 3 / 16, width);
          }
          if (y + 1 < height) {
             // Bottom
             distributeError(data, x, y + 1, quantError * 5 / 16, width);
          }
          if (x + 1 < width && y + 1 < height) {
             // Bottom Right
             distributeError(data, x + 1, y + 1, quantError * 1 / 16, width);
          }
        }
      }

      // 5. Pack Bits
      // Printer expects 1 bit per pixel. 0 = black, 1 = white?
      // Usually printers: 0 = white, 1 = black OR 0 = black, 1 = white.
      // Reference from printer.js:
      // return red + green + blue > 0 ? 0 : 1; -> >0 means white(255), so 0. Black(0) -> 1.
      // So Black = 1, White = 0.

      // However, check printer.js:
      // data[offset++] = getWhitePixel(...) * 128 ...
      // getWhitePixel returns 1 if white (sum > 0 ? 0 : 1 wait...)
      // original code: return red+green+blue > 0 ? 0 : 1;
      // If white (255+255+255 > 0) -> 0.
      // If black (0+0+0) -> 1.
      // So 1 = Black (print dot), 0 = White (no print).

      const packedData = new Uint8Array((width / 8) * height);
      let offset = 0;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x += 8) {
           let byte = 0;
           for (let bit = 0; bit < 8; bit++) {
              if (x + bit < width) {
                 const pxIdx = getPixelIndex(x + bit, y);
                 // We set black to 0 in previous loop, white to 255
                 // But we want Black = 1.
                 // So if data[pxIdx] == 0 (Black), bit is 1.
                 // If data[pxIdx] == 255 (White), bit is 0.

                 const isBlack = data[pxIdx] < 128;
                 if (isBlack) {
                    byte |= (1 << (7 - bit));
                 }
              }
           }
           packedData[offset++] = byte;
        }
      }

      resolve({
          packedData,
          previewUrl: canvas.toDataURL(), // For showing the user what it looks like
          height,
          width
      });
    };
    img.onerror = reject;

    if (typeof imageSource === 'string') {
        img.src = imageSource;
    } else if (imageSource instanceof File) {
        const reader = new FileReader();
        reader.onload = (e) => img.src = e.target.result;
        reader.readAsDataURL(imageSource);
    }
  });
}

function distributeError(data, x, y, error, width) {
    const idx = (y * width + x) * 4;
    // We assume grayscale so we just update R,G,B same way
    // But since we read luminance from R*... let's just update R
    // Actually we need to update all 3 because next iteration reads them
    const current = data[idx]; // r
    const newVal = current + error;
    data[idx] = newVal;
    data[idx+1] = newVal;
    data[idx+2] = newVal;
}

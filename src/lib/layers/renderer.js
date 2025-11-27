import React, { useRef, useEffect } from 'react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

/**
 * Renders a single layer onto a canvas context.
 */
export const renderLayer = async (ctx, layer) => {
    ctx.save();

    // Position and Rotation
    // Move to center of object to rotate, then draw
    const cx = layer.x + (layer.width / 2);
    const cy = layer.y + (layer.height || layer.fontSize) / 2; // rough center for text

    ctx.translate(layer.x, layer.y);
    if (layer.rotation) {
        // We need to rotate around center
        // Simplified: just rotate around top-left for now or implement center rotation properly
        // Let's do simple top-left for MVP stability, or fix it:
        // ctx.translate(width/2, height/2); ctx.rotate...
    }

    if (layer.type === 'text') {
        ctx.fillStyle = 'black';
        ctx.font = `${layer.fontSize}px ${layer.fontFamily}`;
        ctx.textBaseline = 'top';
        // Handle wrapping if we want advanced, but basic fillText for now
        ctx.fillText(layer.content, 0, 0);
    }
    else if (layer.type === 'image' && layer.src) {
        const img = new Image();
        img.src = layer.src;
        await img.decode();
        ctx.drawImage(img, 0, 0, layer.width, layer.height);
    }
    else if (layer.type === 'barcode') {
         if (layer.format === 'qr') {
             // Draw QR
             // We can use a temp canvas or generate data URL
             const qrUrl = await QRCode.toDataURL(layer.content, { margin: 0, width: layer.width });
             const img = new Image();
             img.src = qrUrl;
             await img.decode();
             ctx.drawImage(img, 0, 0, layer.width, layer.width); // QR is square
         } else {
             // Barcode
             const canvas = document.createElement('canvas');
             JsBarcode(canvas, layer.content, {
                 format: "CODE128",
                 displayValue: true,
                 width: 2,
                 height: layer.height,
                 margin: 0
             });
             ctx.drawImage(canvas, 0, 0, layer.width, layer.height);
         }
    }

    ctx.restore();
};

/**
 * Renders all layers to a canvas (for preview or printing)
 */
export const renderLabelToCanvas = async (canvas, layers, width, height) => {
    const ctx = canvas.getContext('2d');
    // Clear
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);

    for (const layer of layers) {
        await renderLayer(ctx, layer);
    }
};

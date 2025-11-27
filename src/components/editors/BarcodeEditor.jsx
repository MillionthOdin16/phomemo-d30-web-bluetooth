import React, { useState, useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { processImageForPrinter } from '../../lib/image/processor';

export default function BarcodeEditor({ onUpdate }) {
    const [type, setType] = useState('qr'); // 'qr' or 'code128'
    const [data, setData] = useState('12345678');
    const [labelHeight, setLabelHeight] = useState(96); // Default 12mm approx

    // Refs for canvas generation
    const canvasRef = useRef(null);

    useEffect(() => {
        generate();
    }, [type, data, labelHeight]);

    const generate = async () => {
        if (!data) return;

        const canvas = document.createElement('canvas');

        try {
            if (type === 'qr') {
                await QRCode.toCanvas(canvas, data, {
                    width: labelHeight,
                    margin: 2
                });
            } else {
                JsBarcode(canvas, data, {
                    format: "CODE128",
                    displayValue: true,
                    fontSize: 20,
                    height: 50,
                    width: 2,
                    margin: 0
                });
            }

            // Now we have the barcode on 'canvas'.
            // We need to fit it into our print width/height.
            // For QR code, it's square.
            // For Barcode, it's wide.

            // Let's rotate it if needed to fit the tape width (96px).
            // If it's a barcode, we usually want it printed "Along" the tape (so bars are perpendicular to tape direction? Or parallel?)
            // Usually barcode bars run parallel to tape length (so you scan across the tape width).
            // That means the "Height" of the bars is the Width of the tape.

            // Let's prepare the final image.
            // We want the output to be suitable for `processImageForPrinter`.
            // If barcode, we probably want to rotate it 90 degrees so it prints "along" the tape.

            const tempCanvas = document.createElement('canvas');
            const ctx = tempCanvas.getContext('2d');

            if (type === 'code128') {
                // Barcode generated horizontally.
                // We want to rotate 90 degrees so it prints vertically along the tape.
                // Generated canvas size:
                const w = canvas.width;
                const h = canvas.height;

                // New size (rotated)
                tempCanvas.width = h;
                tempCanvas.height = w;

                ctx.translate(h/2, w/2);
                ctx.rotate(-Math.PI/2);
                ctx.drawImage(canvas, -w/2, -h/2);
            } else {
                // QR Code
                tempCanvas.width = canvas.width;
                tempCanvas.height = canvas.height;
                ctx.drawImage(canvas, 0, 0);
            }

            const url = tempCanvas.toDataURL();
            const result = await processImageForPrinter(url, 96);
            onUpdate({ ...result, type: 'qr', name: type.toUpperCase() + ' Code' });

        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">Barcode & QR</h2>

            <div className="space-y-4">
                <div className="flex gap-4">
                    <button
                        onClick={() => setType('qr')}
                        className={`flex-1 py-2 rounded-lg border text-sm font-medium ${type === 'qr' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-gray-300'}`}
                    >
                        QR Code
                    </button>
                    <button
                        onClick={() => setType('code128')}
                        className={`flex-1 py-2 rounded-lg border text-sm font-medium ${type === 'code128' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-gray-300'}`}
                    >
                        Barcode
                    </button>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                    <input
                        type="text"
                        value={data}
                        onChange={(e) => setData(e.target.value)}
                        className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-3 border"
                    />
                </div>

                {type === 'code128' && (
                     <p className="text-xs text-gray-500">
                        Barcodes will be rotated to print along the tape length.
                     </p>
                )}
            </div>
        </div>
    );
}

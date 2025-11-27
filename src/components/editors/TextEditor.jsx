import React, { useState, useEffect } from 'react';
import { processImageForPrinter } from '../../lib/image/processor';

export default function TextEditor({ onUpdate }) {
    const [text, setText] = useState("Hello Phomemo");
    const [fontSize, setFontSize] = useState(48);
    const [align, setAlign] = useState('center');
    const [fontFamily, setFontFamily] = useState('sans-serif');

    useEffect(() => {
        generatePreview();
    }, [text, fontSize, align, fontFamily]);

    const generatePreview = async () => {
        // Create a canvas to draw text
        // D30 width is roughly 48mm or ~384 dots.
        // But users print along the tape.
        // Let's assume a "Label" height of some amount, or auto-expand.

        const canvas = document.createElement('canvas');
        // Let's set a fixed width for the "Print Head" (which is effectively height of the tape if rotated)
        // OR we treat it as infinite tape.
        // D30 is continuous or fixed length.

        // Let's draw to a canvas that represents the label.
        // Assuming 40mm x 12mm label (common D30).
        // 12mm height = ~96 dots. 40mm width = ~320 dots.
        // But the print head is the "12mm" part usually? No, D30 print head is wider.
        // D30 prints on max 12mm/15mm tape?
        // Phomemo D30 is a 15mm max width printer.
        // 15mm * 8 dots/mm = 120 dots.
        // Wait, 'polskafan' says 384 dots width?
        // Ah, looking at code: "width 96" in print_text.py.
        // "width, height = 288, 88"
        // Let's stick to a safe default of ~150px height (tape width) and variable width (tape length).

        // Actually, the D30 prints *along* the tape. The printhead is the width of the tape.
        // So width is fixed (e.g. 12mm = 96px). Length is variable.
        // But most implementations rotate it 90 degrees so you can print "Wide" text.

        const TAPE_WIDTH_PX = 96; // 12mm
        // We will draw "visually" then rotate if needed, or draw rotated.
        // Let's draw horizontally (Visual) then rotate for printer.

        // Calculate text size
        const ctx = canvas.getContext('2d');
        ctx.font = `${fontSize}px ${fontFamily}`;
        const metrics = ctx.measureText(text);
        const textWidth = Math.ceil(metrics.width);
        const textHeight = Math.ceil(fontSize * 1.2); // approx

        // Canvas size:
        // We want the output image to have a Height of TAPE_WIDTH_PX (to fit on tape).
        // And Width of whatever needed.
        // BUT, the processImageForPrinter expects to slice the 'width' as the printhead size?
        // Let's look at `PhomemoDriver.js`. It takes `width` as the printhead width.
        // If D30 printhead is 384 dots (48mm), then that's huge for D30 (which is a small label printer).
        // Maybe M02 is 384. D30 is smaller?
        // polskafan code: `width = 96`.
        // So D30 printhead is likely 96 dots (12mm).

        const PRINT_HEAD_WIDTH = 96;

        // So we need to generate an image that is W x H.
        // Since we want to print text "Reading left to right", and the tape comes out,
        // we usually print "Rotated 90 degrees" relative to the printhead if the tape is narrow.
        // Or we print along the tape.

        // Let's create a visual canvas first.
        const visualWidth = Math.max(textWidth + 20, 200);
        const visualHeight = PRINT_HEAD_WIDTH;

        canvas.width = visualWidth;
        canvas.height = visualHeight;

        const ctx2 = canvas.getContext('2d');
        ctx2.fillStyle = 'white';
        ctx2.fillRect(0,0, visualWidth, visualHeight);
        ctx2.fillStyle = 'black';
        ctx2.font = `${fontSize}px ${fontFamily}`;
        ctx2.textAlign = align;
        ctx2.textBaseline = 'middle';

        let x = visualWidth / 2;
        if (align === 'left') x = 10;
        if (align === 'right') x = visualWidth - 10;

        ctx2.fillText(text, x, visualHeight / 2);

        // Now pass this canvas URL to the processor
        // The processor will "dither" it.
        // However, the processor also handles "Resizing to target width".
        // If we want to print "Along the tape", we treat the image width as the print sequence length,
        // and image height as the printhead width?
        // No, standard bitmap printing:
        // You send Rows of Bytes.
        // The "Width" of the image = Width of Printhead.
        // So if we want to print text reading L->R, and tape comes out top->down,
        // text needs to be rotated 90 degrees?
        // Or if the printhead is 96px wide, and we send 96 bits, it prints one line.
        // If we want "Hello" along the tape, we generate a long image 96px Wide x N px High.

        // So `visualWidth` (length of text) should become the Height of the print data.
        // `visualHeight` (96px) should become the Width of the print data.
        // So we need to rotate.

        const rotatedCanvas = document.createElement('canvas');
        rotatedCanvas.width = visualHeight; // 96
        rotatedCanvas.height = visualWidth; // Length of text
        const ctxR = rotatedCanvas.getContext('2d');

        ctxR.fillStyle = 'white';
        ctxR.fillRect(0, 0, rotatedCanvas.width, rotatedCanvas.height);

        ctxR.translate(visualHeight / 2, visualWidth / 2);
        ctxR.rotate(-Math.PI / 2);
        ctxR.drawImage(canvas, -visualWidth / 2, -visualHeight / 2);

        const finalUrl = rotatedCanvas.toDataURL();

        // Now process
        const result = await processImageForPrinter(finalUrl, PRINT_HEAD_WIDTH);

        // We override the preview URL to show the "Visual" one (human readable)
        // instead of the rotated one (machine readable) for better UX?
        // Or show the rotated one to be accurate.
        // Let's show the rotated one for now to ensure we know what's printing.

        onUpdate({ ...result, type: 'text', name: text.substring(0, 20) });
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">Text Label</h2>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-3 border"
                        rows={3}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Font Size</label>
                        <input
                            type="number"
                            value={fontSize}
                            onChange={(e) => setFontSize(Number(e.target.value))}
                            className="w-full border-gray-300 rounded-lg shadow-sm p-2 border"
                        />
                    </div>
                    <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">Align</label>
                         <select
                            value={align}
                            onChange={(e) => setAlign(e.target.value)}
                            className="w-full border-gray-300 rounded-lg shadow-sm p-2 border"
                        >
                            <option value="left">Left</option>
                            <option value="center">Center</option>
                            <option value="right">Right</option>
                         </select>
                    </div>
                </div>
            </div>
        </div>
    );
}

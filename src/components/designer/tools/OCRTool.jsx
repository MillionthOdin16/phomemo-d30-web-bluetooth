import React, { useRef, useState } from 'react';
import { ScanLine, Loader2 } from 'lucide-react';
import Tesseract from 'tesseract.js';
import { LayerFactory } from '../../../lib/layers/factory';

export default function OCRTool({ onAddLayer }) {
    const [isScanning, setIsScanning] = useState(false);
    const inputRef = useRef(null);

    const handleFile = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsScanning(true);
        try {
            const { data: { text } } = await Tesseract.recognize(
                file,
                'eng',
                { logger: m => console.log(m) }
            );

            if (text.trim()) {
                const layer = LayerFactory.createText();
                layer.content = text.trim();
                layer.fontSize = 20; // Smaller font for captured text
                layer.width = 300;
                onAddLayer(layer);
            } else {
                alert("No text found in image");
            }
        } catch (err) {
            console.error(err);
            alert("OCR Failed");
        } finally {
            setIsScanning(false);
        }
    };

    return (
        <label className={`p-2 hover:bg-gray-100 rounded flex flex-col items-center text-xs gap-1 cursor-pointer ${isScanning ? 'opacity-50 pointer-events-none' : ''}`}>
            {isScanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <ScanLine className="w-5 h-5" />}
            {isScanning ? 'Scanning...' : 'Scan Text'}
            <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept="image/*"
                capture="environment"
                onChange={handleFile}
            />
        </label>
    );
}

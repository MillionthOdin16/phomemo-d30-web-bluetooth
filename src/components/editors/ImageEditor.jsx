import React, { useState, useRef, useEffect } from 'react';
import { Upload, RotateCw, Image as ImageIcon } from 'lucide-react';
import { processImageForPrinter } from '../../lib/image/processor';

export default function ImageEditor({ onUpdate }) {
    const [imageSrc, setImageSrc] = useState(null);
    const [rotation, setRotation] = useState(0);
    const [threshold, setThreshold] = useState(128);
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setImageSrc(ev.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    useEffect(() => {
        if (imageSrc) {
            process();
        }
    }, [imageSrc, rotation, threshold]);

    const process = async () => {
        // Here we would apply rotation/threshold before sending to processor
        // For now, let's just send the raw image source to processor
        // In a real app, we'd use a canvas here to rotate BEFORE sending to processor
        // or update processor to handle rotation.

        // Let's implement simple rotation via canvas here
        const img = new Image();
        img.src = imageSrc;
        await img.decode();

        const canvas = document.createElement('canvas');
        // Handle rotation dimensions
        if (rotation % 180 !== 0) {
            canvas.width = img.height;
            canvas.height = img.width;
        } else {
            canvas.width = img.width;
            canvas.height = img.height;
        }

        const ctx = canvas.getContext('2d');
        ctx.translate(canvas.width/2, canvas.height/2);
        ctx.rotate(rotation * Math.PI / 180);
        ctx.drawImage(img, -img.width/2, -img.height/2);

        const rotatedUrl = canvas.toDataURL();

        // D30 Width 96 usually.
        const result = await processImageForPrinter(rotatedUrl, 96);
        onUpdate({ ...result, type: 'image', name: 'Uploaded Image' });
    };

    return (
        <div className="space-y-6">
             <h2 className="text-2xl font-bold">Image Label</h2>

             {!imageSrc ? (
                 <div
                    onClick={() => fileInputRef.current.click()}
                    className="border-2 border-dashed border-gray-300 rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
                 >
                     <Upload className="w-12 h-12 text-gray-400 mb-2" />
                     <p className="text-gray-500 font-medium">Click to upload image</p>
                     <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                 </div>
             ) : (
                 <div className="space-y-4">
                     <div className="flex gap-2">
                        <button onClick={() => setRotation(r => r + 90)} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">
                            <RotateCw className="w-4 h-4" /> Rotate
                        </button>
                        <button onClick={() => {setImageSrc(null); onUpdate(null);}} className="px-4 py-2 text-red-600 hover:text-red-700 font-medium">
                            Clear
                        </button>
                     </div>

                     <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">Dithering Threshold (Simulated)</label>
                         <input
                            type="range" min="0" max="255"
                            value={threshold}
                            onChange={(e) => setThreshold(Number(e.target.value))}
                            className="w-full"
                         />
                         <p className="text-xs text-gray-500 mt-1">Adjusts how dark pixels need to be to print black.</p>
                     </div>
                 </div>
             )}
        </div>
    );
}

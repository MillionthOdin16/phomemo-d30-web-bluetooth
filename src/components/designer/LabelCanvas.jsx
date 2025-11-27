import React, { useState, useRef, useEffect } from 'react';
import { renderLabelToCanvas } from '../../lib/layers/renderer';

export default function LabelCanvas({ layers, width, height, onSelectLayer, selectedLayerId, onUpdateLayer }) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    useEffect(() => {
        if (canvasRef.current) {
            renderLabelToCanvas(canvasRef.current, layers, width, height);
        }
    }, [layers, width, height]);

    const handleMouseDown = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Simple hit testing (reverse order to select top-most)
        // This is very basic. For production we'd want proper bounding box checks.
        let clicked = null;
        for (let i = layers.length - 1; i >= 0; i--) {
            const l = layers[i];
            // Approx bounding box
            const w = l.width || (l.fontSize * l.content.length * 0.6); // Crude text width est
            const h = l.height || l.fontSize;
            if (x >= l.x && x <= l.x + w && y >= l.y && y <= l.y + h) {
                clicked = l;
                break;
            }
        }

        if (clicked) {
            onSelectLayer(clicked.id);
            setIsDragging(true);
            setDragStart({ x: x - clicked.x, y: y - clicked.y });
        } else {
            onSelectLayer(null);
        }
    };

    const handleMouseMove = (e) => {
        if (isDragging && selectedLayerId) {
            const rect = canvasRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            onUpdateLayer(selectedLayerId, {
                x: x - dragStart.x,
                y: y - dragStart.y
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    return (
        <div className="relative shadow-lg border-2 border-gray-300 bg-white" style={{ width, height }}>
            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className="cursor-crosshair w-full h-full"
            />
            {/* Selection Overlay (optional, could draw on canvas or overlay div) */}
        </div>
    );
}

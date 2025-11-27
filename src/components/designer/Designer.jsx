import React, { useState } from 'react';
import { Type, Image as ImageIcon, QrCode, Trash2, Save, Printer, LayoutTemplate } from 'lucide-react';
import LabelCanvas from './LabelCanvas';
import { LayerFactory } from '../../lib/layers/factory';
import { TEMPLATES } from '../../lib/templates';
import VoiceCommand from './tools/VoiceCommand';
import OCRTool from './tools/OCRTool';

export default function Designer({ onPrint, onSave }) {
    // Canvas State
    const [layers, setLayers] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [canvasSize, setCanvasSize] = useState({ width: 320, height: 150 }); // Default D30 label approx

    // Actions
    const addLayer = (layer) => {
        setLayers([...layers, layer]);
        setSelectedId(layer.id);
    };

    const updateLayer = (id, updates) => {
        setLayers(layers.map(l => l.id === id ? { ...l, ...updates } : l));
    };

    const deleteLayer = (id) => {
        setLayers(layers.filter(l => l.id !== id));
        setSelectedId(null);
    };

    const handleVoiceAction = (action, payload) => {
        if (action === 'add') addLayer(payload);
        if (action === 'print') getCanvasData().then(onPrint);
        if (action === 'clear') {
            if(confirm("Clear all layers?")) setLayers([]);
        }
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                addLayer(LayerFactory.createImage(ev.target.result));
            };
            reader.readAsDataURL(file);
        }
    };

    const selectedLayer = layers.find(l => l.id === selectedId);

    const getCanvasData = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = canvasSize.width;
        canvas.height = canvasSize.height;
        // We need to import renderLabelToCanvas dynamically or prop drill?
        // Better to export it from a util and import here.
        const { renderLabelToCanvas } = await import('../../lib/layers/renderer');
        await renderLabelToCanvas(canvas, layers, canvasSize.width, canvasSize.height);
        return canvas.toDataURL();
    };

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="bg-white border-b border-gray-200 p-2 flex gap-2 items-center">
                <button onClick={() => addLayer(LayerFactory.createText())} className="p-2 hover:bg-gray-100 rounded flex flex-col items-center text-xs gap-1">
                    <Type className="w-5 h-5" /> Text
                </button>
                <label className="p-2 hover:bg-gray-100 rounded flex flex-col items-center text-xs gap-1 cursor-pointer">
                    <ImageIcon className="w-5 h-5" /> Image
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                </label>
                <button onClick={() => addLayer(LayerFactory.createBarcode())} className="p-2 hover:bg-gray-100 rounded flex flex-col items-center text-xs gap-1">
                    <QrCode className="w-5 h-5" /> QR/Code
                </button>

                <div className="w-px h-8 bg-gray-200 mx-2" />

                <VoiceCommand onAction={handleVoiceAction} />
                <OCRTool onAddLayer={addLayer} />

                <div className="w-px h-8 bg-gray-200 mx-2" />

                <div className="relative group">
                    <button className="p-2 hover:bg-gray-100 rounded flex flex-col items-center text-xs gap-1">
                        <LayoutTemplate className="w-5 h-5" /> Templates
                    </button>
                    <div className="absolute top-full left-0 bg-white shadow-xl border border-gray-200 rounded-lg p-2 w-48 hidden group-hover:block z-50">
                        {TEMPLATES.map(t => (
                            <button
                                key={t.id}
                                onClick={() => {
                                    setCanvasSize(t.canvasSize);
                                    setLayers(t.layers);
                                    setSelectedId(null);
                                }}
                                className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
                            >
                                {t.name}
                            </button>
                        ))}
                    </div>
                </div>

                <button onClick={async () => onSave(await getCanvasData())} className="p-2 hover:bg-gray-100 rounded flex flex-col items-center text-xs gap-1">
                    <Save className="w-5 h-5" /> Save
                </button>
                <button onClick={async () => onPrint(await getCanvasData())} className="ml-auto bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow-sm hover:bg-gray-800">
                    <Printer className="w-4 h-4" /> Print
                </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Canvas Area */}
                <div className="flex-1 bg-gray-100 p-8 overflow-auto flex items-center justify-center">
                    <LabelCanvas
                        layers={layers}
                        width={canvasSize.width}
                        height={canvasSize.height}
                        selectedLayerId={selectedId}
                        onSelectLayer={setSelectedId}
                        onUpdateLayer={updateLayer}
                    />
                </div>

                {/* Properties Panel */}
                <div className="w-64 bg-white border-l border-gray-200 p-4 overflow-y-auto">
                    <h3 className="font-bold text-sm text-gray-500 uppercase mb-4">Properties</h3>

                    <div className="mb-6">
                        <label className="block text-xs font-semibold mb-1">Canvas Size</label>
                        <div className="flex gap-2">
                             <input type="number" value={canvasSize.width} onChange={e => setCanvasSize({...canvasSize, width: Number(e.target.value)})} className="w-full border rounded p-1 text-sm" />
                             <span className="text-gray-400">x</span>
                             <input type="number" value={canvasSize.height} onChange={e => setCanvasSize({...canvasSize, height: Number(e.target.value)})} className="w-full border rounded p-1 text-sm" />
                        </div>
                    </div>

                    {selectedLayer ? (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold badge bg-gray-100 px-2 py-1 rounded">{selectedLayer.type}</span>
                                <button onClick={() => deleteLayer(selectedLayer.id)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div>
                                <label className="block text-xs text-gray-500 mb-1">X / Y Position</label>
                                <div className="flex gap-2">
                                     <input type="number" value={Math.round(selectedLayer.x)} onChange={e => updateLayer(selectedLayer.id, { x: Number(e.target.value) })} className="w-full border rounded p-1 text-sm" />
                                     <input type="number" value={Math.round(selectedLayer.y)} onChange={e => updateLayer(selectedLayer.id, { y: Number(e.target.value) })} className="w-full border rounded p-1 text-sm" />
                                </div>
                            </div>

                            {selectedLayer.type === 'text' && (
                                <>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Content</label>
                                        <textarea value={selectedLayer.content} onChange={e => updateLayer(selectedLayer.id, { content: e.target.value })} className="w-full border rounded p-1 text-sm" rows={2} />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Font Size</label>
                                        <input type="number" value={selectedLayer.fontSize} onChange={e => updateLayer(selectedLayer.id, { fontSize: Number(e.target.value) })} className="w-full border rounded p-1 text-sm" />
                                    </div>
                                </>
                            )}

                            {selectedLayer.type === 'barcode' && (
                                <>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Content</label>
                                        <input type="text" value={selectedLayer.content} onChange={e => updateLayer(selectedLayer.id, { content: e.target.value })} className="w-full border rounded p-1 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Width</label>
                                        <input type="number" value={selectedLayer.width} onChange={e => updateLayer(selectedLayer.id, { width: Number(e.target.value) })} className="w-full border rounded p-1 text-sm" />
                                    </div>
                                </>
                            )}

                            {selectedLayer.type === 'image' && (
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Width</label>
                                    <input type="number" value={selectedLayer.width} onChange={e => updateLayer(selectedLayer.id, { width: Number(e.target.value) })} className="w-full border rounded p-1 text-sm" />
                                </div>
                            )}

                        </div>
                    ) : (
                        <div className="text-sm text-gray-400 text-center mt-10">
                            Select an element to edit properties
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

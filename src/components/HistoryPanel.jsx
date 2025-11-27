import React, { useState, useEffect } from 'react';
import { Trash2, Calendar, Image as ImageIcon, Type, QrCode } from 'lucide-react';
import { StorageService } from '../lib/storage';

export default function HistoryPanel({ onLoad }) {
    const [history, setHistory] = useState([]);

    useEffect(() => {
        setHistory(StorageService.getSavedLabels());
    }, []);

    const handleDelete = (id, e) => {
        e.stopPropagation();
        if(confirm("Delete this saved label?")) {
            setHistory(StorageService.deleteLabel(id));
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">History & Saved Labels</h2>

            {history.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-xl border border-gray-200">
                    <p className="text-gray-500">No history yet. Print something to save it!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {history.map(item => (
                        <div
                            key={item.id}
                            onClick={() => onLoad(item)}
                            className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex gap-4 items-center group"
                        >
                            <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden border">
                                {item.previewUrl ? (
                                    <img src={item.previewUrl} className="w-full h-full object-contain filter grayscale" />
                                ) : (
                                    <ImageIcon className="text-gray-400" />
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    {item.type === 'text' && <Type className="w-4 h-4 text-blue-500" />}
                                    {item.type === 'image' && <ImageIcon className="w-4 h-4 text-purple-500" />}
                                    {item.type === 'qr' && <QrCode className="w-4 h-4 text-green-500" />}
                                    <span className="font-medium truncate">{item.name || 'Untitled Label'}</span>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-gray-400">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(item.date).toLocaleString()}
                                </div>
                            </div>

                            <button
                                onClick={(e) => handleDelete(item.id, e)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

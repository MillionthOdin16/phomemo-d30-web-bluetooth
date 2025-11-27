import React from 'react';

export default function SettingsPanel() {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">Settings</h2>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Printer Preferences</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Printer Model</label>
                        <select className="w-full border-gray-300 rounded-lg shadow-sm p-2 border">
                            <option>Phomemo D30 (Default)</option>
                            <option>Phomemo M02</option>
                            <option>Phomemo M110</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Print Density (Darkness)</label>
                        <select className="w-full border-gray-300 rounded-lg shadow-sm p-2 border">
                            <option>Light</option>
                            <option>Medium</option>
                            <option>Dark</option>
                        </select>
                    </div>
                </div>

                <p className="text-xs text-gray-500 bg-blue-50 p-3 rounded">
                    <strong>Note:</strong> Advanced settings like Density are only supported on M-Series printers. D30 uses fixed density.
                </p>
            </div>

             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="font-semibold text-lg border-b pb-2 mb-4">About</h3>
                <p className="text-gray-600">
                    Phomemo Web Interface v2.0
                    <br />
                    Supports D30, M02, M110 series.
                    <br />
                    Developed by Jules.
                </p>
            </div>
        </div>
    );
}

import React, { useState, useEffect } from 'react';
import { Settings, Printer, History, Image as ImageIcon, Type, QrCode, Smartphone, PenTool } from 'lucide-react';
import { PhomemoDriver } from './lib/printer/PhomemoDriver';
import Designer from './components/designer/Designer';
import TextEditor from './components/editors/TextEditor';
import ImageEditor from './components/editors/ImageEditor';
import BarcodeEditor from './components/editors/BarcodeEditor';
import SettingsPanel from './components/SettingsPanel';
import HistoryPanel from './components/HistoryPanel';
import Preview from './components/Preview';
import { StorageService } from './lib/storage';
import { processImageForPrinter } from './lib/image/processor';

const driver = new PhomemoDriver();

export default function App() {
  const [activeTab, setActiveTab] = useState('designer'); // Default to Designer
  const [isConnected, setIsConnected] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [previewData, setPreviewData] = useState(null); // { url, width, height, type, name }
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Handle Share Target (PWA)
    const params = new URLSearchParams(window.location.search);
    const sharedTitle = params.get('title');
    const sharedText = params.get('text');
    const sharedUrl = params.get('url');

    if (sharedTitle || sharedText || sharedUrl) {
       // Ideally pass this to Designer to add as layer
       console.log("Shared Content:", sharedTitle, sharedText, sharedUrl);
       // Just a toast for now, or prompt to copy
       if (sharedText) {
         alert(`Shared text received: ${sharedText}. Use 'Add Text' to insert.`);
       }
    }
  }, []);

  const handleConnect = async () => {
    try {
      const name = await driver.connect();
      setDeviceName(name);
      setIsConnected(true);
    } catch (err) {
      console.error(err);
      alert("Failed to connect: " + err.message);
    }
  };

  const handlePrint = async () => {
    if (!previewData || !previewData.packedData) {
        alert("Nothing to print!");
        return;
    }

    // Save to history before printing
    StorageService.saveLabel({
        type: previewData.type || 'unknown',
        name: previewData.name || 'Printed Label',
        previewUrl: previewData.previewUrl
    });

    if (!isConnected) {
        // Allow "Offline" printing simulation or prompt
        if(!confirm("Printer not connected. Connect now?")) return;
        try {
            await handleConnect();
        } catch(e) { return; }
    }

    try {
        await driver.printImage(previewData.packedData, previewData.width);
        alert("Sent to printer!");
    } catch (err) {
        alert("Print failed: " + err.message);
    }
  };

  const loadFromHistory = (item) => {
      // Logic to load back into editor would go here.
      // For now, we just indicate it's loaded but we don't have the source data (e.g. text content) preserved, just the preview.
      // To fully implement, we'd need to save the 'state' of the editor (text, font size, etc) in storage.
      alert("Loading saved labels into editor is not fully supported yet, but you can reprint this!");
      // We could technically just print the image if we saved the packed data or base64
      // But we only saved the preview URL (which is base64).
      // Let's allow reprinting the preview URL.
      // Implementation: Convert previewUrl back to packedData using processor.
  };

  return (
    <div className={`min-h-screen font-sans flex flex-col md:flex-row transition-colors duration-300 ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      {/* Sidebar Navigation */}
      <aside className={`w-full md:w-64 border-r flex flex-col transition-colors duration-300 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
            <h1 className="text-xl font-bold flex items-center gap-2 text-indigo-500">
                <Printer className="w-6 h-6" />
                Phomemo Web
            </h1>
        </div>

        <nav className="flex-1 p-4 space-y-2">
            <NavButton id="designer" icon={PenTool} label="Designer" active={activeTab} set={setActiveTab} />
            <div className="pt-4 border-t border-gray-100 mt-4">
                 <p className="px-3 text-xs font-semibold text-gray-400 mb-2 uppercase">Legacy Tools</p>
                 <NavButton id="text" icon={Type} label="Simple Text" active={activeTab} set={setActiveTab} />
                 <NavButton id="image" icon={ImageIcon} label="Simple Image" active={activeTab} set={setActiveTab} />
                 <NavButton id="qr" icon={QrCode} label="Simple QR" active={activeTab} set={setActiveTab} />
            </div>
            <div className="pt-4 border-t border-gray-100 mt-4">
                 <NavButton id="history" icon={History} label="History" active={activeTab} set={setActiveTab} />
                 <NavButton id="settings" icon={Settings} label="Settings" active={activeTab} set={setActiveTab} />
            </div>
        </nav>

        <div className={`p-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-semibold uppercase opacity-50">Theme</span>
                <button onClick={() => setDarkMode(!darkMode)} className={`px-2 py-1 text-xs rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    {darkMode ? 'Dark' : 'Light'}
                </button>
            </div>

            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${isConnected ? 'bg-green-50 text-green-700' : (darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-500')}`}>
                <Smartphone className="w-4 h-4" />
                {isConnected ? deviceName : 'Not Connected'}
            </div>
            {!isConnected && (
                <button onClick={handleConnect} className="mt-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors">
                    Connect Printer
                </button>
            )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header (Mobile only mostly) */}
        <header className="md:hidden bg-white border-b border-gray-200 p-4 flex justify-between items-center">
            <h1 className="font-bold text-lg">Phomemo D30</h1>
            <button onClick={handleConnect} className="text-indigo-600 font-medium text-sm">
                {isConnected ? 'Connected' : 'Connect'}
            </button>
        </header>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {activeTab === 'designer' ? (
                 <Designer
                    onPrint={async (dataUrl) => {
                        const result = await processImageForPrinter(dataUrl, 96); // TODO: dynamic width based on designer
                        setPreviewData({ ...result, type: 'designer', name: 'Custom Design', previewUrl: dataUrl });
                        // Hack: Trigger print immediately
                        setTimeout(handlePrint, 100);
                    }}
                    onSave={(dataUrl) => {
                        StorageService.saveLabel({ type: 'designer', name: 'Saved Design', previewUrl: dataUrl });
                        alert("Design saved to History");
                    }}
                 />
            ) : (
                <>
                    {/* Editor Area */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="max-w-2xl mx-auto">
                            {activeTab === 'text' && <TextEditor onUpdate={setPreviewData} />}
                            {activeTab === 'image' && <ImageEditor onUpdate={setPreviewData} />}
                            {activeTab === 'qr' && <BarcodeEditor onUpdate={setPreviewData} />}
                            {activeTab === 'settings' && <SettingsPanel />}
                            {activeTab === 'history' && <HistoryPanel onLoad={loadFromHistory} />}
                        </div>
                    </div>

                    {/* Preview Area */}
                    <div className="w-full md:w-80 bg-gray-100 border-l border-gray-200 p-6 flex flex-col items-center justify-center">
                        <div className="bg-white shadow-sm p-4 rounded-xl w-full max-w-xs">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Print Preview</h3>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg min-h-[100px] flex items-center justify-center bg-gray-50 overflow-hidden relative">
                                <Preview data={previewData} />
                            </div>
                            <div className="mt-4 text-center text-xs text-gray-400">
                                {previewData ? `${previewData.width} x ${previewData.height} px` : 'No data'}
                            </div>
                        </div>

                        <button
                            onClick={handlePrint}
                            className="mt-6 w-full max-w-xs bg-black text-white py-3 px-6 rounded-xl font-bold shadow-lg hover:bg-gray-800 transform transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <Printer className="w-5 h-5" />
                            Print Label
                        </button>
                    </div>
                </>
            )}
        </div>
      </main>
    </div>
  );
}

function NavButton({ id, icon: Icon, label, active, set }) {
    const isActive = active === id;
    return (
        <button
            onClick={() => set(id)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
        >
            <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
            {label}
        </button>
    );
}

import React, { useRef, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { X, Trash2, Download, Upload } from 'lucide-react';
import { useAppStore } from '../store';
import { serializeToXML, parseFromXML } from '../utils/xml';

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const { clearAllData, importData, importCollection } = useAppStore();
  const modalRef = useRef<HTMLDivElement>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleExport = () => {
    const data = localStorage.getItem('planner-storage');
    if (data) {
      try {
        const parsed = JSON.parse(data);
        const xmlContent = serializeToXML(parsed);
        const blob = new Blob([xmlContent], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        const d = new Date();
        const dateStr = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth()+1).padStart(2, '0')}-${d.getFullYear()}`;
        
        a.download = `Loom [${dateStr}].XML`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error("Export failed", e);
      }
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const result = e.target?.result as string;
        
        // Try importing as a single Lister collection first
        if (result.includes('<ListerExport>')) {
           const { parseFullCollectionXML } = await import('../utils/exportImport');
           const { collection, records } = parseFullCollectionXML(result);
           importCollection(collection, records);
           toast.success(`List "${collection.name}" imported successfully!`);
           onClose();
           return;
        }

        // Fallback to full planner backup
        const parsed = parseFromXML(result);
        if (parsed && parsed.state) {
          importData(parsed.state);
          toast.success('Full backup imported successfully!');
          onClose();
        } else {
           toast.error('Invalid backup format.');
        }
      } catch (error) {
        toast.error('Failed to parse XML file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div ref={modalRef} className="bg-[#0a0a0a] border border-zinc-800/60 rounded-[32px] w-full max-w-md shadow-[0_0_80px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-slide-up">
        <div className="flex items-center justify-between p-8 pb-6 border-b border-zinc-800/40 shrink-0 bg-transparent">
          <h3 className="text-2xl font-bold text-white tracking-tight">Settings</h3>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-8">
          <div className="space-y-4">
            <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Data Management</h4>
            <div className="space-y-3">
              <button 
                onClick={handleExport}
                className="w-full flex items-center gap-3 px-5 py-4 bg-zinc-900/40 hover:bg-zinc-900/80 border border-zinc-800/50 rounded-2xl transition-all text-left"
              >
                <Download size={18} className="text-zinc-400" />
                <div>
                  <div className="text-sm font-medium text-zinc-200">Export Backup</div>
                  <div className="text-xs text-zinc-500">Save all your data to an XML file</div>
                </div>
              </button>
              
              <label className="w-full flex items-center gap-3 px-4 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-colors cursor-pointer">
                <Upload size={18} className="text-zinc-400" />
                <div>
                  <div className="text-sm font-medium text-zinc-200">Import Backup</div>
                  <div className="text-xs text-zinc-500">Restore data from an XML file</div>
                </div>
                <input type="file" accept=".xml" className="hidden" onChange={handleImport} />
              </label>

              {!showClearConfirm ? (
                <button 
                  onClick={() => setShowClearConfirm(true)}
                  className="w-full flex items-center gap-3 px-5 py-4 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/20 rounded-2xl transition-all text-left"
                >
                  <Trash2 size={18} className="text-rose-500" />
                  <div>
                    <div className="text-sm font-medium text-rose-500">Clear All Data</div>
                    <div className="text-xs text-rose-500/70">Factory reset the application</div>
                  </div>
                </button>
              ) : (
                <div className="w-full p-5 bg-rose-500/5 border border-rose-500/20 rounded-2xl space-y-4">
                  <p className="text-sm text-rose-400 font-medium">Are you absolutely sure? This cannot be undone.</p>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setShowClearConfirm(false)}
                      className="flex-1 px-4 py-3 bg-zinc-900/40 hover:bg-zinc-800/60 text-zinc-300 text-sm font-medium rounded-xl transition-all border border-zinc-800/50"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => {
                        clearAllData();
                        onClose();
                      }}
                      className="flex-1 px-4 py-3 bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(225,29,72,0.2)] active:scale-95"
                    >
                      Yes, Clear All
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

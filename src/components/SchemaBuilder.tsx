import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useAppStore } from '../store';
import { ICON_OPTIONS } from '../utils/icons';

export default function SchemaBuilder({ onClose }: { onClose: () => void }) {
  const { addCollection } = useAppStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('list');
  const [tabs, setTabs] = useState<string[]>(['']);

  const handleAddTab = () => {
    setTabs([...tabs, '']);
  };

  const updateTab = (index: number, newName: string) => {
    const newTabs = [...tabs];
    newTabs[index] = newName;
    setTabs(newTabs);
  };

  const removeTab = (index: number) => {
    if (tabs.length === 1) return;
    setTabs(tabs.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!name.trim()) return;
    let finalTabs = tabs.filter(t => t.trim() !== '');
    if (finalTabs.length === 0) finalTabs = ['Main'];
    
    addCollection({
      name,
      description,
      icon,
      tabs: finalTabs.map(t => ({ id: crypto.randomUUID(), name: t })),
      fields: [] // Fields are now managed from within the collection view
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[#0a0a0a] border border-zinc-800/60 rounded-[32px] w-full max-w-[540px] shadow-[0_0_80px_rgba(0,0,0,0.8)] flex flex-col max-h-[90vh] my-auto animate-slide-up">
        <div className="flex items-center justify-between p-8 pb-6 border-b border-zinc-800/40 shrink-0 bg-transparent">
          <h3 className="text-2xl font-bold text-white flex items-center gap-2">
            Create New List
          </h3>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto flex-1 space-y-8 custom-scrollbar">
          <div className="space-y-4">
            <div>
              
              <input 
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="List Title..."
                className="w-full bg-zinc-900/40 border border-zinc-800/50 rounded-2xl px-5 py-4 text-xl text-white placeholder-zinc-600 focus:outline-none focus:bg-zinc-900/80 focus:border-zinc-700 transition-all font-semibold"
              />
            </div>
            
            <div>
              
              <input 
                type="text" 
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Short description..."
                className="w-full bg-zinc-900/40 border border-zinc-800/50 rounded-2xl px-5 py-3.5 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:bg-zinc-900/80 focus:border-zinc-700 transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Icon</label>
              <div className="grid grid-cols-4 gap-2 p-2.5 bg-zinc-900/30 border border-zinc-800/40 rounded-2xl">
                {ICON_OPTIONS.map(opt => {
                  const IconComp = opt.icon;
                  const isActive = icon === opt.id;
                  return (
                    <button 
                      key={opt.id}
                      onClick={() => setIcon(opt.id)}
                      className={`flex flex-col items-center justify-center gap-1.5 p-2 h-16 rounded-[14px] transition-all duration-200 ${
                        isActive ? 'bg-white text-zinc-900 shadow-md scale-105'
                          : 'text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300 border-transparent'
                      }`}
                      title={opt.name}
                    >
                      <IconComp size={20} />
                      <span className="text-[10px] font-medium">{opt.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-zinc-800/40">
            <div className="flex items-center justify-between mb-4">
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Sections / Tabs</label>
              <button 
                onClick={handleAddTab}
                className="text-zinc-400 hover:text-zinc-300 text-sm font-medium flex items-center gap-1"
              >
                <Plus size={14} /> Add Tab
              </button>
            </div>
            
            <div className="space-y-2">
              {tabs.map((tab, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input 
                    type="text"
                    value={tab}
                    onChange={(e) => updateTab(idx, e.target.value)}
                    placeholder="Section name (e.g. Round 1)"
                    className="flex-1 bg-zinc-900/40 border border-zinc-800/50 rounded-2xl px-4 py-3.5 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:bg-zinc-900/80 focus:border-zinc-700 transition-all"
                  />
                  {tabs.length > 1 && (
                    <button 
                      onClick={() => removeTab(idx)}
                      className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-zinc-500 mt-3 italic">
              You will configure the specific fields for items after creating the list.
            </p>
          </div>
        </div>

        <div className="p-6 border-t border-zinc-800/40 flex items-center justify-end gap-3 bg-transparent shrink-0">
          <button onClick={onClose} className="px-6 py-3 text-zinc-400 font-medium hover:text-white transition-colors rounded-2xl hover:bg-zinc-800/60">Cancel</button>
          <button 
            onClick={handleSave} 
            disabled={!name.trim()}
            className="px-8 py-3 bg-white text-zinc-900 hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed font-bold rounded-2xl transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] active:scale-95"
          >
            Create List
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { LayoutDashboard, CheckSquare, StickyNote, Settings, Menu, Plus, MoreVertical, Edit2, Pin, Trash2, PinOff, Download, Upload } from 'lucide-react';
import { useAppStore } from '../store';
import SettingsModal from './SettingsModal';
import SchemaBuilder from './SchemaBuilder';
import { ICON_OPTIONS } from '../utils/icons';

import { exportFullCollection } from '../utils/exportImport';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
}

function CollectionItem({ col, isOpen, isActive, opt, Icon, setCurrentView, openRename }: any) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { updateCollection, deleteCollection, collections, records } = useAppStore();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  const handlePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (col.pinned) {
      updateCollection(col.id, { pinned: false });
    } else {
      const pinnedCount = collections.filter(c => c.pinned).length;
      if (pinnedCount >= 3) {
        toast.error('You can only pin a maximum of 3 lists.');
      } else {
        updateCollection(col.id, { pinned: true });
      }
    }
    setShowDropdown(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete "${col.name}" and all its items?`)) {
      deleteCollection(col.id);
    }
    setShowDropdown(false);
  };
  
  const handleRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    openRename(col);
    setShowDropdown(false);
  };

  const handleExport = (e: React.MouseEvent) => {
    e.stopPropagation();
    exportFullCollection(col, records);
    setShowDropdown(false);
  };

  return (
    <div className="relative group/item">
      <button
        onClick={() => setCurrentView(col.id)}
        className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg transition-all group ${
          isActive 
            ? `${opt.theme.bg} ${opt.theme.text} border ${opt.theme.border}` 
            : 'text-zinc-400 hover:bg-zinc-900 border border-transparent'
        }`}
        title={col.name}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <Icon size={18} className={`shrink-0 ${isActive ? '' : `group-hover:${opt.theme.text}`}`} />
          {isOpen && <span className="font-medium whitespace-nowrap overflow-hidden text-ellipsis">{col.name}</span>}
        </div>
        {isOpen && (
          <div 
            className={`shrink-0 p-1 rounded-md hover:bg-zinc-800/80 transition-colors ${showDropdown ? 'opacity-100 text-zinc-100' : 'opacity-0 group-hover/item:opacity-100 text-zinc-500'}`}
            onClick={(e) => { e.stopPropagation(); setShowDropdown(!showDropdown); }}
          >
            <MoreVertical size={14} />
          </div>
        )}
      </button>

      {showDropdown && isOpen && (
        <div ref={dropdownRef} className="absolute right-0 top-full mt-1 w-40 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl py-1 z-50 overflow-hidden">
          <button onClick={handleRename} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">
            <Edit2 size={14} /> Rename List
          </button>
          <button onClick={handlePin} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">
            {col.pinned ? <PinOff size={14} /> : <Pin size={14} />} 
            {col.pinned ? 'Unpin' : 'Pin List'}
          </button>
          <button onClick={handleExport} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">
            <Upload size={14} /> Export List
          </button>
          <div className="h-px bg-zinc-800 my-1 mx-2" />
          <button onClick={handleDelete} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors">
            <Trash2 size={14} /> Delete List
          </button>
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ currentView, setCurrentView }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSchemaBuilderOpen, setIsSchemaBuilderOpen] = useState(false);
  
  const [editingCol, setEditingCol] = useState<any>(null);
  const [renameValue, setRenameValue] = useState('');
  
  const collections = useAppStore(state => state.collections);
  const updateCollection = useAppStore(state => state.updateCollection);

  const coreNavItems = [
    { id: 'tasks', label: 'Tasks', icon: LayoutDashboard },
    { id: 'routines', label: 'Routines', icon: CheckSquare },
    { id: 'notes', label: 'Notes', icon: StickyNote },
  ];

  const pinnedCollections = collections.filter(c => c && c.id && c.pinned);
  const unpinnedCollections = collections.filter(c => c && c.id && !c.pinned);

  const handleSaveRename = () => {
    if (editingCol && renameValue.trim()) {
      updateCollection(editingCol.id, { name: renameValue.trim() });
    }
    setEditingCol(null);
  };

  return (
    <>
      <aside className={`bg-zinc-950 border-r border-zinc-800 transition-all duration-300 flex flex-col ${isOpen ? 'w-64' : 'w-20'} shrink-0 z-20 relative`}>
        <div className="h-16 flex items-center px-4 border-b border-zinc-800 justify-between">
          {isOpen && <h1 className="text-xl font-bold tracking-tight text-white flex-1 overflow-hidden whitespace-nowrap">Loom</h1>}
          <button onClick={() => setIsOpen(!isOpen)} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors shrink-0 mx-auto">
            <Menu size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-3 flex flex-col gap-6 scrollbar-hide">
          <div className="flex flex-col gap-2">
            <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1 px-3">
              {isOpen ? 'Core Views' : ' '}
            </div>
            {coreNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  currentView === item.id 
                    ? 'bg-white/10 text-white border border-white/20' 
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 border border-transparent'
                }`}
                title={item.label}
              >
                <item.icon size={18} className="shrink-0" />
                {isOpen && <span className="font-medium whitespace-nowrap overflow-hidden">{item.label}</span>}
              </button>
            ))}
          </div>

          {pinnedCollections.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1 px-3">
                {isOpen ? 'Pinned Lists' : ' '}
              </div>
              {pinnedCollections.map((col) => {
                const opt = ICON_OPTIONS.find(o => o.id === col.icon) || ICON_OPTIONS[0];
                return (
                  <CollectionItem 
                    key={col.id}
                    col={col}
                    isOpen={isOpen}
                    isActive={currentView === col.id}
                    opt={opt}
                    Icon={opt.icon}
                    setCurrentView={setCurrentView}
                    openRename={(c: any) => { setEditingCol(c); setRenameValue(c.name); }}
                  />
                );
              })}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between mb-1 px-3">
              <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                {isOpen ? 'My Lists' : ' '}
              </div>
              {isOpen && (
                <button 
                  onClick={() => setIsSchemaBuilderOpen(true)}
                  className="text-zinc-500 hover:text-white transition-colors"
                  title="Create new list format"
                >
                  <Plus size={14} />
                </button>
              )}
            </div>
            
            {!isOpen && (
              <button 
                onClick={() => setIsSchemaBuilderOpen(true)}
                className="flex justify-center mx-auto p-2 text-zinc-500 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors"
                title="Create new list format"
              >
                <Plus size={16} />
              </button>
            )}

            {unpinnedCollections.map((col) => {
              const opt = ICON_OPTIONS.find(o => o.id === col.icon) || ICON_OPTIONS[0];
              return (
                <CollectionItem 
                  key={col.id}
                  col={col}
                  isOpen={isOpen}
                  isActive={currentView === col.id}
                  opt={opt}
                  Icon={opt.icon}
                  setCurrentView={setCurrentView}
                  openRename={(c: any) => { setEditingCol(c); setRenameValue(c.name); }}
                />
              );
            })}
          </div>
        </div>
        
        <div className="p-4 border-t border-zinc-800">
           <button 
             onClick={() => setIsSettingsOpen(true)}
             className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors border border-transparent"
             title="Settings"
           >
              <Settings size={18} className="shrink-0" />
              {isOpen && <span className="font-medium">Settings</span>}
            </button>
        </div>
      </aside>

      {/* Rename Modal */}
      {editingCol && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setEditingCol(null); }}>
          <div className="bg-[#0a0a0a] border border-zinc-800/60 rounded-[32px] p-8 w-full max-w-sm shadow-[0_0_80px_rgba(0,0,0,0.8)] flex flex-col my-auto animate-slide-up">
            <h3 className="text-2xl font-bold text-white mb-6">Rename List</h3>
            <input 
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="w-full bg-zinc-900/40 border border-zinc-800/50 rounded-2xl px-5 py-4 text-xl text-white placeholder-zinc-600 focus:outline-none focus:bg-zinc-900/80 focus:border-zinc-700 transition-all font-semibold mb-8"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveRename(); if (e.key === 'Escape') setEditingCol(null); }}
            />
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-zinc-800/40">
              <button onClick={() => setEditingCol(null)} className="px-6 py-3 text-zinc-400 font-medium hover:text-white transition-colors rounded-2xl hover:bg-zinc-800/60">Cancel</button>
              <button onClick={handleSaveRename} className="px-8 py-3 bg-white text-zinc-900 hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed font-bold rounded-2xl transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] active:scale-95">Rename</button>
            </div>
          </div>
        </div>
      )}

      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
      {isSchemaBuilderOpen && <SchemaBuilder onClose={() => setIsSchemaBuilderOpen(false)} />}
    </>
  );
}

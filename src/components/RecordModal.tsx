import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { X, Trash2 } from 'lucide-react';
import { Collection, RecordItem, FieldDef } from '../types';
import { ICON_OPTIONS } from '../utils/icons';
import { useAppStore } from '../store';

interface RecordModalProps {
  collection: Collection;
  record: RecordItem | null;
  tabId: string;
  onClose: () => void;
}

export default function RecordModal({ collection, record, tabId, onClose }: RecordModalProps) {
  const { addRecord, updateRecord, deleteRecord } = useAppStore();
  const opt = ICON_OPTIONS.find(o => o.id === collection.icon) || ICON_OPTIONS[0];
  
  const [formData, setFormData] = useState<Record<string, any>>(record?.data || {});

  const handleSave = () => {
    // Validate required fields
    const missingFields = collection.fields.filter(f => {
      // If dependsOn is set and the dependent field is false, this field is skipped
      if (f.dependsOn && !formData[f.dependsOn]) return false;
      return f.required && (formData[f.id] === undefined || formData[f.id] === null || formData[f.id] === '');
    });
    
    if (missingFields.length > 0) {
      toast.error(`Please fill in all required fields: ${missingFields.map(f => f.name).join(', ')}`);
      return;
    }

    if (record) {
      updateRecord(record.id, { data: formData });
    } else {
      addRecord({
        collectionId: collection.id,
        tabId: tabId,
        data: formData
      });
    }
    onClose();
  };

  const handleDelete = () => {
    if (!record) return;
    if (confirm('Are you sure you want to delete this item?')) {
      deleteRecord(record.id);
      onClose();
    }
  };

  const updateField = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  // Group fields by section
  const fieldsBySection: Record<string, FieldDef[]> = {};
  const ungroupedFields: FieldDef[] = [];

  (collection.fields || []).forEach(field => {
    // Check dependsOn
    if (field.dependsOn && !formData[field.dependsOn]) {
      return; // Skip rendering
    }
    
    if (field.section) {
      if (!fieldsBySection[field.section]) fieldsBySection[field.section] = [];
      fieldsBySection[field.section].push(field);
    } else {
      ungroupedFields.push(field);
    }
  });

  const renderField = (field: FieldDef) => {
    const widthClass = field.width === 'half' ? 'col-span-12 sm:col-span-6' : field.width === 'third' ? 'col-span-12 sm:col-span-4' : 'col-span-12';
    
    // Checkbox and Tag cards
    if (field.type === 'checkbox' || field.type === 'tag') {
      const colorMap = {
        blue: 'peer-checked:bg-blue-500 peer-checked:border-blue-500',
        emerald: 'peer-checked:bg-emerald-500 peer-checked:border-emerald-500',
        amber: 'peer-checked:bg-amber-500 peer-checked:border-amber-500',
        rose: 'peer-checked:bg-rose-500 peer-checked:border-rose-500',
        purple: 'peer-checked:bg-purple-500 peer-checked:border-purple-500',
        zinc: 'peer-checked:bg-zinc-100 peer-checked:border-zinc-100'
      };
      const checkColorClass = field.type === 'tag' && field.color ? colorMap[field.color] : colorMap.zinc;
      
      const isTag = field.type === 'tag';
      
      return (
        <div key={field.id} className={`${widthClass}`}>
           <label className={`flex items-center gap-3 cursor-pointer py-3.5 px-5 bg-zinc-900/40 border ${!!formData[field.id] && isTag ? `border-${field.color || 'zinc'}-500/50` : 'border-zinc-800/50'} rounded-2xl hover:bg-zinc-900/80 hover:border-zinc-700 transition-all`}>
              <div className="relative flex items-center">
                <input 
                  type="checkbox"
                  checked={!!formData[field.id]}
                  onChange={(e) => updateField(field.id, e.target.checked)}
                  className="peer sr-only"
                />
                <div className={`w-5 h-5 border-2 border-zinc-700 rounded-md ${checkColorClass} transition-all flex items-center justify-center bg-zinc-900`}>
                  <svg className={`w-3 h-3 ${isTag && field.color && field.color !== 'zinc' ? 'text-white' : 'text-zinc-900'} opacity-0 peer-checked:opacity-100 transition-opacity`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <span className="text-sm font-medium text-zinc-200">
                {isTag ? <span className="font-bold uppercase tracking-wider">{field.name}</span> : field.name}
              </span>
              {field.required && <span className="text-rose-500 ml-1">*</span>}
            </label>
        </div>
      );
    }

    return (
      <div key={field.id} className={`space-y-3 ${widthClass}`}>
        {field.type === 'date' && (
          <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
            {field.name}
          </label>
        )}
        
        {field.type === 'text' && (
          <input 
            type="text"
            placeholder={field.name + "..."}
            value={formData[field.id] || ''} 
            onChange={(e) => updateField(field.id, e.target.value)}
            className="w-full bg-zinc-900/40 border border-zinc-800/50 rounded-2xl px-5 py-3.5 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:bg-zinc-900/80 focus:border-zinc-700 transition-all"
          />
        )}
        
        {field.type === 'number' && (
          <input 
            type="number"
            placeholder={field.name + "..."}
            value={formData[field.id] || ''} 
            onChange={(e) => updateField(field.id, Number(e.target.value))}
            className="w-full bg-zinc-900/40 border border-zinc-800/50 rounded-2xl px-5 py-3.5 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:bg-zinc-900/80 focus:border-zinc-700 transition-all"
          />
        )}
        
        {field.type === 'url' && (
          <input 
            type="url"
            placeholder={field.name + " (https://...)"}
            value={formData[field.id] || ''} 
            onChange={(e) => updateField(field.id, e.target.value)}
            className="w-full bg-zinc-900/40 border border-zinc-800/50 rounded-2xl px-5 py-3.5 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:bg-zinc-900/80 focus:border-zinc-700 transition-all"
          />
        )}

        {field.type === 'date' && (
          <input 
            type="date"
            value={formData[field.id] || ''} 
            onChange={(e) => updateField(field.id, e.target.value)}
            className="w-full bg-zinc-900/40 border border-zinc-800/50 rounded-2xl px-5 py-3.5 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:bg-zinc-900/80 focus:border-zinc-700 transition-all [color-scheme:dark]"
          />
        )}
      </div>
    );
  };

  const tabName = collection.tabs.find(t => t.id === tabId)?.name || 'Tab';

  return (
    <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[#0a0a0a] border border-zinc-800/60 rounded-[32px] w-full max-w-[540px] shadow-[0_0_80px_rgba(0,0,0,0.8)] flex flex-col max-h-[90vh] my-auto animate-slide-up">
        <div className="flex items-center justify-between p-8 pb-6 border-b border-zinc-800/40 shrink-0 bg-transparent">
          <h3 className="text-2xl font-bold text-white tracking-tight">
            {record ? `Edit Item in ${tabName}` : `Add Item to ${tabName}`}
          </h3>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto flex-1 space-y-8 custom-scrollbar">
          {/* Ungrouped Fields */}
          {ungroupedFields.length > 0 && (
            <div className="grid grid-cols-12 gap-4">
              {ungroupedFields.map(renderField)}
            </div>
          )}

          {/* Grouped Fields */}
          {Object.entries(fieldsBySection).map(([sectionName, fields]) => (
            <div key={sectionName} className="border border-zinc-800/40 rounded-[20px] p-6 bg-zinc-900/20">
              <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-5">
                {sectionName}
              </h4>
              <div className="grid grid-cols-12 gap-4">
                {fields.map(renderField)}
              </div>
            </div>
          ))}
          
          {collection.fields.length === 0 && (
            <div className="text-center py-8 text-zinc-500">
              No fields configured for this list.
            </div>
          )}
        </div>

        <div className="p-6 border-t border-zinc-800/40 flex items-center justify-between gap-3 bg-transparent shrink-0">
          <div>
            {record && (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors font-medium text-sm"
              >
                <Trash2 size={14} /> Delete Item
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-6 py-3 text-zinc-400 font-medium hover:text-white transition-colors rounded-2xl hover:bg-zinc-800/60">Cancel</button>
            <button 
              onClick={handleSave} 
              className="px-8 py-3 bg-white text-zinc-900 hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed font-bold rounded-2xl transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] active:scale-95"
            >
              {record ? 'Save Changes' : 'Add Item'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

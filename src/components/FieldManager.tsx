import React, { useState } from 'react';
import { X, Plus, GripVertical, Settings, Trash2, ChevronDown, Check } from 'lucide-react';
import { Collection, FieldDef, FieldType } from '../types';
import { useAppStore } from '../store';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';


function CustomSelect({ value, onChange, options, placeholder = "Select..." }: { value: string; onChange: (v: string) => void; options: {value: string; label: string}[]; placeholder?: string }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const selected = options.find(o => o.value === value);

  return (
    <div ref={ref} className="relative w-full">
      <button 
        type="button"
        onClick={() => setOpen(!open)} 
        className="w-full flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-colors"
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronDown size={14} className="text-zinc-500 shrink-0 ml-2" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl py-1 max-h-60 overflow-y-auto">
          {options.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${o.value === value ? 'bg-zinc-800 text-white' : 'text-zinc-300 hover:bg-zinc-800/50 hover:text-white'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FieldManager({ collection, onClose }: { collection: Collection, onClose: () => void }) {
  const { updateCollection } = useAppStore();
  const [fields, setFields] = useState<FieldDef[]>(collection.fields || []);
  const [expandedFieldId, setExpandedFieldId] = useState<string | null>(null);

  const handleAddField = () => {
    const newField: FieldDef = {
      id: crypto.randomUUID(),
      name: `New Field ${fields.length + 1}`,
      type: 'text',
      width: 'full'
    };
    setFields([...fields, newField]);
    setExpandedFieldId(newField.id);
  };

  const handleUpdateField = (id: string, updates: Partial<FieldDef>) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const handleRemoveField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
    if (expandedFieldId === id) setExpandedFieldId(null);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(fields);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setFields(items);
  };

  const handleSave = () => {
    updateCollection(collection.id, { fields });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-white">Configure Form Fields</h3>
            <p className="text-sm text-zinc-400">Design the layout for "{collection.name}" items.</p>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-zinc-950">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-zinc-300">Form Layout</h4>
            <button 
              onClick={handleAddField}
              className="flex items-center gap-1.5 text-xs font-medium text-zinc-900 bg-white hover:bg-zinc-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus size={14} /> Add Field
            </button>
          </div>

          {fields.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/30">
              <p className="text-zinc-500 text-sm">No fields added yet.</p>
              <button onClick={handleAddField} className="mt-2 text-zinc-300 text-sm font-medium hover:text-white hover:underline">Add your first field</button>
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="fields-list">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                    {fields.map((field, index) => (
                      <Draggable key={field.id} draggableId={field.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`bg-zinc-900 border ${snapshot.isDragging ? 'border-zinc-500 shadow-xl' : 'border-zinc-800'} rounded-xl`}
                            style={{ 
                              ...provided.draggableProps.style, 
                              zIndex: snapshot.isDragging ? 50 : fields.length - index 
                            }}
                          >
                            <div className="flex items-center p-3 gap-3">
                              <div {...provided.dragHandleProps} className="text-zinc-600 hover:text-zinc-400 cursor-grab">
                                <GripVertical size={16} />
                              </div>
                              
                              <div className="flex-1 grid grid-cols-2 gap-4">
                                <input 
                                  type="text"
                                  value={field.name}
                                  maxLength={field.type === 'tag' ? 5 : undefined}
                                  onChange={(e) => handleUpdateField(field.id, { name: e.target.value })}
                                  placeholder="Field Title"
                                  className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
                                />
                                <CustomSelect
    value={field.type}
    onChange={(val) => handleUpdateField(field.id, { type: val as FieldType })}
    options={[
      {value: 'text', label: 'Text'},
      {value: 'number', label: 'Number'},
      {value: 'checkbox', label: 'Checkbox (Toggle)'},
      {value: 'date', label: 'Date'},
      {value: 'url', label: 'URL Link'},
      {value: 'tag', label: 'Tag (Label)'},
    ]}
  />
                              </div>

                              <button 
                                onClick={() => setExpandedFieldId(expandedFieldId === field.id ? null : field.id)}
                                className={`p-1.5 rounded-lg transition-colors ${expandedFieldId === field.id ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:bg-zinc-800 hover:text-white'}`}
                              >
                                <Settings size={16} />
                              </button>
                              <button 
                                onClick={() => handleRemoveField(field.id)}
                                className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>

                            {/* Advanced Settings */}
                            {expandedFieldId === field.id && (
                              <div className="p-4 bg-zinc-950 border-t border-zinc-800 space-y-4 rounded-b-xl">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                                      Section / Group Name
                                    </label>
                                    <input 
                                      type="text"
                                      value={field.section || ''}
                                      onChange={(e) => handleUpdateField(field.id, { section: e.target.value })}
                                      placeholder="e.g. Details (Optional)"
                                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
                                    />
                                    <p className="text-[10px] text-zinc-500 mt-1">Fields with the same section name are grouped together.</p>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                                      Layout Width
                                    </label>
                                    <CustomSelect
    value={field.width || 'full'}
    onChange={(val) => handleUpdateField(field.id, { width: val as any })}
    options={[
      {value: 'full', label: 'Full Width'},
      {value: 'half', label: 'Half Width (50%)'},
      {value: 'third', label: 'Third Width (33%)'},
    ]}
  />
                                  </div>
                                </div>
                                
                                <div>
                                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                                    Show conditionally? (Depends on checkbox)
                                  </label>
                                  <CustomSelect
    value={field.dependsOn || ''}
    onChange={(val) => handleUpdateField(field.id, { dependsOn: val || undefined })}
    options={[
      {value: '', label: 'Always Show'},
      ...fields.filter(f => f.type === 'checkbox' && f.id !== field.id).map(f => ({
        value: f.id,
        label: `Show only if "${f.name}" is checked`
      }))
    ]}
  />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-900/50">
                                  <div className="flex items-center gap-3">
                                    <div 
                                      onClick={() => handleUpdateField(field.id, { required: !field.required })}
                                      className={`w-5 h-5 rounded flex items-center justify-center border transition-colors cursor-pointer ${field.required ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-zinc-900 border-zinc-700 text-transparent hover:bg-zinc-800'}`}
                                    >
                                      <Check size={12} strokeWidth={3} />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-semibold text-zinc-300">Required Field</label>
                                      <p className="text-[10px] text-zinc-500">Must be filled before saving</p>
                                    </div>
                                  </div>
                                  
                                  {field.type === 'tag' && (
                                    <div>
                                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                                        Tag Color
                                      </label>
                                      <div className="flex gap-2">
                                        {['blue', 'emerald', 'amber', 'rose', 'purple', 'zinc'].map(color => (
                                          <div 
                                            key={color}
                                            onClick={() => handleUpdateField(field.id, { color: color as any })}
                                            className={`w-6 h-6 rounded-full cursor-pointer border-2 transition-all ${field.color === color || (!field.color && color === 'zinc') ? 'border-white scale-110' : 'border-transparent opacity-50 hover:opacity-100'}`}
                                            style={{
                                              backgroundColor: color === 'blue' ? '#3b82f6' : 
                                                             color === 'emerald' ? '#10b981' : 
                                                             color === 'amber' ? '#f59e0b' : 
                                                             color === 'rose' ? '#f43f5e' : 
                                                             color === 'purple' ? '#a855f7' : '#71717a'
                                            }}
                                          />
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </div>

        <div className="p-4 border-t border-zinc-800 flex items-center justify-end gap-3 bg-zinc-950/50 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors">Cancel</button>
          <button 
            onClick={handleSave} 
            className="px-6 py-2 bg-zinc-100 hover:bg-white text-zinc-900 text-sm font-medium rounded-lg transition-colors shadow-lg shadow-black/10"
          >
            Save Fields
          </button>
        </div>
      </div>
    </div>
  );
}

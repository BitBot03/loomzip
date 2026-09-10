import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download, Loader2, ArrowUpDown, ChevronDown, ArrowUp, ArrowDown, Database, Upload, FileText, Plus, Printer, Edit2, ListChecks, Check, Copy, ArrowRight, Trash2, LayoutGrid, List, SlidersHorizontal, Settings2, Eye, EyeOff, X, X as ListIcon, GripVertical, CheckSquare, Search, Settings, MoreHorizontal } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useAppStore } from '../store';
import { RecordItem } from '../types';
import RecordModal from './RecordModal';
import FieldManager from './FieldManager';
import { ICON_MAP, ICON_OPTIONS } from '../utils/icons';

export default function CollectionView({ collectionId }: { collectionId: string }) {
  const { collections, records, addRecord, deleteRecord, updateCollection, addCollectionTab, deleteCollectionTab, copyRecordsToTab, moveRecordsToTab, reorderRecords } = useAppStore();
  
  const collection = collections.find(c => c.id === collectionId);
  const printRef = useRef<HTMLDivElement>(null);
  

  const [activeTabId, setActiveTabId] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<{ fieldId: string, direction: 'asc' | 'desc' } | null>(null);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFieldManagerOpen, setIsFieldManagerOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RecordItem | null>(null);
  const viewMode = collection.viewMode || 'grid';
  const [isViewSettingsOpen, setIsViewSettingsOpen] = useState(false);
  const [isDataMenuOpen, setIsDataMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ recordId?: string; isBulk?: boolean } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

const handleExportXML = async () => {
    if (!collection) return;
    const loadingToast = toast.loading('Exporting data...');
    try {
      const { exportFullCollection } = await import('../utils/exportImport');
      exportFullCollection(collection, records, activeTabId);
      setIsDataMenuOpen(false);
      toast.success('Export successful!', { id: loadingToast });
    } catch (error) {
      toast.error('Failed to export data.', { id: loadingToast });
    }
  };

const handleImportXML = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!collection) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const loadingToast = toast.loading('Importing data...');
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const xmlString = event.target?.result as string;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "text/xml");

        if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
          toast.error("Invalid XML file format.", { id: loadingToast });
          setIsImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        if (xmlDoc.getElementsByTagName("ListerExport").length > 0) {
          const { parseFullCollectionXML } = await import('../utils/exportImport');
          const { collection: importedCollection, records: importedRecords } = parseFullCollectionXML(xmlString);
          
          if (importedCollection.name !== collection.name) {
            if(!confirm(`This file appears to be for "${importedCollection.name}", but you are in "${collection.name}". Import anyway?`)) {
              if (fileInputRef.current) fileInputRef.current.value = '';
              setIsImporting(false);
              toast.dismiss(loadingToast);
              return;
            }
          }

let importedCount = 0;
          let skippedCount = 0;
          
          // Get current records data to check for duplicates
          const currentRecordsData = records
            .filter(r => r.collectionId === collection.id && r.tabId === activeTabId)
            .map(r => r.data);
          
          // Simulate slight delay for sleek loading animation
          await new Promise(resolve => setTimeout(resolve, 800));

          importedRecords.forEach((rec: any) => {
            // Re-map field data for imported fields that have the same name as current fields
            const mappedData: any = {};
            
            Object.keys(rec.data).forEach(importedFieldId => {
               const importedFieldDef = importedCollection.fields.find(f => f.id === importedFieldId);
               if (importedFieldDef) {
                  const matchingField = collection.fields.find(f => f.id === importedFieldId) || 
                                        collection.fields.find(f => f.name.toLowerCase() === importedFieldDef.name.toLowerCase() && f.type === importedFieldDef.type);
                  if (matchingField) {
                     mappedData[matchingField.id] = rec.data[importedFieldId];
                  }
               }
            });

            const finalData = Object.keys(mappedData).length > 0 ? mappedData : rec.data;

            // Check if this is an exact duplicate
            const isDuplicate = currentRecordsData.some(existingData => {
              return collection.fields.every(field => {
                const val1 = existingData[field.id];
                const val2 = finalData[field.id];
                const norm1 = (val1 === undefined || val1 === null || val1 === false) ? '' : String(val1).trim();
                const norm2 = (val2 === undefined || val2 === null || val2 === false) ? '' : String(val2).trim();
                return norm1 === norm2;
              });
            });

            if (isDuplicate) {
              skippedCount++;
            } else {
              addRecord({
                collectionId: collection.id,
                tabId: activeTabId,
                data: finalData
              });
              importedCount++;
              // Add to local array so we deduplicate against newly added items from this same import!
              currentRecordsData.push(finalData);
            }
          });
          
          let toastMsg = `Imported ${importedCount} records.`;
          if (skippedCount > 0) {
            toastMsg += ` Skipped ${skippedCount} duplicates.`;
          }
          
          if (importedCount === 0 && skippedCount > 0) {
             toast.success(`No new records. Skipped ${skippedCount} duplicates.`, { id: loadingToast });
          } else {
             toast.success(toastMsg, { id: loadingToast });
          }

          setIsDataMenuOpen(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
          setIsImporting(false);
          return;
        }

        toast.error("Unrecognized file format.", { id: loadingToast });
      } catch (err) {
        console.error("Import error:", err);
        toast.error("Failed to parse import file.", { id: loadingToast });
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
      setIsImporting(false);
    };
    reader.onerror = () => {
      toast.error("Failed to read file.", { id: loadingToast });
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const generateProfessionalPDF = (doc: any, title: string, subtitle: string, head: string[][], body: (string | number)[][], fileName: string) => {
    // Top Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    const pageWidth = doc.internal.pageSize.getWidth();
    const titleWidth = doc.getTextWidth(title);
    doc.text(title, (pageWidth - titleWidth) / 2, 16);

    // Subtitle (Item count)
    if (subtitle) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      const subtitleWidth = doc.getTextWidth(subtitle);
      doc.text(subtitle, (pageWidth - subtitleWidth) / 2, 22);
    }
    
    // Generated Date in top right
    const dateStr = `Generated: ${new Date().toLocaleDateString()}`;
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    const dateWidth = doc.getTextWidth(dateStr);
    doc.text(dateStr, pageWidth - dateWidth - 12, 12);

    autoTable(doc, {
      margin: { left: 12, right: 12 },
      startY: subtitle ? 28 : 22,
      head: head,
      body: body,
      theme: 'plain',
      headStyles: { 
        font: 'helvetica',
        fontStyle: 'bold',
        textColor: [0, 0, 0],
        fillColor: [255, 255, 255],
        lineWidth: { bottom: 0.5 }, // thinner line
        lineColor: [0, 0, 0],
        halign: 'left',
        valign: 'middle',
        cellPadding: { top: 4, bottom: 4, left: 4, right: 4 }
      },
      bodyStyles: {
        font: 'helvetica',
        textColor: [30, 30, 30],
        lineWidth: { bottom: 0.2 }, // very thin grey line
        lineColor: [180, 180, 180],
        halign: 'left',
        valign: 'middle',
        cellPadding: { top: 4, bottom: 4, left: 4, right: 4 }
      },
      styles: {
        font: 'helvetica',
        fontSize: 9,
        overflow: 'linebreak'
      },
      columnStyles: {
        0: { halign: 'left', fontStyle: 'bold', cellWidth: 15 }
      }
    });

    doc.save(fileName);
  };

  const handleExportPDFSimplified = () => {
    if (!collection) return;
    const doc = new jsPDF();
    const tab = collection.tabs?.find(t => t.id === activeTabId);
    const tabRecords = records.filter(r => r.collectionId === collection.id && r.tabId === activeTabId);

    const visibleFields = collection.fields.filter(f => 
      !collection.simplifiedViewFieldIds || 
      collection.simplifiedViewFieldIds.length === 0 || 
      collection.simplifiedViewFieldIds.includes(f.id)
    );

    const head = [['No.', ...visibleFields.map(f => f.name)]];
    const body = tabRecords.map((r, i) => [
      `#${i + 1}`,
      ...visibleFields.map(f => {
        const val = r.data[f.id];
        if (f.type === 'checkbox' || f.type === 'tag') return val ? (f.type === 'tag' ? f.name : 'Yes') : '-';
        if (f.type === 'date' && val) return new Date(val).toLocaleDateString();
        return val || '-';
      })
    ]);

    const title = `${collection.name}${tab ? ` - ${tab.name}` : ''}`;
    const subtitle = `${body.length} items`;
    const fileName = `${collection.name.replace(/\s+/g, '_')}_${(tab?.name || 'export').replace(/\s+/g, '_')}_Simplified.pdf`;

    generateProfessionalPDF(doc, title, subtitle, head, body, fileName);
    setIsDataMenuOpen(false);
  };

  const handleExportPDFDetailed = () => {
    if (!collection) return;
    const doc = new jsPDF('landscape');
    const tab = collection.tabs?.find(t => t.id === activeTabId);
    const tabRecords = records.filter(r => r.collectionId === collection.id && r.tabId === activeTabId);

    const head = [['No.', ...collection.fields.map(f => f.name)]];
    const body = tabRecords.map((r, i) => [
      `#${i + 1}`,
      ...collection.fields.map(f => {
        const val = r.data[f.id];
        if (f.type === 'checkbox' || f.type === 'tag') return val ? (f.type === 'tag' ? f.name : 'Yes') : '-';
        if (f.type === 'date' && val) return new Date(val).toLocaleDateString();
        return val || '-';
      })
    ]);

    const title = `${collection.name}${tab ? ` - ${tab.name}` : ''}`;
    const subtitle = `${body.length} items`;
    const fileName = `${collection.name.replace(/\s+/g, '_')}_${(tab?.name || 'export').replace(/\s+/g, '_')}_Detailed.pdf`;

    generateProfessionalPDF(doc, title, subtitle, head, body, fileName);
    setIsDataMenuOpen(false);
  };

  React.useEffect(() => {
    if (collection && !(collection.tabs || []).find(t => t.id === activeTabId)) {
      setActiveTabId((collection.tabs || [])[0]?.id || '');
    }
  }, [collection, activeTabId]);

  if (!collection) return null;

  const activeRecords = records
    .filter(r => r && r.id && r.collectionId === collectionId && r.tabId === activeTabId)
    .sort((a, b) => (a.order || 0) - (b.order || 0));


  const filteredRecords = activeRecords.filter(record => {
    if (!searchQuery) return true;
    const lowerQuery = searchQuery.toLowerCase();
    return Object.values(record.data).some(val => String(val).toLowerCase().includes(lowerQuery));
  }).sort((a, b) => {
    if (!sortConfig || sortConfig.fieldId === 'default') return 0;
    
    const fieldDef = collection.fields.find(f => f.id === sortConfig.fieldId);
    if (!fieldDef) return 0;
    
    let valA = a.data[sortConfig.fieldId];
    let valB = b.data[sortConfig.fieldId];
    
    if (valA === undefined || valA === null) valA = '';
    if (valB === undefined || valB === null) valB = '';
    
    if (fieldDef.type === 'number') {
      const numA = Number(valA) || 0;
      const numB = Number(valB) || 0;
      return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
    }
    
    if (fieldDef.type === 'checkbox') {
      const boolA = !!valA ? 1 : 0;
      const boolB = !!valB ? 1 : 0;
      return sortConfig.direction === 'asc' ? boolA - boolB : boolB - boolA;
    }
    
    const strA = String(valA).toLowerCase();
    const strB = String(valB).toLowerCase();
    
    return sortConfig.direction === 'asc' 
      ? strA.localeCompare(strB) 
      : strB.localeCompare(strA);
  });


  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const startIndex = result.source.index;
    const endIndex = result.destination.index;
    if (startIndex === endIndex) return;
    reorderRecords(collectionId, activeTabId, startIndex, endIndex);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRecords.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRecords.map(r => r.id)));
    }
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleExportPDF = () => {
    window.print();
  };

  const openNewRecordModal = () => {
    if (!collection.fields || collection.fields.length === 0) {
      setIsFieldManagerOpen(true);
      return;
    }
    setEditingRecord(null);
    setIsModalOpen(true);
  };

  const openEditRecordModal = (record: RecordItem, forceOpen: boolean = false) => {
    if (isEditing && !forceOpen) {
      toggleSelection(record.id);
      return;
    }
    setEditingRecord(record);
    setIsModalOpen(true);
  };
  
  const handleBulkAction = (action: 'delete' | 'copy' | 'move', targetTabId?: string) => {
    if (selectedIds.size === 0) return;
    
    if (action === 'delete') {
      setDeleteConfirm({ isBulk: true });
    } else if (action === 'copy' && targetTabId) {
      copyRecordsToTab(Array.from(selectedIds), targetTabId);
      setShowCopyModal(false);
      setSelectedIds(new Set());
      setIsEditing(false);
    } else if (action === 'move' && targetTabId) {
      moveRecordsToTab(Array.from(selectedIds), targetTabId);
      setShowCopyModal(false);
      setSelectedIds(new Set());
      setIsEditing(false);
    }
  };

  const executeDelete = () => {
    if (deleteConfirm?.isBulk) {
      Array.from(selectedIds).forEach(id => deleteRecord(id));
      setSelectedIds(new Set());
      setIsEditing(false);
    } else if (deleteConfirm?.recordId) {
      deleteRecord(deleteConfirm.recordId);
    }
    setDeleteConfirm(null);
  };

  const opt = ICON_OPTIONS.find(o => o.id === collection.icon) || ICON_OPTIONS[0];
  const CollectionIcon = opt.icon;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0a0a]">
      <style>
        {`
          @media print {
            body * { visibility: hidden; }
            .print-area, .print-area * { visibility: visible; }
            .print-area { position: absolute; left: 0; top: 0; width: 100%; }
            .no-print { display: none !important; }
            .hide-scrollbar::-webkit-scrollbar { display: none; }
            .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          }
        `}
      </style>

      {/* Top Header matching the screenshot */}
      <div className="flex-shrink-0 px-8 py-6 border-b border-zinc-900 bg-[#0a0a0a] no-print">
         <div className="flex items-start justify-between">
           <div className="flex items-center gap-5">
             <div className={`w-[60px] h-[60px] rounded-2xl flex items-center justify-center border ${opt.theme.bg} ${opt.theme.text} ${opt.theme.border}`}>
               <CollectionIcon size={28} />
             </div>
             <div className="flex flex-col justify-center">
               <h1 className="text-2xl font-bold text-white tracking-tight leading-tight">{collection.name}</h1>
               <p className="text-zinc-400 mt-1 text-sm">{collection.description || 'Just to make the well arranged list'}</p>
             </div>
           </div>
           
           <div className="flex items-center gap-3">
             <button 
                onClick={() => setIsDataMenuOpen(true)}
                className="p-2.5 text-zinc-400 hover:text-white bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800/80 rounded-xl transition-colors"
                title="Data Options"
             >
               <Database size={20} />
             </button>
             <button 
                onClick={() => setIsFieldManagerOpen(true)}
                className="p-2.5 text-zinc-400 hover:text-white bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800/80 rounded-xl transition-colors"
                title="Setup Fields"
             >
               <Settings size={20} />
             </button>
             
           </div>
         </div>
      </div>

      {/* Search Bar */}
      <div className="px-8 py-4 border-b border-zinc-900 bg-[#0a0a0a] no-print shrink-0 flex justify-between items-center gap-4">
        <div className="flex-1 max-w-2xl flex items-center gap-3">
          <div className="relative flex-1">
             <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
             <input 
               type="text" 
               placeholder="Search records or apply sort..." 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="w-full pl-9 pr-4 py-2 bg-zinc-900/40 border border-zinc-800/80 rounded-xl text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 transition-colors placeholder:text-zinc-600"
             />
          </div>
          
          <div className="relative">
             <button 
                onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  sortConfig 
                    ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20' 
                    : 'bg-zinc-900/50 text-zinc-400 border-zinc-800/80 hover:text-white hover:bg-zinc-800'
                }`}
             >
                <ArrowUpDown size={16} />
                Sort {sortConfig ? 'Active' : ''}
             </button>
             
             {isSortMenuOpen && (
               <>
                 <div className="fixed inset-0 z-40" onClick={() => setIsSortMenuOpen(false)} />
                 <div className="absolute top-full right-0 mt-2 w-64 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">

                   <div className="max-h-96 overflow-y-auto custom-scrollbar">
                     <button
                       onClick={() => {
                         setSortConfig(null);
                         setIsSortMenuOpen(false);
                       }}
                       className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors ${
                         !sortConfig ? 'text-white bg-zinc-800/50' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'
                       }`}
                     >
                       <span>Manual Order (Drag & Drop)</span>
                       {!sortConfig && <Check size={16} className="text-indigo-400" />}
                     </button>
                     
                     {['text', 'select', 'url'].some(t => collection.fields.some(f => f.type === t)) && (
                       <>
                         <div className="px-4 pt-3 pb-1 mt-1 border-t border-zinc-800/50">
                           <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Alphabetical (A-Z)</h3>
                         </div>
                         {collection.fields.filter(f => ['text', 'select', 'url'].includes(f.type)).map(field => {
                           const isSelected = sortConfig?.fieldId === field.id;
                           return (
                             <button
                               key={field.id}
                               onClick={() => setSortConfig({ fieldId: field.id, direction: isSelected && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                               className={`w-full flex items-center justify-between px-4 py-1.5 text-sm transition-colors ${
                                 isSelected ? 'text-white bg-zinc-800/50' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'
                               }`}
                             >
                               <span className="truncate pr-2">{field.name}</span>
                               {isSelected && (sortConfig.direction === 'asc' ? <ArrowDown size={14} className="text-indigo-400 shrink-0" /> : <ArrowUp size={14} className="text-indigo-400 shrink-0" />)}
                             </button>
                           );
                         })}
                       </>
                     )}

                     {collection.fields.some(f => f.type === 'number') && (
                       <>
                         <div className="px-4 pt-3 pb-1 mt-1 border-t border-zinc-800/50">
                           <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Numerical (0-9)</h3>
                         </div>
                         {collection.fields.filter(f => f.type === 'number').map(field => {
                           const isSelected = sortConfig?.fieldId === field.id;
                           return (
                             <button
                               key={field.id}
                               onClick={() => setSortConfig({ fieldId: field.id, direction: isSelected && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                               className={`w-full flex items-center justify-between px-4 py-1.5 text-sm transition-colors ${
                                 isSelected ? 'text-white bg-zinc-800/50' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'
                               }`}
                             >
                               <span className="truncate pr-2">{field.name}</span>
                               {isSelected && (sortConfig.direction === 'asc' ? <ArrowDown size={14} className="text-indigo-400 shrink-0" /> : <ArrowUp size={14} className="text-indigo-400 shrink-0" />)}
                             </button>
                           );
                         })}
                       </>
                     )}

                     {collection.fields.some(f => f.type === 'date') && (
                       <>
                         <div className="px-4 pt-3 pb-1 mt-1 border-t border-zinc-800/50">
                           <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Date & Time</h3>
                         </div>
                         {collection.fields.filter(f => f.type === 'date').map(field => {
                           const isSelected = sortConfig?.fieldId === field.id;
                           return (
                             <button
                               key={field.id}
                               onClick={() => setSortConfig({ fieldId: field.id, direction: isSelected && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                               className={`w-full flex items-center justify-between px-4 py-1.5 text-sm transition-colors ${
                                 isSelected ? 'text-white bg-zinc-800/50' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'
                               }`}
                             >
                               <span className="truncate pr-2">{field.name}</span>
                               {isSelected && (sortConfig.direction === 'asc' ? <ArrowDown size={14} className="text-indigo-400 shrink-0" /> : <ArrowUp size={14} className="text-indigo-400 shrink-0" />)}
                             </button>
                           );
                         })}
                       </>
                     )}

                     {collection.fields.some(f => ['checkbox', 'tag'].includes(f.type)) && (
                       <>
                         <div className="px-4 pt-3 pb-1 mt-1 border-t border-zinc-800/50">
                           <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Status & Tags</h3>
                         </div>
                         {collection.fields.filter(f => ['checkbox', 'tag'].includes(f.type)).map(field => {
                           const isSelected = sortConfig?.fieldId === field.id;
                           return (
                             <button
                               key={field.id}
                               onClick={() => setSortConfig({ fieldId: field.id, direction: isSelected && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                               className={`w-full flex items-center justify-between px-4 py-1.5 text-sm transition-colors ${
                                 isSelected ? 'text-white bg-zinc-800/50' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'
                               }`}
                             >
                               <span className="truncate pr-2">{field.name}</span>
                               {isSelected && (sortConfig.direction === 'asc' ? <ArrowDown size={14} className="text-indigo-400 shrink-0" /> : <ArrowUp size={14} className="text-indigo-400 shrink-0" />)}
                             </button>
                           );
                         })}
                       </>
                     )}
                   </div>

                 </div>
               </>
             )}
          </div>
        </div>
        <div className="text-sm text-zinc-500 font-medium shrink-0">
          {filteredRecords.length} items
        </div>
      </div>

      {/* Tabs and Actions */}
      <div className="px-8 py-3 flex items-center justify-between border-b border-zinc-900 bg-[#0a0a0a] no-print shrink-0">
         
         {/* Scrollable Tabs */}
         <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar flex-1 mr-6 relative mask-fade-right">
            {(collection.tabs || []).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
                  activeTabId === tab.id 
                    ? 'bg-zinc-800 text-white shadow-sm' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
         </div>
         
         {/* Icon Actions */}
         <div className="flex items-center gap-2 shrink-0">
          <button 
             onClick={openNewRecordModal}
             className="flex items-center justify-center text-zinc-900 bg-white hover:bg-zinc-200 w-8 h-8 rounded-lg transition-colors shadow-sm"
             title="New Item"
           >
             <Plus size={18} />
           </button>

          <div className="w-px h-5 bg-zinc-800/80 mx-1"></div>

          <button 
            onClick={() => {
              setIsEditing(!isEditing);
              setSelectedIds(new Set());
            }}
            className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors border ${
              isEditing 
                ? 'bg-zinc-100 border-zinc-100 text-zinc-900' 
                : 'bg-zinc-900/50 border-zinc-800/50 hover:border-zinc-700 text-zinc-400'
            }`}
            title={isEditing ? 'Done Editing' : 'Edit Mode'}
          >
            <ListChecks size={18} />
          </button>
<button 
            onClick={() => setIsViewSettingsOpen(true)}
            className="flex items-center justify-center w-8 h-8 text-zinc-400 hover:text-zinc-200 bg-zinc-900/50 hover:bg-zinc-800 rounded-lg transition-colors border border-zinc-800/50 shadow-sm"
            title="View Options"
          >
            <SlidersHorizontal size={16} />
          </button>
          
          
         </div>
      </div>

      {/* Editing Bulk Actions */}
      {isEditing && (
         <div className={`px-6 py-3 ${selectedIds.size > 0 ? 'bg-zinc-800/30 border-b border-zinc-800' : 'bg-zinc-900/20 border-b border-zinc-900'} flex items-center justify-between no-print shrink-0 motion-enter`}>
          <div className="flex items-center gap-3">
            <button 
              onClick={toggleSelectAll}
              className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                selectedIds.size === filteredRecords.length && filteredRecords.length > 0
                  ? 'bg-zinc-100 border-zinc-100 text-zinc-900'
                  : 'border-zinc-700 bg-zinc-950'
              }`}
            >
              {selectedIds.size === filteredRecords.length && filteredRecords.length > 0 && <Check size={12} />}
            </button>
            <span className={`text-sm font-medium ${selectedIds.size > 0 ? 'text-zinc-100' : 'text-zinc-500'}`}>
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select items'}
            </span>
          </div>
          {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowCopyModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium rounded-md transition-colors border border-zinc-800"
            >
              <Copy size={14} /> Copy / Move To...
            </button>
            <button 
              onClick={() => handleBulkAction('delete')}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-medium rounded-md transition-colors border border-red-500/20"
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
          )}
        </div>
      )}
        {/* Content Area */}
      <div className="flex-1 overflow-auto bg-[#0a0a0a] p-0 print-area" ref={printRef}>
        
        {(!collection.fields || collection.fields.length === 0) ? (
           <div className="m-8 flex flex-col items-center justify-center h-64 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20">
             <p className="text-zinc-500 font-medium">This list doesn't have any fields yet.</p>
             <button onClick={() => setIsFieldManagerOpen(true)} className="mt-4 px-4 py-2 bg-zinc-800 text-white rounded-lg text-sm font-medium">
               Setup Form Fields
             </button>
           </div>
        ) : filteredRecords.length === 0 ? (
          <div className="m-8 flex flex-col items-center justify-center h-64 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20">
            <p className="text-zinc-500 font-medium">No items added to this tab yet.</p>
            <p className="text-zinc-600 text-sm mt-1">Click "New Item" to start building your list.</p>
          </div>
        ) : (
          <>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="record-list">
                {(provided) => (
                     <div 
                    {...provided.droppableProps} 
                    ref={provided.innerRef}
                    className={`
                       ${viewMode === 'grid' ? 'flex flex-col gap-4 p-8 max-w-5xl mx-auto motion-stagger' : 'flex flex-col gap-3 p-6 max-w-6xl mx-auto motion-stagger'}
                    `}
                  >
                    {filteredRecords.map((record, index) => {
                      const displayFields = viewMode === 'list' 
                        ? collection.fields.filter(f => !collection.simplifiedViewFieldIds || collection.simplifiedViewFieldIds.length === 0 || collection.simplifiedViewFieldIds.includes(f.id))
                        : collection.fields;

                      const mainField = displayFields.find(f => f.id === collection.fields[0]?.id) || displayFields[0];
                      const tagFields = displayFields.filter(f => f.type === 'checkbox' || f.type === 'tag');
                      const otherFields = displayFields.filter(f => f.id !== mainField?.id && f.type !== 'checkbox' && f.type !== 'tag');

                      return (
                      <Draggable key={record.id} draggableId={record.id} index={index} isDragDisabled={!isEditing || searchQuery !== '' || sortConfig !== null}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            onClick={() => {
                              if (isEditing) toggleSelection(record.id);
                            }}
                            className={`
                              group transition-all relative overflow-hidden border
                              ${isEditing ? 'cursor-pointer' : 'cursor-default'}
                              ${snapshot.isDragging ? 'z-50 shadow-2xl opacity-90 scale-105' : ''}
                              ${selectedIds.has(record.id) ? 'bg-zinc-800/40 border-zinc-700' : 'bg-zinc-900 hover:bg-zinc-800/60 border-zinc-800/80 hover:border-zinc-700'}
                              p-5 rounded-2xl flex flex-col gap-4
                            `}
                          >
                            <div className="flex items-center gap-3 pb-4 mb-2 border-b border-zinc-800/60">
                               {(isEditing || snapshot.isDragging) && !searchQuery && !sortConfig ? (
                                <div {...provided.dragHandleProps} className="text-zinc-600 hover:text-zinc-400 cursor-grab active:cursor-grabbing no-print p-1 -ml-2" onClick={(e) => { e.stopPropagation(); }}>
                                  <GripVertical size={16} />
                                </div>
                              ) : (
                                <div className="text-xs font-medium text-zinc-600 w-6 h-6 rounded bg-zinc-800/80 flex items-center justify-center text-[10px]">
                                  {`#${index + 1}`}
                                </div>
                              )}
                              
                              {isEditing && (
                                <div 
                                  className="no-print mr-3"
                                  onClick={(e) => { e.stopPropagation(); toggleSelection(record.id); }}
                                >
                                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                                    selectedIds.has(record.id) ? 'bg-zinc-100 border-zinc-100 text-zinc-900' : 'border-zinc-700 bg-zinc-950'
                                  }`}>
                                    {selectedIds.has(record.id) && <Check size={12} />}
                                  </div>
                                </div>
                              )}
                              
                              {/* Title and tags in header */}
                              {mainField && (
                                <div className="flex-1 flex flex-col gap-2 min-w-0">
                                  <div className="flex flex-wrap items-center gap-3">
                                    <h4 className="text-[17px] font-bold text-zinc-100 tracking-tight leading-tight">
                                      {String(record.data[mainField.id] || '—')}
                                    </h4>
                                    
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {tagFields.map(f => {
                                        if (!record.data[f.id]) return null;
                                        
                                        let bgClass = "bg-zinc-500/10 text-zinc-300 border-zinc-500/20";
                                        if (f.type === 'tag' && f.color) {
                                          const colors = {
                                            blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
                                            emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                                            amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
                                            rose: "bg-rose-500/10 text-rose-400 border-rose-500/20",
                                            purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
                                            zinc: "bg-zinc-500/10 text-zinc-300 border-zinc-500/20"
                                          };
                                          bgClass = colors[f.color as keyof typeof colors] || bgClass;
                                        } else if (f.type === 'checkbox') {
                                           bgClass = "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
                                        }
                                        
                                        return (
                                          <span key={f.id} className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${bgClass}`}>
                                            {f.name}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {otherFields.length > 0 && (
                              <div className="flex flex-wrap gap-x-8 gap-y-4 items-center bg-zinc-950/40 p-4 rounded-xl border border-zinc-800/40">
                                {otherFields.map(field => {
                                  const val = record.data[field.id];
                                  return (
                                    <div key={field.id} className="flex flex-col gap-1 min-w-0 pr-4">
                                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{field.name}</span>
                                      <span className="text-sm font-medium text-zinc-200 truncate" title={String(val || '')}>
                                        {field.type === 'date' ? (val ? new Date(val).toLocaleDateString() : '—') : (val !== undefined && val !== null && val !== '' ? String(val) : '—')}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            
                            {/* Quick Edit and Delete buttons (Visible only in Edit Mode) */}
                            {isEditing && (
                              <div 
                                className="flex items-center gap-2 no-print shrink-0 absolute top-4 right-4"
                                onPointerDown={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    openEditRecordModal(record, true);
                                  }}
                                  className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors border border-transparent hover:border-zinc-700 relative z-10"
                                  title="Edit item"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setDeleteConfirm({ recordId: record.id });
                                  }}
                                  className="p-2 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors border border-transparent hover:border-rose-500/20 relative z-10"
                                  title="Delete item"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </>
        )}
      </div>

      {isModalOpen && (
        <RecordModal 
          collection={collection} 
          record={editingRecord}
          tabId={activeTabId}
          onClose={() => setIsModalOpen(false)} 
        />
      )}

      {isFieldManagerOpen && (
        <FieldManager 
          collection={collection}
          onClose={() => setIsFieldManagerOpen(false)}
        />
      )}
      
      
      
      {/* Data Options Modal */}

      {isImporting && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex flex-col items-center justify-center">
           <div className="w-12 h-12 border-4 border-zinc-800 border-t-indigo-500 rounded-full animate-spin"></div>
           <p className="mt-4 text-zinc-300 font-medium tracking-wide animate-pulse">Processing Data...</p>
        </div>
      )}

      {isDataMenuOpen && (

        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setIsDataMenuOpen(false); }}>
          <div className="bg-[#0a0a0a] border border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-zinc-900 flex items-center justify-between bg-zinc-950/50">
              <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                <Database size={18} className="text-indigo-400" />
                Data Options
              </h3>
              <button 
                onClick={() => setIsDataMenuOpen(false)}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 space-y-2">
              <input type="file" ref={fileInputRef} onChange={handleImportXML} accept=".xml" className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all group text-left">
                <div className="w-10 h-10 rounded-lg bg-zinc-900 group-hover:bg-indigo-500/10 border border-zinc-800 group-hover:border-indigo-500/20 flex items-center justify-center shrink-0 transition-colors">
                  <Download size={18} className="text-zinc-400 group-hover:text-indigo-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors">Import Data</h4>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Load XML records into this tab</p>
                </div>
              </button>
              
              <button onClick={handleExportXML} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all group text-left">
                <div className="w-10 h-10 rounded-lg bg-zinc-900 group-hover:bg-emerald-500/10 border border-zinc-800 group-hover:border-emerald-500/20 flex items-center justify-center shrink-0 transition-colors">
                  <Upload size={18} className="text-zinc-400 group-hover:text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors">Export Data</h4>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Save this tab's records to XML</p>
                </div>
              </button>
              
              <div className="h-px bg-zinc-900/80 my-2"></div>
              
              <button onClick={handleExportPDFSimplified} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all group text-left">
                <div className="w-10 h-10 rounded-lg bg-zinc-900 group-hover:bg-rose-500/10 border border-zinc-800 group-hover:border-rose-500/20 flex items-center justify-center shrink-0 transition-colors">
                  <FileText size={18} className="text-zinc-400 group-hover:text-rose-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors">PDF (Simplified)</h4>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Export this tab's table view as PDF</p>
                </div>
              </button>
              
              <button onClick={handleExportPDFDetailed} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all group text-left">
                <div className="w-10 h-10 rounded-lg bg-zinc-900 group-hover:bg-amber-500/10 border border-zinc-800 group-hover:border-amber-500/20 flex items-center justify-center shrink-0 transition-colors">
                  <FileText size={18} className="text-zinc-400 group-hover:text-amber-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors">PDF (Detailed)</h4>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Export this tab's full info as PDF</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Settings Modal */}
      {isViewSettingsOpen && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setIsViewSettingsOpen(false); }}>
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h3 className="text-lg font-bold text-white tracking-tight">View Options</h3>
              <button 
                onClick={() => setIsViewSettingsOpen(false)}
                className="p-1 text-zinc-500 hover:text-zinc-300 rounded-lg hover:bg-zinc-900 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Layout Style</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => updateCollection(collection.id, { viewMode: 'grid' })}
                      className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all ${viewMode === 'grid' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:border-zinc-700'}`}
                    >
                      <LayoutGrid size={24} />
                      <span className="text-xs font-medium">Grid View</span>
                    </button>
                    <button 
                      onClick={() => updateCollection(collection.id, { viewMode: 'list' })}
                      className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all ${viewMode === 'list' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:border-zinc-700'}`}
                    >
                      <List size={24} />
                      <span className="text-xs font-medium">List View</span>
                    </button>
                  </div>
                </div>

                {viewMode === 'list' && (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">List View Fields</label>
                    <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
                      Select which fields to display when using the simplified list layout.
                    </p>
                    
                    <div className="space-y-2">
                      {collection.fields.map(field => {
                        const isSelected = !collection.simplifiedViewFieldIds || 
                                         collection.simplifiedViewFieldIds.length === 0 || 
                                         collection.simplifiedViewFieldIds.includes(field.id);
                        
                        return (
                          <div 
                            key={field.id}
                            onClick={() => {
                              let newIds = collection.simplifiedViewFieldIds || collection.fields.map(f => f.id);
                              if (isSelected) {
                                newIds = newIds.filter(id => id !== field.id);
                                if (newIds.length === 0) newIds = [collection.fields[0].id]; // Ensure at least one field
                              } else {
                                newIds = [...newIds, field.id];
                              }
                              updateCollection(collection.id, { simplifiedViewFieldIds: newIds });
                            }}
                            className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${isSelected ? 'bg-zinc-900 border-zinc-700' : 'bg-zinc-950 border-zinc-800/50 opacity-60 hover:opacity-100 hover:bg-zinc-900/50'}`}
                          >
                            <span className={`text-sm font-medium ${isSelected ? 'text-zinc-200' : 'text-zinc-500'}`}>{field.name}</span>
                            <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-zinc-900 border-zinc-700'}`}>
                               {isSelected && <Check size={12} strokeWidth={3} />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 border-t border-zinc-800 shrink-0">
              <button 
                onClick={() => setIsViewSettingsOpen(false)}
                className="w-full bg-indigo-500 hover:bg-indigo-400 text-white py-2.5 rounded-xl font-medium transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copy/Move Modal */}

      {showCopyModal && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowCopyModal(false); }}>
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Copy / Move Items</h3>
            <p className="text-sm text-zinc-400 mb-6">Select a destination tab for the {selectedIds.size} selected items.</p>
            
            <div className="space-y-2 mb-6">
              {(collection.tabs || []).filter(t => t.id !== activeTabId).map(tab => (
                <div key={tab.id} className="flex gap-2">
                  <button
                    onClick={() => handleBulkAction('copy', tab.id)}
                    className="flex-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 py-2 px-3 rounded-lg text-sm transition-colors text-left flex items-center justify-between"
                  >
                    <span>Copy to {tab.name}</span>
                    <Copy size={14} />
                  </button>
                  <button
                    onClick={() => handleBulkAction('move', tab.id)}
                    className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 py-2 px-3 rounded-lg text-sm transition-colors text-left flex items-center justify-between"
                  >
                    <span>Move to {tab.name}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              ))}
              {(collection.tabs || []).length <= 1 && (
                <p className="text-sm text-zinc-500 italic">No other tabs available. Create one first.</p>
              )}
            </div>
            
            <button 
              onClick={() => setShowCopyModal(false)}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-fade-in" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-[#0a0a0a] border border-zinc-800/60 rounded-[32px] w-full max-w-[400px] shadow-[0_0_80px_rgba(225,29,72,0.15)] relative overflow-hidden animate-slide-up flex flex-col my-auto" onClick={e => e.stopPropagation()}>
            <div className="p-8 pb-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-[24px] bg-rose-500/10 flex items-center justify-center mb-6 border border-rose-500/20">
                <Trash2 size={28} className="text-rose-500" />
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight mb-3">
                Delete {deleteConfirm.isBulk ? `${selectedIds.size} Items` : 'Item'}?
              </h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                This action cannot be undone. {deleteConfirm.isBulk ? 'These items' : 'This item'} will be permanently removed.
              </p>
            </div>
            
            <div className="p-6 pt-2 flex items-center justify-between gap-3">
              <button 
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-6 py-3 text-zinc-400 font-medium hover:text-white transition-colors rounded-2xl hover:bg-zinc-800/60"
              >
                Cancel
              </button>
              <button 
                onClick={executeDelete}
                className="flex-1 px-8 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-2xl transition-all shadow-[0_0_15px_rgba(225,29,72,0.2)] active:scale-95"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

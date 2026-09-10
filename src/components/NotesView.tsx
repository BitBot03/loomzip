import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, Trash2, Search, Edit3, Eye, Pin, PinOff, 
  Tag, Palette, Type, Bold, Italic, List, ListOrdered, 
  Quote, Code, Link, Clock, StickyNote, MoreVertical, Hash, X,
  Strikethrough, Highlighter, Heading1, Heading2, Heading3, Minus,
  Check, ListChecks, CheckCircle2, Circle, AlertTriangle
} from 'lucide-react';
import { useAppStore } from '../store';
import { Note } from '../types';
import Markdown from 'react-markdown';
import { renderToStaticMarkup } from 'react-dom/server';
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import htmlToPdfmake from "html-to-pdfmake";

// Vite/rollup imports module.exports as the default export for CJS files.
// pdfFonts could be the vfs object itself, or have a vfs property, or a default property.
const vfs = pdfFonts?.pdfMake?.vfs || pdfFonts?.vfs || pdfFonts?.default || pdfFonts;
pdfMake.vfs = vfs;
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
import toast from 'react-hot-toast';

const NOTE_COLORS = [
  { 
    id: 'default', 
    baseBg: 'bg-zinc-800/40', 
    hoverBg: 'hover:bg-zinc-800/60', 
    activeBg: 'bg-zinc-700/40', 
    activeBorder: 'border-zinc-400/70', 
    dot: 'bg-zinc-400', 
    text: 'text-zinc-100' 
  },
  { 
    id: 'red', 
    baseBg: 'bg-[#FF3B30]/10', 
    hoverBg: 'hover:bg-[#FF3B30]/20', 
    activeBg: 'bg-[#FF3B30]/25', 
    activeBorder: 'border-[#FF3B30]/80', 
    dot: 'bg-[#FF3B30]', 
    text: 'text-[#FF3B30]' 
  },
  { 
    id: 'orange', 
    baseBg: 'bg-[#FF9500]/10', 
    hoverBg: 'hover:bg-[#FF9500]/20', 
    activeBg: 'bg-[#FF9500]/25', 
    activeBorder: 'border-[#FF9500]/80', 
    dot: 'bg-[#FF9500]', 
    text: 'text-[#FF9500]' 
  },
  { 
    id: 'yellow', 
    baseBg: 'bg-[#FFCC00]/10', 
    hoverBg: 'hover:bg-[#FFCC00]/20', 
    activeBg: 'bg-[#FFCC00]/25', 
    activeBorder: 'border-[#FFCC00]/80', 
    dot: 'bg-[#FFCC00]', 
    text: 'text-[#FFCC00]' 
  },
  { 
    id: 'green', 
    baseBg: 'bg-[#34C759]/10', 
    hoverBg: 'hover:bg-[#34C759]/20', 
    activeBg: 'bg-[#34C759]/25', 
    activeBorder: 'border-[#34C759]/80', 
    dot: 'bg-[#34C759]', 
    text: 'text-[#34C759]' 
  },
  { 
    id: 'blue', 
    baseBg: 'bg-[#007AFF]/10', 
    hoverBg: 'hover:bg-[#007AFF]/20', 
    activeBg: 'bg-[#007AFF]/25', 
    activeBorder: 'border-[#007AFF]/80', 
    dot: 'bg-[#007AFF]', 
    text: 'text-[#007AFF]' 
  },
  { 
    id: 'purple', 
    baseBg: 'bg-[#AF52DE]/10', 
    hoverBg: 'hover:bg-[#AF52DE]/20', 
    activeBg: 'bg-[#AF52DE]/25', 
    activeBorder: 'border-[#AF52DE]/80', 
    dot: 'bg-[#AF52DE]', 
    text: 'text-[#AF52DE]' 
  }
];

export default function NotesView() {
  const { notes, addNote, updateNote, deleteNote } = useAppStore();
  const [activeNoteId, setActiveNoteId] = useState<string | null>(notes.length > 0 ? notes[0].id : null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());

  const executeBulkDelete = () => {
    selectedNoteIds.forEach(id => deleteNote(id));
    setSelectedNoteIds(new Set());
    setIsMultiSelectMode(false);
    toast.success(`${selectedNoteIds.size} notes deleted`);
    
    // If the active note was deleted, reset it
    if (activeNoteId && selectedNoteIds.has(activeNoteId)) {
      setActiveNoteId(notes.length > selectedNoteIds.size ? notes.filter(n => !selectedNoteIds.has(n.id))[0].id : null);
    }
    setDeleteConfirmation(null);
  };
  const [isEditing, setIsEditing] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ type: 'single' | 'bulk', id?: string } | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeNote = notes.find(n => n.id === activeNoteId);

  // Auto-focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing, activeNoteId]);

  const cleanupEmptyNotes = (exemptId?: string) => {
    const storeNotes = useAppStore.getState().notes;
    storeNotes.forEach(note => {
      if (note.id !== exemptId && (!note.title.trim() || note.title === 'Untitled Note') && !note.content.trim()) {
        useAppStore.getState().deleteNote(note.id);
      }
    });
  };

  useEffect(() => {
    return () => cleanupEmptyNotes();
  }, []);

  const handleCreateNote = () => {
    cleanupEmptyNotes();
    const newNote = addNote({ title: 'Untitled Note', content: '', pinned: false, tags: [], color: 'default' });
    setActiveNoteId(newNote.id);
    setIsEditing(true);
    toast.success('New note created');
  };

  const executeSingleDelete = (id: string) => {
    deleteNote(id);
    toast.success('Note deleted');
    if (activeNoteId === id) {
      const remainingNotes = notes.filter(n => n.id !== id);
      setActiveNoteId(remainingNotes.length > 0 ? remainingNotes[0].id : null);
    }
    setDeleteConfirmation(null);
  };

  const insertFormatting = (prefix: string, suffix: string = '') => {
    if (!textareaRef.current || !activeNote) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = activeNote.content;
    const before = text.substring(0, start);
    const selection = text.substring(start, end);
    const after = text.substring(end);
    
    const newText = before + prefix + selection + suffix + after;
    updateNote(activeNote.id, { content: newText });
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start + prefix.length, end + prefix.length);
      }
    }, 0);
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTag.trim() && activeNote) {
      const tags = activeNote.tags || [];
      if (!tags.includes(newTag.trim())) {
        updateNote(activeNote.id, { tags: [...tags, newTag.trim()] });
      }
      setNewTag('');
      setShowTagInput(false);
    } else if (e.key === 'Escape') {
      setShowTagInput(false);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!activeNote) return;
    updateNote(activeNote.id, { 
      tags: (activeNote.tags || []).filter(t => t !== tagToRemove) 
    });
  };

  const filteredNotes = notes.filter(n => {
    if (!n || !n.id) return false;
    const titleMatch = n.title ? n.title.toLowerCase().includes(searchQuery.toLowerCase()) : false;
    const contentMatch = n.content ? n.content.toLowerCase().includes(searchQuery.toLowerCase()) : false;
    const tagMatch = n.tags ? n.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())) : false;
    return titleMatch || contentMatch || tagMatch;
  }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const pinnedNotes = filteredNotes.filter(n => n.pinned);
  const unpinnedNotes = filteredNotes.filter(n => !n.pinned);

  const wordCount = activeNote?.content.trim() ? activeNote.content.trim().split(/\s+/).length : 0;
  const charCount = activeNote?.content.length || 0;

    const NoteListItem = ({ note }: { note: Note }) => {
    const colorTheme = NOTE_COLORS.find(c => c.id === note.color) || NOTE_COLORS[0];
    const isSelected = selectedNoteIds.has(note.id);
    const isActive = !isMultiSelectMode && activeNoteId === note.id;
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
        return (
      <div 
        onClick={() => { 
          if (isMultiSelectMode) {
            const next = new Set(selectedNoteIds);
            if (next.has(note.id)) next.delete(note.id);
            else next.add(note.id);
            setSelectedNoteIds(next);
          } else {
            cleanupEmptyNotes(note.id);
            setActiveNoteId(note.id); setIsEditing(false); 
          }
        }}
        className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer group relative ${isMenuOpen ? 'z-50' : 'z-10'} ${
          isActive 
            ? `${colorTheme.activeBg} ${colorTheme.activeBorder} shadow-lg shadow-black/20 scale-[1.01]` 
            : `${colorTheme.baseBg} border-transparent ${colorTheme.hoverBg} hover:border-zinc-700/50`
        }`}
      >
        <div className="flex justify-between items-start mb-1">
          <div className="flex items-start gap-2 max-w-[85%]">
            {isMultiSelectMode && (
              <div className="shrink-0 mt-0.5">
                {isSelected ? (
                  <CheckCircle2 size={16} className="text-white" />
                ) : (
                  <Circle size={16} className="text-zinc-600" />
                )}
              </div>
            )}
            <h4 className={`font-semibold truncate transition-colors ${isActive ? (colorTheme.id === 'default' ? 'text-zinc-100' : colorTheme.text) : 'text-zinc-200 group-hover:text-zinc-100'}`}>
              {note.title || 'Untitled Note'}
            </h4>
          </div>
          
          <div className={`absolute right-3 top-3 transition-opacity ${!isMultiSelectMode ? 'opacity-100' : 'opacity-0'}`}>
            <button 
              onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
              className="p-1 hover:bg-zinc-800/60 rounded-md text-zinc-400 hover:text-white transition-colors"
            >
              <MoreVertical size={14} />
            </button>
            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); }} />
                <div className="absolute right-0 top-full mt-1 w-40 bg-zinc-900 border border-zinc-800/60 rounded-xl shadow-xl z-50 overflow-hidden py-1">
                  <button 
                    onClick={(e) => { e.stopPropagation(); updateNote(note.id, { pinned: !note.pinned }); setIsMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800/80 hover:text-white transition-colors"
                  >
                    {note.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                    {note.pinned ? 'Unpin Note' : 'Pin Note'}
                  </button>
                  <button 
                    onClick={async (e) => { 
                      e.stopPropagation(); 
                      setIsMenuOpen(false);
                      try {
                        toast.loading('Generating PDF...', { id: 'pdf-gen' });
                        const markdownHtml = renderToStaticMarkup(
                          <Markdown remarkPlugins={[remarkGfm, remarkBreaks]} rehypePlugins={[rehypeRaw]}>
                            {note.content || "Empty Note"}
                          </Markdown>
                        );
                        
                        // Pre-process HTML for perfect blockquotes in PDF
                        const processedMarkdownHtml = markdownHtml.replace(
                          /<blockquote[^>]*>([\s\S]*?)<\/blockquote>/g,
                          (match, p1) => {
                            const inlineContent = p1.replace(/<p[^>]*>/g, '').replace(/<\/p>/g, '<br/>').trim().replace(/(<br\/>)+$/, '');
                            return `<table style="margin-bottom: 10pt;" cellpadding="0" cellspacing="0">
                              <tr>
                                <td style="border-left: 4px solid #cbd5e1; border-top: none; border-right: none; border-bottom: none; background-color: #f8fafc; color: #475569; padding: 8pt; font-style: italic;">
                                  ${inlineContent}
                                </td>
                              </tr>
                            </table>`;
                          }
                        );

                        const htmlContent = `
                          <div>
                            <h1 style="font-size: 28pt; font-weight: bold; color: #0f172a; margin-bottom: 4pt;">${note.title || 'Untitled Note'}</h1>
                            <p style="color: #64748b; font-size: 10pt; margin-bottom: 16pt;">Generated on ${new Date().toLocaleDateString()}</p>
                            <div style="border-bottom: 1px solid #e2e8f0; margin-bottom: 20pt;"></div>
                            <div>
                              ${processedMarkdownHtml}
                            </div>
                          </div>
                        `;
                        
                        // Strip whitespace between HTML tags to prevent htmlToPdfmake from injecting massive spaces
                        const minifiedHtml = htmlContent.replace(/>\s+</g, '><').trim();

                        // We render the HTML to pdfmake syntax
                        const pdfMakeContent = htmlToPdfmake(minifiedHtml, {
                          removeExtraBlanks: true,
                          defaultStyles: {
                            h1: { fontSize: 20, bold: true, color: '#1e293b', margin: [0, 16, 0, 8] },
                            h2: { fontSize: 16, bold: true, color: '#334155', margin: [0, 12, 0, 6] },
                            h3: { fontSize: 14, bold: true, color: '#475569', margin: [0, 10, 0, 4] },
                            h4: { fontSize: 12, bold: true, color: '#475569', margin: [0, 8, 0, 4] },
                            h5: { fontSize: 11, bold: true, color: '#475569', margin: [0, 8, 0, 4] },
                            h6: { fontSize: 11, bold: true, color: '#64748b', margin: [0, 8, 0, 4] },
                            p: { fontSize: 11, color: '#334155', margin: [0, 0, 0, 10], lineHeight: 1.5 },
                            ul: { margin: [0, 0, 0, 10] },
                            ol: { margin: [0, 0, 0, 10] },
                            li: { margin: [0, 2, 0, 2], color: '#334155' },
                            blockquote: { color: '#475569', margin: [10, 5, 0, 10], background: '#f1f5f9' },
                            pre: { background: '#f8fafc', margin: [0, 5, 0, 10], fontSize: 10, color: '#0f172a' },
                            code: { background: '#f8fafc', fontSize: 10, color: '#0f172a' },
                            strong: { bold: true, color: '#0f172a' },
                            em: { italics: true },
                            mark: { background: '#fef08a' },
                            a: { color: '#2563eb', decoration: 'underline' }
                          }
                        });

                        const makeTablesFullWidth = (nodes: any) => {
                          if (Array.isArray(nodes)) {
                            nodes.forEach(makeTablesFullWidth);
                          } else if (nodes && typeof nodes === 'object') {
                            if (nodes.nodeName === 'TABLE' && nodes.table) {
                              nodes.table.widths = ['*'];
                            }
                            for (const key in nodes) {
                              if (key !== 'table') makeTablesFullWidth(nodes[key]);
                            }
                          }
                        };
                        makeTablesFullWidth(pdfMakeContent);

                        const docDefinition = {
                          content: pdfMakeContent,
                          defaultStyle: {
                            font: 'Roboto',
                            color: '#222222'
                          },
                          pageMargins: [40, 40, 40, 40]
                        };

                        pdfMake.createPdf(docDefinition).download(`${note.title || "Note"}.pdf`);
                        toast.success('PDF generated successfully!', { id: 'pdf-gen' });
                        
                      } catch (err) {
                        console.error("Failed to generate PDF", err);
                        toast.error('Failed to generate PDF', { id: 'pdf-gen' });
                      }
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800/80 hover:text-white transition-colors"
                  >
                    <StickyNote size={14} />
                    Export as PDF
                  </button>
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setIsMenuOpen(false);
                      const newNote = {
                        id: crypto.randomUUID(),
                        title: `${note.title} (Copy)`,
                        content: note.content,
                        tags: [...(note.tags || [])],
                        color: note.color,
                        pinned: false,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                      };
                      const nextNotes = [...useAppStore.getState().notes, newNote];
                      useAppStore.setState({ notes: nextNotes });
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800/80 hover:text-white transition-colors"
                  >
                    <Plus size={14} />
                    Duplicate
                  </button>
                  <div className="h-px bg-zinc-800/60 my-1 mx-2" />
                  <button 
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirmation({ type: 'single', id: note.id }); setIsMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-500 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 size={14} />
                    Delete Note
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        
        <p className="text-xs text-zinc-500 truncate mb-2">
          {note.content.replace(/[#*_~`>]/g, '').substring(0, 60) || 'Empty note...'}
        </p>
        
        <div className="flex items-center justify-between mt-1">
          <div className="flex flex-wrap gap-1">
            {(note.tags || []).slice(0, 3).map(tag => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                #{tag}
              </span>
            ))}
            {(note.tags?.length || 0) > 3 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">+{note.tags!.length - 3}</span>
            )}
          </div>
          <span className="text-[10px] text-zinc-600">
            {new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex h-full bg-zinc-950 overflow-hidden">
      {/* Sidebar List */}
      <div className="w-80 flex-shrink-0 flex flex-col border-r border-zinc-800 bg-[#0a0a0a]">
                <div className="h-16 shrink-0 border-b border-zinc-800/80 px-6 flex items-center justify-between bg-zinc-900/20 z-20 relative">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <StickyNote size={20} className="text-white" />
            Notes
          </h2>
          <button
            onClick={handleCreateNote}
            className="flex items-center justify-center text-zinc-900 bg-white hover:bg-zinc-200 w-8 h-8 rounded-lg transition-colors shadow-sm"
            title="New Note"
          >
            <Plus size={18} />
          </button>
        </div>
        <div className="p-4 border-b border-zinc-900">
           <div className="flex gap-2">
             <div className="relative flex-1">
               <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
               <input 
                 type="text" 
                 placeholder="Search notes..." 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="w-full pl-9 pr-4 py-2 bg-zinc-900/50 border border-zinc-800 rounded-xl text-sm text-zinc-100 focus:outline-none focus:border-zinc-600 transition-colors placeholder:text-zinc-600"
               />
             </div>
             <button
               onClick={() => {
                 setIsMultiSelectMode(!isMultiSelectMode);
                 if (isMultiSelectMode) setSelectedNoteIds(new Set());
               }}
               className={`p-2 rounded-xl border transition-colors flex items-center justify-center shrink-0 ${isMultiSelectMode ? 'bg-white/10 text-white border-white/20' : 'bg-zinc-900/50 text-zinc-400 border-zinc-800 hover:text-white hover:bg-zinc-800'}`}
               title={isMultiSelectMode ? "Cancel Selection" : "Select Notes"}
             >
               <ListChecks size={18} />
             </button>
           </div>
           
           {isMultiSelectMode && (
              <div className="flex items-center justify-between px-1 py-1 mt-2 mb-[-8px] motion-enter">
               <span className="text-xs text-zinc-400">{selectedNoteIds.size} selected</span>
               <button
                 disabled={selectedNoteIds.size === 0}
                 onClick={() => setDeleteConfirmation({ type: 'bulk' })}
                 className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium transition-colors border border-rose-500/20"
               >
                 <Trash2 size={14} /> Delete Selected
               </button>
             </div>
           )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar motion-stagger">
          {filteredNotes.length === 0 ? (
            <div className="text-center py-10 text-zinc-500 text-sm">
              <StickyNote size={32} className="mx-auto mb-3 opacity-20" />
              No notes found.
            </div>
          ) : (
            <>
              {pinnedNotes.length > 0 && (
                  <div className="space-y-1 motion-stagger">
                  <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider px-3 py-1 flex items-center gap-1.5">
                    <Pin size={12} /> Pinned
                  </h3>
                  {pinnedNotes.map(note => <NoteListItem key={note.id} note={note} />)}
                </div>
              )}
              
              {unpinnedNotes.length > 0 && (
                <div className="space-y-1 motion-stagger">
                  {pinnedNotes.length > 0 && (
                    <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider px-3 py-1 mt-4">
                      All Notes
                    </h3>
                  )}
                  {unpinnedNotes.map(note => <NoteListItem key={note.id} note={note} />)}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex flex-col bg-zinc-950 relative">
        {activeNote ? (
          <>
            {/* Editor Header */}
            <div className="shrink-0 border-b border-zinc-900 bg-[#0a0a0a]">
              <div className="flex items-center justify-between px-6 py-4">
                 <div className="flex-1 mr-4">
                   <input
                     value={activeNote.title}
                     onChange={(e) => updateNote(activeNote.id, { title: e.target.value })}
                     className="text-2xl font-bold bg-transparent border-none focus:outline-none text-white w-full placeholder:text-zinc-700"
                     placeholder="Note Title"
                   />
                   
                   {/* Tags Area */}
                   <div className="flex items-center flex-wrap gap-2 mt-3">
                     {(activeNote.tags || []).map(tag => (
                       <span key={tag} className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300">
                         <Hash size={12} className="text-zinc-500" />
                         {tag}
                         <button onClick={() => handleRemoveTag(tag)} className="hover:text-rose-400 ml-1"><X size={10} /></button>
                       </span>
                     ))}
                     
                     {showTagInput ? (
                       <input
                         autoFocus
                         value={newTag}
                         onChange={(e) => setNewTag(e.target.value)}
                         onKeyDown={handleAddTag}
                         onBlur={() => { setShowTagInput(false); setNewTag(''); }}
                         placeholder="Type tag & enter..."
                         className="text-xs px-2 py-1 bg-zinc-900 border border-zinc-600 rounded-md text-white focus:outline-none w-32"
                       />
                     ) : (
                       <button 
                         onClick={() => setShowTagInput(true)}
                         className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-transparent border border-dashed border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 transition-colors"
                       >
                         <Plus size={12} /> Add tag
                       </button>
                     )}
                   </div>
                 </div>
                 
                 <div className="flex items-center gap-1.5 shrink-0">
                   <div className="relative">
                     <button 
                       onClick={() => setShowColorPicker(!showColorPicker)}
                       className="p-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
                       title="Color Theme"
                     >
                       <Palette size={18} />
                     </button>
                     
                     {showColorPicker && (
                       <>
                         <div className="fixed inset-0 z-40" onClick={() => setShowColorPicker(false)} />
                         <div className="absolute right-0 top-full mt-2 p-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-50 flex gap-2">
                           {NOTE_COLORS.map(c => (
                             <button
                               key={c.id}
                               onClick={() => {
                                 updateNote(activeNote.id, { color: c.id });
                                 setShowColorPicker(false);
                               }}
                               className={`w-5 h-5 rounded-full border-2 transition-all ${c.dot} ${activeNote.color === c.id ? 'border-zinc-200 ring-2 ring-zinc-900 scale-110' : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105'}`}
                             />
                           ))}
                         </div>
                       </>
                     )}
                   </div>
                   
                   <button 
                     onClick={() => updateNote(activeNote.id, { pinned: !activeNote.pinned })}
                     className={`p-2.5 rounded-xl transition-colors ${activeNote.pinned ? 'bg-amber-500/10 text-amber-500' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}
                     title={activeNote.pinned ? "Unpin Note" : "Pin Note"}
                   >
                     <Pin size={18} />
                   </button>
                   
                   <div className="w-px h-6 bg-zinc-800 mx-1"></div>
                   
                   {/* Edit / Done Toggle */}
                   {isEditing ? (
                     <button
                       onClick={() => setIsEditing(false)}
                       className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors border border-emerald-500/20 shadow-sm"
                       title="Save and Preview"
                     >
                       <Check size={16} />
                       <span className="text-sm font-medium">Done</span>
                     </button>
                   ) : (
                     <button
                       onClick={() => setIsEditing(true)}
                       className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors shadow-sm"
                       title="Edit Note"
                     >
                       <Edit3 size={16} />
                       <span className="text-sm font-medium">Edit</span>
                     </button>
                   )}
                 </div>
              </div>

              {/* Formatting Toolbar (Only show in Write mode) */}
              {isEditing && (
                <div className="px-6 py-2 border-t border-zinc-900 flex flex-wrap items-center gap-1 bg-[#0f0f11] motion-enter">
                  <ToolbarButton icon={<Bold size={15} />} onClick={() => insertFormatting('**', '**')} tooltip="Bold (**text**)" />
                  <ToolbarButton icon={<Italic size={15} />} onClick={() => insertFormatting('*', '*')} tooltip="Italic (*text*)" />
                  <ToolbarButton icon={<Strikethrough size={15} />} onClick={() => insertFormatting('~~', '~~')} tooltip="Strikethrough (~~text~~)" />
                  <ToolbarButton icon={<Highlighter size={15} />} onClick={() => insertFormatting('<mark>', '</mark>')} tooltip="Highlight (<mark>text</mark>)" />
                  <div className="w-px h-4 bg-zinc-800 mx-1"></div>
                  <ToolbarButton icon={<Heading1 size={15} />} onClick={() => insertFormatting('# ')} tooltip="Heading 1" />
                  <ToolbarButton icon={<Heading2 size={15} />} onClick={() => insertFormatting('## ')} tooltip="Heading 2" />
                  <ToolbarButton icon={<Heading3 size={15} />} onClick={() => insertFormatting('### ')} tooltip="Heading 3" />
                  <div className="w-px h-4 bg-zinc-800 mx-1"></div>
                  <ToolbarButton icon={<List size={15} />} onClick={() => insertFormatting('- ')} tooltip="Bullet List" />
                  <ToolbarButton icon={<ListOrdered size={15} />} onClick={() => insertFormatting('1. ')} tooltip="Numbered List" />
                  <div className="w-px h-4 bg-zinc-800 mx-1"></div>
                  <ToolbarButton icon={<Quote size={15} />} onClick={() => insertFormatting('> ')} tooltip="Quote" />
                  <ToolbarButton icon={<Minus size={15} />} onClick={() => insertFormatting('\n---\n')} tooltip="Horizontal Rule" />
                  <div className="w-px h-4 bg-zinc-800 mx-1"></div>
                  <ToolbarButton icon={<Link size={15} />} onClick={() => insertFormatting('[', '](url)')} tooltip="Link" />
                  <ToolbarButton icon={<Code size={15} />} onClick={() => insertFormatting('`', '`')} tooltip="Inline Code" />
                </div>
              )}
            </div>
            
            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar relative">
              {isEditing ? (
                <textarea
                  ref={textareaRef}
                  value={activeNote.content}
                  onChange={(e) => updateNote(activeNote.id, { content: e.target.value })}
                  className="absolute inset-0 w-full h-full p-6 lg:px-12 lg:py-8 bg-transparent resize-none border-none focus:outline-none text-zinc-300 leading-relaxed font-sans text-[15px]"
                  placeholder="Start typing... Use Markdown for formatting."
                />
              ) : (
                <div className="p-6 lg:px-12 lg:py-8 min-h-full">
                  <div className="prose prose-invert prose-zinc max-w-3xl mx-auto prose-headings:text-zinc-100 prose-a:text-white prose-code:bg-zinc-900 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
                    {activeNote.content ? (
                      <Markdown 
                        remarkPlugins={[remarkGfm, remarkBreaks]}
                        rehypePlugins={[rehypeRaw]}
                        components={{
                          mark: ({node, ...props}) => <mark className="bg-[#E2F529] text-black px-1 rounded-sm font-medium" {...props} />
                        }}
                      >
                        {activeNote.content.replace(/^(\s*)- \[(x|X| )\]/gm, '$1- \\[$2\\]')}
                      </Markdown>
                    ) : (
                      <div className="text-zinc-500 italic h-full flex items-center justify-center pt-20">
                        Nothing to preview. Switch to write mode to start typing.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Status Footer */}
            <div className="shrink-0 h-10 border-t border-zinc-900 bg-[#0a0a0a] flex items-center justify-between px-6 text-xs text-zinc-500 select-none">
              <div className="flex items-center gap-4">
                <span>{wordCount} words</span>
                <span>{charCount} characters</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock size={12} />
                Last edited {new Date(activeNote.updatedAt).toLocaleString(undefined, { 
                  month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' 
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 bg-zinc-950">
            <div className="w-24 h-24 rounded-full bg-zinc-900/50 flex items-center justify-center mb-6">
              <StickyNote size={40} className="text-zinc-600" />
            </div>
            <h3 className="text-lg font-medium text-zinc-300 mb-2">No note selected</h3>
            <p className="text-sm max-w-xs text-center text-zinc-500">
              Select a note from the sidebar or create a new one to start writing.
            </p>
            <button
               onClick={handleCreateNote}
               className="mt-6 flex items-center justify-center px-4 py-2 text-zinc-900 bg-white hover:bg-zinc-200 rounded-xl font-medium transition-colors shadow-sm"
             >
               Create New Note
             </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-fade-in" onClick={() => setDeleteConfirmation(null)}>
          <div className="bg-[#0a0a0a] border border-zinc-800/60 rounded-[32px] w-full max-w-[400px] shadow-[0_0_80px_rgba(225,29,72,0.15)] relative overflow-hidden animate-slide-up flex flex-col my-auto" onClick={e => e.stopPropagation()}>
            <div className="p-8 pb-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-[24px] bg-rose-500/10 flex items-center justify-center mb-6 border border-rose-500/20">
                <Trash2 size={28} className="text-rose-500" />
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight mb-3">
                Delete {deleteConfirmation.type === 'bulk' ? `${selectedNoteIds.size} Notes` : 'Note'}?
              </h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                This action cannot be undone. {deleteConfirmation.type === 'bulk' ? 'These notes' : 'This note'} will be permanently removed.
              </p>
            </div>
            
            <div className="p-6 pt-2 flex items-center justify-between gap-3">
              <button 
                onClick={() => setDeleteConfirmation(null)}
                className="flex-1 px-6 py-3 text-zinc-400 font-medium hover:text-white transition-colors rounded-2xl hover:bg-zinc-800/60"
              >
                Cancel
              </button>
              <button 
                onClick={() => deleteConfirmation.type === 'bulk' ? executeBulkDelete() : executeSingleDelete(deleteConfirmation.id!)}
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

// Small helper component for toolbar
function ToolbarButton({ icon, onClick, tooltip }: { icon: React.ReactNode, onClick: () => void, tooltip: string }) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
    >
      {icon}
    </button>
  );
}

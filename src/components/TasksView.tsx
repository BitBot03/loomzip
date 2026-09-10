import React, { useState, useMemo, KeyboardEvent, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Plus, LayoutDashboard, MoreHorizontal, ArrowUpDown, Calendar as CalendarIcon, Tag, Check, Circle, Search, AlertCircle, Clock, ChevronDown, CheckCircle2, X, GripVertical, Trash2, Edit3, ArrowUpCircle, Briefcase, Home, Heart, Activity, DollarSign, Book, Coffee, Plane, ShoppingCart, Zap, Star, ListChecks, Kanban, List, LayoutGrid } from 'lucide-react';
import { useAppStore } from '../store';
import { Task, TaskStatus, Priority } from '../types';
import TaskModal from './TaskModal';

const COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
  { id: 'todo', title: 'To Do', color: 'border-blue-500 text-blue-500 bg-blue-500/10' },
  { id: 'in-progress', title: 'In Progress', color: 'border-amber-500 text-amber-500 bg-amber-500/10' },
  { id: 'done', title: 'Done', color: 'border-emerald-500 text-emerald-500 bg-emerald-500/10' },
];

const ICONS: Record<string, React.ReactNode> = {
  briefcase: <Briefcase size={14} />,
  home: <Home size={14} />,
  heart: <Heart size={14} />,
  activity: <Activity size={14} />,
  dollar: <DollarSign size={14} />,
  book: <Book size={14} />,
  coffee: <Coffee size={14} />,
  plane: <Plane size={14} />,
  cart: <ShoppingCart size={14} />,
  zap: <Zap size={14} />,
  star: <Star size={14} />
};

const PRIORITY_STYLES: Record<Priority, { icon: React.ReactNode, class: string, label: string }> = {
  high: { icon: <ArrowUpCircle size={14} />, class: 'text-rose-500 bg-rose-500/10', label: 'High' },
  medium: { icon: <ArrowUpCircle size={14} className="rotate-45" />, class: 'text-amber-500 bg-amber-500/10', label: 'Medium' },
  low: { icon: <ArrowUpCircle size={14} className="rotate-90" />, class: 'text-blue-500 bg-blue-500/10', label: 'Low' },
};

export default function TasksView() {
  const { tasks, updateTask, reorderTasks, deleteTasks, deleteTask } = useAppStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [modalInitialStatus, setModalInitialStatus] = useState<TaskStatus>('todo');
  const [modalForceEdit, setModalForceEdit] = useState(false);
  
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortBy, setSortBy] = useState<'manual' | 'dueDate' | 'priority' | 'alphabetical'>('manual');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  
  const [statusDropdownId, setStatusDropdownId] = useState<string | null>(null);
  const [columnMenuId, setColumnMenuId] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ type: 'single' | 'bulk' | 'column', id?: string, title?: string, taskIds?: string[] } | null>(null);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    if (sortBy !== 'manual') return; // Disable drag ordering when sorted
    const { source, destination, draggableId } = result;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    
    const validTasks = tasks.filter(t => t && t.id);
    const draggedTask = validTasks.find((t) => t.id === draggableId);
    if (!draggedTask) return;

    if (source.droppableId === 'flat-list' && destination.droppableId === 'flat-list') {
        const reordered = Array.from(filteredTasks);
        const [movedItem] = reordered.splice(source.index, 1);
        reordered.splice(destination.index, 0, movedItem);
        
        const otherTasks = validTasks.filter(t => !reordered.find(rt => rt.id === t.id));
        reorderTasks([...otherTasks, ...reordered]);
        return;
    }

    if (source.droppableId !== destination.droppableId) {
        updateTask(draggedTask.id, { status: destination.droppableId as TaskStatus });
    } else {
        const columnTasks = validTasks.filter(t => t.status === source.droppableId);
        const [movedItem] = columnTasks.splice(source.index, 1);
        if (movedItem) {
            columnTasks.splice(destination.index, 0, movedItem);
            const otherTasks = validTasks.filter(t => t.status !== source.droppableId);
            reorderTasks([...otherTasks, ...columnTasks]);
        }
    }
  };

  const filteredTasks = useMemo(() => {
    const searchFiltered = tasks.filter(t => t && t.title && (t.title.toLowerCase().includes(searchQuery.toLowerCase()) || (t.description || '').toLowerCase().includes(searchQuery.toLowerCase())));
    if (sortBy === 'manual') return searchFiltered;
    
    return [...searchFiltered].sort((a, b) => {
      if (sortBy === 'dueDate') {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (sortBy === 'priority') {
        const pMap = { high: 3, medium: 2, low: 1 };
        return pMap[b.priority] - pMap[a.priority];
      }
      if (sortBy === 'alphabetical') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });
  }, [tasks, searchQuery, sortBy]);

  // Grouping for List View (only when not in multiselect)
  const listGroups = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const groups = { overdue: [] as Task[], today: [] as Task[], upcoming: [] as Task[], noDate: [] as Task[], completed: [] as Task[] };

    filteredTasks.forEach(task => {
      if (!task || !task.id) return;
      if (task.status === 'done') { groups.completed.push(task); return; }
      if (!task.dueDate) { groups.noDate.push(task); return; }
      const dueDate = new Date(task.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      
      if (dueDate < today) groups.overdue.push(task);
      else if (dueDate.getTime() === today.getTime()) groups.today.push(task);
      else groups.upcoming.push(task);
    });

    return groups;
  }, [filteredTasks]);

  const openEdit = (task: Task, forceEdit: boolean = false) => {
    setEditingTask(task);
    setModalForceEdit(forceEdit);
    setIsModalOpen(true);
  };

  const toggleSelection = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const next = new Set(selectedTaskIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedTaskIds(next);
  };

  const executeSingleDelete = (id: string) => {
    deleteTask(id);
    setDeleteConfirmation(null);
  };

  const executeBulkDelete = () => {
    deleteTasks(Array.from(selectedTaskIds));
    setSelectedTaskIds(new Set());
    setDeleteConfirmation(null);
    setIsMultiSelectMode(false);
  };

  const executeColumnDelete = (taskIds: string[]) => {
    deleteTasks(taskIds);
    setDeleteConfirmation(null);
  };

  const bulkDelete = () => {
    if (selectedTaskIds.size === 0) return;
    deleteTasks(Array.from(selectedTaskIds));
    setSelectedTaskIds(new Set());
    setIsMultiSelectMode(false);
  };
  
  // Custom dropdown click outside handler
  useEffect(() => {
    const handleClickOutside = () => {
      setStatusDropdownId(null);
      setColumnMenuId(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const StatusSelector = ({ task }: { task: Task }) => (
    <div className="relative">
      <div 
        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
          task.status === 'done' ? 'border-emerald-500 bg-emerald-500/20 text-emerald-500' :
          task.status === 'in-progress' ? 'border-amber-500 bg-amber-500/20 text-amber-500' :
          'border-zinc-600 hover:border-zinc-300 text-transparent hover:text-white'
        }`}
        onClick={(e) => { e.stopPropagation(); setStatusDropdownId(statusDropdownId === task.id ? null : task.id); }}
      >
        <Check size={12} strokeWidth={4} className={task.status !== 'todo' ? 'opacity-100' : 'opacity-0 hover:opacity-100'} />
      </div>
      
      {statusDropdownId === task.id && (
        <div className="absolute top-full left-0 mt-1 bg-[#18181b] border border-zinc-700 rounded-lg shadow-xl z-[100] w-36 overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>
          {COLUMNS.map(col => (
            <div 
              key={col.id} 
              className={`px-3 py-2 text-xs font-semibold cursor-pointer hover:bg-zinc-800 flex items-center justify-between ${task.status === col.id ? 'bg-zinc-800' : ''}`}
              onClick={() => { updateTask(task.id, { status: col.id }); setStatusDropdownId(null); }}
            >
              <span className={col.color.split(' ')[0].replace('border-', 'text-')}>{col.title}</span>
              {task.status === col.id && <Check size={12} className="text-white" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderListItem = (task: Task, provided?: any, snapshot?: any) => (
    <div 
      key={task.id} 
      ref={provided?.innerRef}
      {...provided?.draggableProps}
      className={`group flex items-center gap-3 py-3 px-4 bg-[#09090b] border-b border-zinc-800/50 last:border-b-0 first:rounded-t-2xl last:rounded-b-2xl transition-colors cursor-pointer ${snapshot?.isDragging ? 'shadow-2xl shadow-black/50 border-zinc-600 bg-[#18181b] z-50 rotate-1' : 'hover:bg-[#18181b]'}`}
      onClick={(e) => {
        if (isMultiSelectMode) toggleSelection(e, task.id);
        else openEdit(task);
      }}
      style={provided?.draggableProps.style}
    >
      {isMultiSelectMode && (
        <>
          <div className="shrink-0 mr-1" onClick={(e) => toggleSelection(e, task.id)}>
            {selectedTaskIds.has(task.id) ? (
              <CheckCircle2 size={20} className="text-white" />
            ) : (
              <Circle size={20} className="text-zinc-600" />
            )}
          </div>
          <div {...provided?.dragHandleProps} className="w-5 flex items-center justify-center cursor-grab text-zinc-500 shrink-0">
            <GripVertical size={16} />
          </div>
        </>
      )}

      {!isMultiSelectMode && <StatusSelector task={task} />}
      
      <div className={`flex-1 overflow-hidden transition-opacity flex items-center gap-2 ${task.status === 'done' ? 'opacity-40' : ''}`}>
        {task.icon && <span className="text-zinc-400 bg-zinc-800 p-1.5 rounded-lg shrink-0">{ICONS[task.icon] || <Star size={14}/>}</span>}
        <div className="overflow-hidden flex-1">
          <div className="flex items-center gap-2">
            <h4 className={`text-sm font-medium truncate ${task.status === 'done' ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>
              {task.title}
            </h4>
            {task.subtasks && task.subtasks.length > 0 && (
              <span className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 ${task.subtasks.filter(s => s.completed).length === task.subtasks.length ? 'bg-emerald-500/10 text-emerald-500' : 'bg-indigo-500/10 text-indigo-400'}`}>
                <CheckCircle2 size={10} />
                {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}
              </span>
            )}
            {task.labels && task.labels.length > 0 && (
              <div className="flex items-center gap-1 overflow-hidden ml-1">
                {task.labels.slice(0, 3).map((label, i) => (
                  <span key={i} className="px-1.5 py-0.5 bg-zinc-800/50 text-zinc-400 rounded text-[10px] font-medium truncate max-w-[60px]">{label}</span>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {task.dueDate && (
          <div className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md ${new Date(task.dueDate) < new Date() && task.status !== 'done' ? 'text-rose-400 bg-rose-400/10' : 'text-zinc-400 bg-zinc-800'}`}>
            <CalendarIcon size={10} />
            {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </div>
        )}
        <div className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-medium ${PRIORITY_STYLES[task.priority].class}`}>
          {PRIORITY_STYLES[task.priority].icon}
          <span className="hidden sm:inline">{PRIORITY_STYLES[task.priority].label}</span>
        </div>
        
        {isMultiSelectMode && (
          <div className="flex items-center gap-1 ml-2">
            <button onClick={(e) => { e.stopPropagation(); openEdit(task, true); }} className="p-1.5 text-zinc-400 hover:text-white rounded-md hover:bg-zinc-800"><Edit3 size={14}/></button>
            <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmation({ type: 'single', id: task.id }); }} className="p-1.5 text-zinc-400 hover:text-rose-500 rounded-md hover:bg-rose-500/10"><Trash2 size={14}/></button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 overflow-hidden relative">
      {/* Header */}
      <div className="h-16 shrink-0 border-b border-zinc-800/80 px-6 flex items-center justify-between bg-zinc-900/20 z-20 relative">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <LayoutDashboard size={20} className="text-white" />
          Tasks
        </h2>
        
        <button 
          onClick={() => { setEditingTask(null); setModalInitialStatus('todo'); setIsModalOpen(true); }}
          className="flex items-center justify-center text-zinc-900 bg-white hover:bg-zinc-200 w-8 h-8 rounded-lg transition-colors shadow-sm"
          title="New Task"
        >
          <Plus size={18} />
        </button>
      </div>
      
      {/* Toolbar */}
      <div className="h-14 shrink-0 border-b border-zinc-800/50 px-4 sm:px-6 flex items-center justify-between bg-[#09090b] z-10 relative">
        <div className="relative w-full flex-1 max-w-2xl">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Search tasks..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-zinc-600"
          />
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4 ml-4">
          {isMultiSelectMode && (
             <div className="flex items-center gap-3 motion-enter">
                <span className="text-sm font-medium text-zinc-400 whitespace-nowrap">{selectedTaskIds.size} selected</span>
                <button
                    disabled={selectedTaskIds.size === 0}
                   onClick={bulkDelete}
                   className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium transition-colors border border-rose-500/20 whitespace-nowrap"
                >
                   <Trash2 size={14} /> Delete Selected
                </button>
             </div>
          )}
          
          {/* Sort Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="px-3 py-2 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-xl hover:text-white hover:bg-zinc-800 transition-colors flex items-center gap-2 shrink-0 text-sm font-medium"
              title="Sort Tasks"
            >
              <ArrowUpDown size={16} />
              {sortBy === 'manual' ? 'Manual' : sortBy === 'dueDate' ? 'Due Date' : sortBy === 'priority' ? 'Priority' : 'A-Z'}
            </button>

            {isSortOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setIsSortOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-40 p-1.5 flex flex-col gap-1 overflow-hidden">
                  <button onClick={() => { setSortBy('manual'); setIsSortOpen(false); }} className={`px-3 py-2 text-sm text-left rounded-lg transition-colors ${sortBy === 'manual' ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>Manual (Drag & Drop)</button>
                  <button onClick={() => { setSortBy('dueDate'); setIsSortOpen(false); }} className={`px-3 py-2 text-sm text-left rounded-lg transition-colors ${sortBy === 'dueDate' ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>Due Date</button>
                  <button onClick={() => { setSortBy('priority'); setIsSortOpen(false); }} className={`px-3 py-2 text-sm text-left rounded-lg transition-colors ${sortBy === 'priority' ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>Priority</button>
                  <button onClick={() => { setSortBy('alphabetical'); setIsSortOpen(false); }} className={`px-3 py-2 text-sm text-left rounded-lg transition-colors ${sortBy === 'alphabetical' ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>Alphabetical (A-Z)</button>
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => {
              setIsMultiSelectMode(!isMultiSelectMode);
              if (isMultiSelectMode) setSelectedTaskIds(new Set());
            }}
            className={`p-2 rounded-xl border transition-colors flex items-center justify-center shrink-0 ${
              isMultiSelectMode ? 'bg-white/10 text-white border-white/20' : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
            title={isMultiSelectMode ? "Cancel Selection" : "Select Tasks"}
          >
            <ListChecks size={18} />
          </button>
          
          {!isMultiSelectMode && (
            <div className="flex bg-zinc-900 rounded-xl p-1 border border-zinc-800 shrink-0">
              <button 
                onClick={() => { setViewMode('list'); setIsMultiSelectMode(false); }}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' && !isMultiSelectMode ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                title="List View"
              >
                <List size={16} />
              </button>
              <button 
                onClick={() => { setViewMode('grid'); setIsMultiSelectMode(false); }}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                title="Grid View"
              >
                <LayoutGrid size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto custom-scrollbar relative">
        {viewMode === 'list' ? (
          <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-20">
            {isMultiSelectMode ? (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="flat-list">
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="border border-zinc-800/80 rounded-2xl shadow-sm">
                      {filteredTasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => renderListItem(task, provided, snapshot)}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            ) : (
              <div className="space-y-8 motion-stagger">
                {listGroups.overdue.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-rose-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <AlertCircle size={14} /> Overdue
                    </h3>
                    <div className="border border-zinc-800/80 rounded-2xl shadow-sm">
                      {listGroups.overdue.map(t => renderListItem(t))}
                    </div>
                  </div>
                )}
                
                {listGroups.today.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Clock size={14} /> Today
                    </h3>
                    <div className="border border-zinc-800/80 rounded-2xl shadow-sm">
                      {listGroups.today.map(t => renderListItem(t))}
                    </div>
                  </div>
                )}
                
                {listGroups.upcoming.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                      <CalendarIcon size={14} /> Upcoming
                    </h3>
                    <div className="border border-zinc-800/80 rounded-2xl shadow-sm">
                      {listGroups.upcoming.map(t => renderListItem(t))}
                    </div>
                  </div>
                )}
                
                {listGroups.noDate.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <ListChecks size={14} /> Anytime
                    </h3>
                    <div className="border border-zinc-800/80 rounded-2xl shadow-sm">
                      {listGroups.noDate.map(t => renderListItem(t))}
                    </div>
                  </div>
                )}
                
                {listGroups.completed.length > 0 && (
                  <div className="opacity-60">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <CheckCircle2 size={14} /> Completed
                    </h3>
                    <div className="border border-zinc-800/80 rounded-2xl shadow-sm">
                      {listGroups.completed.map(t => renderListItem(t))}
                    </div>
                  </div>
                )}

                {Object.values(listGroups).every(arr => arr.length === 0) && (
                  <div className="text-center py-20">
                    <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4 text-zinc-600">
                      <Check size={32} />
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">All caught up!</h3>
                    <p className="text-zinc-500">You have no tasks matching your search or filters.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 sm:p-6 h-full min-w-min">
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="flex flex-wrap gap-6 h-full content-start w-full pb-10 overflow-y-auto custom-scrollbar">
                {COLUMNS.map(column => {
                  const columnTasks = filteredTasks.filter(t => t && t.id && t.status === column.id);
                  
                  return (
                    <div key={column.id} className={`relative flex flex-col h-fit max-h-[460px] bg-zinc-900/30 rounded-2xl border border-zinc-800/50 ${column.id === 'done' ? 'w-full' : 'w-full md:w-[calc(50%-12px)]'}`}>
                      <div className="p-4 flex items-center justify-between border-b border-zinc-800/50">
                        <div className="flex items-center gap-3">
                          <div className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${column.color}`}>
                            {column.title}
                          </div>
                          <span className="text-xs font-semibold text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded-full">{columnTasks.length}</span>
                        </div>
                        <div className="relative">
                          <button 
                            className="p-1 text-zinc-500 hover:bg-zinc-800 rounded-md hover:text-white transition-colors"
                            onClick={(e) => { e.stopPropagation(); setColumnMenuId(columnMenuId === column.id ? null : column.id); }}
                          >
                            <MoreHorizontal size={18} />
                          </button>
                          {columnMenuId === column.id && (
                            <div className="absolute top-full right-0 mt-1 bg-[#18181b] border border-zinc-700 rounded-lg shadow-xl z-50 w-40 overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>
                              <div 
                                className="px-3 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 cursor-pointer flex items-center gap-2"
                                onClick={() => { setEditingTask(null); setModalInitialStatus(column.id as TaskStatus); setIsModalOpen(true); setColumnMenuId(null); }}
                              >
                                <Plus size={14} /> Add Task Here
                              </div>
                              <div 
                                className="px-3 py-2.5 text-xs font-semibold text-rose-400 hover:bg-zinc-800 cursor-pointer flex items-center gap-2 border-t border-zinc-800"
                                onClick={() => { setDeleteConfirmation({ type: 'column', taskIds: columnTasks.map(t => t.id), title: column.title }); setColumnMenuId(null); }}
                              >
                                <Trash2 size={14} /> Clear Column
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <Droppable droppableId={column.id}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`flex-1 p-3 overflow-y-auto custom-scrollbar min-h-[150px] transition-colors ${snapshot.isDraggingOver ? 'bg-zinc-800/20' : ''}`}
                          >
                            <div className={`gap-3 ${column.id === 'done' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 items-start' : 'flex flex-col'}`}>
                              {columnTasks.map((task, index) => (
                                <Draggable key={task.id} draggableId={task.id} index={index}>
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      className={`bg-[#18181b] border rounded-xl p-4 shadow-sm group transition-all relative ${
                                        selectedTaskIds.has(task.id) ? 'border-zinc-400 bg-white/5' : 'border-zinc-800 hover:border-zinc-700'
                                      } ${
                                        snapshot.isDragging ? 'shadow-xl shadow-black/50 border-zinc-600 scale-105 z-50' : ''
                                      }`}
                                      onClick={(e) => {
                                        if (isMultiSelectMode) toggleSelection(e, task.id);
                                        else openEdit(task);
                                      }}
                                    >
                                      <div className="flex items-start justify-between gap-3 mb-2">
                                        <div className="flex gap-2 items-start flex-1 overflow-hidden cursor-grab active:cursor-grabbing" {...provided.dragHandleProps}>
                                          {task.icon && <span className="text-zinc-500 mt-0.5">{ICONS[task.icon] || <Star size={14}/>}</span>}
                                          <div className="flex flex-col w-full min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <h4 className={`text-sm font-medium leading-snug truncate max-w-full ${task.status === 'done' ? 'text-zinc-500 line-through' : 'text-zinc-100'}`}>
                                                {task.title}
                                              </h4>
                                              {task.labels && task.labels.length > 0 && (
                                                <div className="flex items-center gap-1 overflow-hidden">
                                                  {task.labels.slice(0, 3).map((label, i) => (
                                                    <span key={i} className="px-1.5 py-0.5 bg-zinc-800/50 text-zinc-400 rounded text-[10px] font-medium truncate max-w-[80px]">{label}</span>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                          {isMultiSelectMode ? (
                                            <>
                                              <button onClick={(e) => { e.stopPropagation(); openEdit(task, true); }} className="p-1.5 text-zinc-400 hover:text-white rounded-md hover:bg-zinc-800" title="Edit Task"><Edit3 size={14}/></button>
                                              <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmation({ type: 'single', id: task.id }); }} className="p-1.5 text-zinc-400 hover:text-rose-500 rounded-md hover:bg-rose-500/10" title="Delete Task"><Trash2 size={14}/></button>
                                            </>
                                          ) : (
                                            <>
                                              {task.status !== 'todo' && (
                                                <button 
                                                  onClick={(e) => { e.stopPropagation(); updateTask(task.id, { status: 'todo' }); }}
                                                  className="p-1.5 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                                                  title="Move to To Do"
                                                >
                                                  <Circle size={14} />
                                                </button>
                                              )}
                                              {task.status !== 'in-progress' && (
                                                <button 
                                                  onClick={(e) => { e.stopPropagation(); updateTask(task.id, { status: 'in-progress' }); }}
                                                  className="p-1.5 rounded bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors"
                                                  title="Move to In Progress"
                                                >
                                                  <Clock size={14} />
                                                </button>
                                              )}
                                              {task.status !== 'done' && (
                                                <button 
                                                  onClick={(e) => { e.stopPropagation(); updateTask(task.id, { status: 'done' }); }}
                                                  className="p-1.5 rounded bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors"
                                                  title="Mark as Done"
                                                >
                                                  <CheckCircle2 size={14} />
                                                </button>
                                              )}
                                            </>
                                          )}
                                        </div>
                                      </div>
                                      
                                      {task.description && (
                                        <p className="text-xs text-zinc-400 line-clamp-2 mb-3">{task.description}</p>
                                      )}
                                      
                                      <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-zinc-800/80">
                                        {task.dueDate && (
                                          <div className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium ${new Date(task.dueDate) < new Date() && task.status !== 'done' ? 'text-rose-400 bg-rose-400/10' : 'text-zinc-400 bg-zinc-800'}`}>
                                            <CalendarIcon size={10} />
                                            {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                          </div>
                                        )}
                                        <div className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium ${PRIORITY_STYLES[task.priority].class}`}>
                                          {PRIORITY_STYLES[task.priority].icon}
                                          {PRIORITY_STYLES[task.priority].label}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          </div>
                        )}
                      </Droppable>
                      {((column.id === 'done' && columnTasks.length > 6) || (column.id !== 'done' && columnTasks.length > 3)) && <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#0e0e11] to-transparent pointer-events-none rounded-b-2xl"></div>}
                    </div>
                  );
                })}
              </div>
            </DragDropContext>
          </div>
        )}
      </div>

      {isModalOpen && (
        <TaskModal 
          task={editingTask}
          initialStatus={modalInitialStatus}
          forceEdit={modalForceEdit}
          onClose={() => {
            setIsModalOpen(false);
            setEditingTask(null);
            setModalForceEdit(false);
          }} 
        />
      )}
      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-fade-in" onClick={() => setDeleteConfirmation(null)}>
          <div className="bg-[#0a0a0a] border border-zinc-800/60 rounded-[32px] w-full max-w-[400px] shadow-[0_0_80px_rgba(225,29,72,0.15)] relative overflow-hidden animate-slide-up flex flex-col my-auto" onClick={e => e.stopPropagation()}>
            <div className="p-8 pb-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-[24px] bg-rose-500/10 flex items-center justify-center mb-6 border border-rose-500/20">
                <Trash2 size={28} className="text-rose-500" />
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight mb-3">
                Delete {deleteConfirmation.type === 'bulk' ? `${selectedTaskIds.size} Tasks` : deleteConfirmation.type === 'column' ? `All tasks` : 'Task'}?
              </h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                This action cannot be undone. {deleteConfirmation.type === 'single' ? 'This task' : 'These tasks'} will be permanently removed from your workspace.
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
                onClick={() => {
                  if (deleteConfirmation.type === 'bulk') executeBulkDelete();
                  else if (deleteConfirmation.type === 'column' && deleteConfirmation.taskIds) executeColumnDelete(deleteConfirmation.taskIds);
                  else if (deleteConfirmation.id) executeSingleDelete(deleteConfirmation.id);
                }}
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

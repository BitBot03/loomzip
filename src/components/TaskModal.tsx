import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Tag, ChevronDown, Check, ChevronLeft, ChevronRight, Briefcase, Home, Heart, Activity, DollarSign, Book, Coffee, Plane, ShoppingCart, Zap, Star, Edit3, Trash2 } from 'lucide-react';
import { Task, Priority, TaskStatus, Subtask } from '../types';
import { useAppStore } from '../store';

const ICONS: Record<string, React.ReactNode> = {
  briefcase: <Briefcase size={18} />,
  home: <Home size={18} />,
  heart: <Heart size={18} />,
  activity: <Activity size={18} />,
  dollar: <DollarSign size={18} />,
  book: <Book size={18} />,
  coffee: <Coffee size={18} />,
  plane: <Plane size={18} />,
  cart: <ShoppingCart size={18} />,
  zap: <Zap size={18} />
};

interface TaskModalProps {
  task: Task | null;
  initialStatus?: TaskStatus;
  onClose: () => void;
  forceEdit?: boolean;
}

const DEFAULT_LABELS = ['Work', 'Personal', 'Urgent', 'Home', 'Health', 'Finance', 'Study', 'Goals', 'Other'];
const PRIORITIES: { id: Priority; label: string; color: string }[] = [
  { id: 'low', label: 'Low', color: 'text-blue-500 bg-blue-500/10' },
  { id: 'medium', label: 'Medium', color: 'text-amber-500 bg-amber-500/10' },
  { id: 'high', label: 'High', color: 'text-rose-500 bg-rose-500/10' }
];

const STATUSES: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'todo', label: 'To Do', color: 'text-blue-500 bg-blue-500/10' },
  { id: 'in-progress', label: 'In Progress', color: 'text-amber-500 bg-amber-500/10' },
  { id: 'done', label: 'Done', color: 'text-emerald-500 bg-emerald-500/10' }
];

export default function TaskModal({ task, initialStatus, onClose, forceEdit = false }: TaskModalProps) {
  const { addTask, updateTask, deleteTask } = useAppStore();
  
  const [isEditMode, setIsEditMode] = useState<boolean>(!task || forceEdit);
  
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [status, setStatus] = useState<TaskStatus>(task?.status || initialStatus || 'todo');
  const [priority, setPriority] = useState<Priority>(task?.priority || 'medium');
  const [dueDate, setDueDate] = useState<Date | null>(task?.dueDate ? new Date(task.dueDate) : null);
  const [selectedLabels, setSelectedLabels] = useState<string[]>(task?.labels || []);
  const [icon, setIcon] = useState<string>(task?.icon || 'briefcase');
  const [subtasks, setSubtasks] = useState<Subtask[]>(task?.subtasks || []);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  useEffect(() => {
    if (task) {
      setSubtasks(task.subtasks || []);
    }
  }, [task]);

  // Custom Dropdowns
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);
  
  // Custom Calendar
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(dueDate || new Date());

  const handleSave = () => {
    if (!title.trim()) return;
    
    const taskData = {
      title,
      description,
      status,
      priority,
      dueDate: dueDate ? dueDate.toISOString() : null,
      labels: selectedLabels,
      icon,
      subtasks
    };

    if (task) {
      updateTask(task.id, taskData);
    } else {
      addTask(taskData);
    }
    setIsEditMode(false);
    if (!task) onClose();
  };

  const toggleLabel = (label: string) => {
    setSelectedLabels(prev => 
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  };

  const handleAddSubtask = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newSubtaskTitle.trim()) {
      e.preventDefault();
      setSubtasks([...subtasks, { id: Date.now().toString(), title: newSubtaskTitle.trim(), completed: false }]);
      setNewSubtaskTitle('');
    }
  };

  const toggleSubtask = (id: string) => {
    if (!isEditMode) return;
    setSubtasks(subtasks.map(s => s.id === id ? { ...s, completed: !s.completed } : s));
  };
  
  const toggleSubtaskAnywhere = (id: string) => {
    setSubtasks(subtasks.map(s => s.id === id ? { ...s, completed: !s.completed } : s));
  };

  const removeSubtask = (id: string) => {
    setSubtasks(subtasks.filter(s => s.id !== id));
  };

  const renderCalendar = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

    return (
      <div className="absolute top-full left-0 mt-2 p-5 bg-[#121214] border border-zinc-800/80 rounded-3xl shadow-2xl z-50 w-[300px]">
        <div className="flex items-center justify-between mb-4">
          <button type="button" onClick={(e) => { e.stopPropagation(); setCalendarMonth(new Date(year, month - 1)); }} className="p-1 hover:bg-zinc-800 rounded-md text-zinc-400">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-white">
            {calendarMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </span>
          <button type="button" onClick={(e) => { e.stopPropagation(); setCalendarMonth(new Date(year, month + 1)); }} className="p-1 hover:bg-zinc-800 rounded-md text-zinc-400">
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
            <div key={d} className="text-center text-[10px] font-medium text-zinc-500">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d, i) => {
            if (!d) return <div key={`empty-${i}`} className="w-8 h-8" />;
            const isSelected = dueDate && d.toDateString() === dueDate.toDateString();
            const isToday = d.toDateString() === new Date().toDateString();
            return (
              <button
                key={i}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDueDate(d);
                  setIsCalendarOpen(false);
                }}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition-colors ${
                  isSelected ? 'bg-white text-white font-bold' :
                  isToday ? 'bg-zinc-800 text-white font-bold border border-zinc-700' :
                  'text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                {d.getDate()}
              </button>
            );
          })}
        </div>
        <div className="mt-4 pt-3 border-t border-zinc-800 flex justify-between">
          <button type="button" onClick={(e) => { e.stopPropagation(); setDueDate(null); setIsCalendarOpen(false); }} className="text-xs text-rose-400 hover:text-rose-300">Clear</button>
          <button type="button" onClick={(e) => { e.stopPropagation(); setDueDate(new Date()); setIsCalendarOpen(false); }} className="text-xs text-white hover:text-indigo-300 font-medium">Today</button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 sm:p-6 animate-fade-in overflow-y-auto" onClick={onClose}>
      <div className="bg-[#0a0a0a] border border-zinc-800/60 rounded-[32px] w-full max-w-[540px] shadow-[0_0_80px_rgba(0,0,0,0.8)] relative overflow-hidden animate-slide-up flex flex-col my-auto" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-6 border-b border-zinc-800/40 flex justify-between items-center bg-transparent">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">
              {isEditMode ? (task ? 'Edit Task' : 'New Task') : 'Task Details'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {!isEditMode && (
              <button 
                onClick={() => setIsEditMode(true)} 
                className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors text-sm font-medium"
              >
                <Edit3 size={16} /> Edit
              </button>
            )}
            <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {isEditMode ? (
            <div className="space-y-6">
              
              {/* Title & Description */}
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Task Title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                  className="w-full bg-zinc-900/40 border border-zinc-800/50 rounded-2xl px-5 py-4 text-xl text-white placeholder-zinc-600 focus:outline-none focus:bg-zinc-900/80 focus:border-zinc-700 transition-all font-semibold"
                />
                <input
                  type="text"
                  placeholder="Short description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-zinc-900/40 border border-zinc-800/50 rounded-2xl px-5 py-3.5 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:bg-zinc-900/80 focus:border-zinc-700 transition-all"
                />
              </div>

              {/* Status & Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Status</label>
                  <div 
                    className="w-full bg-zinc-900/40 border border-zinc-800/50 rounded-2xl px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-zinc-900/80 hover:border-zinc-700 transition-all"
                    onClick={() => setIsStatusOpen(!isStatusOpen)}
                  >
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${STATUSES.find(s => s.id === status)?.color}`}>
                      {STATUSES.find(s => s.id === status)?.label}
                    </span>
                    <ChevronDown size={16} className="text-zinc-500" />
                  </div>
                  {isStatusOpen && (
                    <div className="absolute top-full left-0 w-full mt-2 bg-[#121214] border border-zinc-800/80 rounded-2xl shadow-2xl z-50 overflow-hidden py-1">
                      {STATUSES.map(s => (
                        <div 
                          key={s.id}
                          className="px-4 py-2.5 mx-1 my-0.5 rounded-xl hover:bg-zinc-800/80 cursor-pointer flex items-center gap-2 transition-colors"
                          onClick={() => { setStatus(s.id); setIsStatusOpen(false); }}
                        >
                          <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${s.color}`}>{s.label}</span>
                          {status === s.id && <Check size={14} className="ml-auto text-white" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Priority</label>
                  <div 
                    className="w-full bg-zinc-900/40 border border-zinc-800/50 rounded-2xl px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-zinc-900/80 hover:border-zinc-700 transition-all"
                    onClick={() => setIsPriorityOpen(!isPriorityOpen)}
                  >
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${PRIORITIES.find(p => p.id === priority)?.color}`}>
                      {PRIORITIES.find(p => p.id === priority)?.label}
                    </span>
                    <ChevronDown size={16} className="text-zinc-500" />
                  </div>
                  {isPriorityOpen && (
                    <div className="absolute top-full left-0 w-full mt-2 bg-[#121214] border border-zinc-800/80 rounded-2xl shadow-2xl z-50 overflow-hidden py-1">
                      {PRIORITIES.map(p => (
                        <div 
                          key={p.id}
                          className="px-4 py-2.5 mx-1 my-0.5 rounded-xl hover:bg-zinc-800/80 cursor-pointer flex items-center gap-2 transition-colors"
                          onClick={() => { setPriority(p.id); setIsPriorityOpen(false); }}
                        >
                          <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${p.color}`}>{p.label}</span>
                          {priority === p.id && <Check size={14} className="ml-auto text-white" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Due Date */}
              <div className="relative">
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Due Date</label>
                <div 
                  className="w-full bg-zinc-900/40 border border-zinc-800/50 rounded-2xl px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-zinc-900/80 hover:border-zinc-700 transition-all"
                  onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                >
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarIcon size={16} className="text-zinc-400" />
                    <span className={dueDate ? 'text-zinc-200' : 'text-zinc-500'}>
                      {dueDate ? dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'No date set'}
                    </span>
                  </div>
                </div>
                {isCalendarOpen && renderCalendar()}
              </div>

              {/* Icon Picker (Grid of 5x2) */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Task Icon</label>
                <div className="grid grid-cols-5 gap-2 p-2.5 bg-zinc-900/30 border border-zinc-800/40 rounded-2xl">
                  {Object.entries(ICONS).map(([key, comp]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setIcon(key)}
                      className={`h-12 rounded-[14px] flex items-center justify-center transition-all duration-200 ${
                        icon === key ? 'bg-white text-zinc-900 shadow-md scale-105' : 'text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300'
                      }`}
                    >
                      {comp}
                    </button>
                  ))}
                </div>
              </div>

                            {/* Subtasks (Edit Mode) */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Subtasks & Checklists</label>
                <div className="space-y-2 mb-3">
                  {subtasks.map(subtask => (
                    <div key={subtask.id} className="flex items-center gap-3 bg-zinc-900/40 border border-zinc-800/50 rounded-xl px-4 py-3 group">
                      <button 
                        type="button" 
                        onClick={() => toggleSubtask(subtask.id)}
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${subtask.completed ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-zinc-600 text-transparent hover:border-zinc-400'}`}
                      >
                        <Check size={12} />
                      </button>
                      <span className={`flex-1 text-sm ${subtask.completed ? 'line-through text-zinc-600' : 'text-zinc-200'}`}>
                        {subtask.title}
                      </span>
                      <button 
                        type="button"
                        onClick={() => removeSubtask(subtask.id)}
                        className="text-zinc-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Add new subtask... (Press Enter)"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={handleAddSubtask}
                  className="w-full bg-zinc-900/20 border border-zinc-800/50 border-dashed rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
                />
              </div>

              {/* Labels */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Tag size={14} /> Labels
                </label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_LABELS.map(label => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => toggleLabel(label)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                        selectedLabels.includes(label)
                          ? 'bg-white text-zinc-900 border-transparent shadow-sm'
                          : 'bg-zinc-900/40 text-zinc-400 border-zinc-800/50 hover:bg-zinc-800/80 hover:text-zinc-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex items-center justify-between pt-6 border-t border-zinc-800 mt-6">
                {task ? (
                  <button
                    type="button"
                    onClick={() => {
                      deleteTask(task.id);
                      onClose();
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors font-medium text-sm"
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                ) : (
                  <div></div>
                )}
                
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (task) setIsEditMode(false);
                      else onClose();
                    }}
                    className="px-6 py-3 text-zinc-400 font-medium hover:text-white transition-colors rounded-2xl hover:bg-zinc-800/60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!title.trim()}
                    className="px-8 py-3 bg-white text-zinc-900 hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed font-bold rounded-2xl transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] active:scale-95"
                  >
                    {task ? 'Save Changes' : 'Create Task'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // View Mode
            <div className="space-y-8">
              <div>
                <h3 className="text-2xl font-bold text-white leading-tight mb-2">{title}</h3>
                {description && <p className="text-zinc-400 leading-relaxed text-sm">{description}</p>}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-zinc-900/30 border border-zinc-800/40 p-5 rounded-[20px] shadow-sm">
                  <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest block mb-3">Status</span>
                  <span className={`px-2.5 py-1 rounded-md text-xs font-bold inline-block ${STATUSES.find(s => s.id === status)?.color}`}>
                    {STATUSES.find(s => s.id === status)?.label}
                  </span>
                </div>
                <div className="bg-zinc-900/30 border border-zinc-800/40 p-5 rounded-[20px] shadow-sm">
                  <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest block mb-3">Priority</span>
                  <span className={`px-2.5 py-1 rounded-md text-xs font-bold inline-block ${PRIORITIES.find(p => p.id === priority)?.color}`}>
                    {PRIORITIES.find(p => p.id === priority)?.label}
                  </span>
                </div>
                <div className="bg-[#18181b] border border-zinc-800 p-4 rounded-2xl sm:col-span-2">
                  <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest block mb-3">Due Date</span>
                  <div className="flex items-center gap-2 text-sm text-zinc-300 font-medium">
                    <CalendarIcon size={16} className="text-white" />
                    {dueDate ? dueDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'No strict deadline'}
                  </div>
                </div>
              </div>

                            {selectedLabels.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Tag size={14} /> Applied Labels
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedLabels.map(label => (
                      <span key={label} className="px-4 py-2 bg-zinc-900/40 border border-zinc-800/50 text-zinc-300 rounded-xl text-xs font-bold">
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {subtasks.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Checklist ({subtasks.filter(s => s.completed).length}/{subtasks.length})</h4>
                    <div className="h-1.5 flex-1 mx-4 bg-zinc-900 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 transition-all duration-500 ease-out" 
                        style={{ width: `${(subtasks.filter(s => s.completed).length / subtasks.length) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    {subtasks.map(subtask => (
                      <div key={subtask.id} className="flex items-center gap-3 bg-zinc-900/20 border border-zinc-800/30 rounded-xl px-4 py-3">
                        <button 
                          type="button" 
                          onClick={() => {
                            toggleSubtaskAnywhere(subtask.id);
                            if (task) {
                              const newSubtasks = subtasks.map(s => s.id === subtask.id ? { ...s, completed: !s.completed } : s);
                              updateTask(task.id, { subtasks: newSubtasks });
                            }
                          }}
                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${subtask.completed ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-zinc-600 text-transparent hover:border-zinc-400'}`}
                        >
                          <Check size={12} />
                        </button>
                        <span className={`text-sm ${subtask.completed ? 'line-through text-zinc-600' : 'text-zinc-200'}`}>
                          {subtask.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

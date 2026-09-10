import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Check, Calendar as CalendarIcon, CheckSquare, Trash2, Sunrise, Sun, Moon, MoonStar, Flame, CheckCircle2, Circle, Edit3, Target, Activity, Zap, GripVertical, Coffee, Book, Dumbbell, Droplets, Heart, Brain, ChevronRight, X, ChevronDown, Briefcase, ChevronLeft, CalendarDays, Ban, ListChecks , SkipForward, Minus, History } from 'lucide-react';
import { useAppStore } from '../store';
import { Routine } from '../types';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

const ROUTINE_COLORS = [
  { id: 'emerald', bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20', solid: 'bg-emerald-500' },
  { id: 'blue', bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20', solid: 'bg-blue-500' },
  { id: 'indigo', bg: 'bg-white/5', text: 'text-indigo-500', border: 'border-zinc-400/20', solid: 'bg-white' },
  { id: 'purple', bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500/20', solid: 'bg-purple-500' },
  { id: 'rose', bg: 'bg-rose-500/10', text: 'text-rose-500', border: 'border-rose-500/20', solid: 'bg-rose-500' },
  { id: 'amber', bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20', solid: 'bg-amber-500' }
];

const ICONS: Record<string, React.ReactNode> = {
  activity: <Activity size={20} />,
  zap: <Zap size={20} />,
  coffee: <Coffee size={20} />,
  book: <Book size={20} />,
  dumbbell: <Dumbbell size={20} />,
  droplets: <Droplets size={20} />,
  heart: <Heart size={20} />,
  brain: <Brain size={20} />,
  target: <Target size={20} />,
  briefcase: <Briefcase size={20} />
};

const TIME_OPTIONS = [
  { id: 'any', label: 'Any Time', hint: 'No specific time constraints' },
  { id: 'morning', label: 'Morning', hint: '5 AM - 12 PM' },
  { id: 'afternoon', label: 'Afternoon', hint: '12 PM - 5 PM' },
  { id: 'evening', label: 'Evening', hint: '5 PM - 9 PM' },
  { id: 'night', label: 'Night', hint: '9 PM - 5 AM' }
];

const DAYS_OF_WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function RoutinesView() {
  const { routines, addRoutine, updateRoutine, deleteRoutine, toggleRoutineCompletion, toggleRoutineSkip, reorderRoutines } = useAppStore();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [statsRoutineId, setStatsRoutineId] = useState<string | null>(null);
  const [pastActionConfirm, setPastActionConfirm] = useState<{type: 'completion' | 'skip', routine: Routine, dateStr: string} | null>(null);
  
  // Stats Calendar State
  const [statsMonth, setStatsMonth] = useState<Date>(new Date());
  
  // Full History State
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [historyMonth, setHistoryMonth] = useState<Date>(new Date());
      
      // Multiselect State
      const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
      const [selectedRoutineIds, setSelectedRoutineIds] = useState<Set<string>>(new Set());
      const [deleteConfirmation, setDeleteConfirmation] = useState<{type: 'single' | 'bulk', id?: string} | null>(null);
      
      const executeBulkDelete = () => {
        selectedRoutineIds.forEach(id => deleteRoutine(id));
        setSelectedRoutineIds(new Set());
        setIsMultiSelectMode(false);
      };
      
      const executeSingleDelete = (id: string) => {
        deleteRoutine(id);
        setDeleteConfirmation(null);
        setIsFormModalOpen(false);
      };
  
  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('emerald');
  const [icon, setIcon] = useState('activity');
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'afternoon' | 'evening' | 'night' | 'any'>('any');
  
  // Frequency State
  const [freqType, setFreqType] = useState<'daily' | 'specific_days' | 'x_per_week'>('daily');
  const [freqDays, setFreqDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri default
  const [freqTarget, setFreqTarget] = useState<number>(3); // 3x week default

  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);
  const [isFreqDropdownOpen, setIsFreqDropdownOpen] = useState(false);

  const getLocalYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const selectedDateStr = getLocalYMD(selectedDate);
  const todayStr = getLocalYMD(new Date());
  const isToday = selectedDateStr === todayStr;

  // Helpers
  
  const handleRoutineAction = (type: 'completion' | 'skip', routine: Routine, dateStr: string) => {
    if (dateStr < todayStr) {
      setPastActionConfirm({ type, routine, dateStr });
    } else {
      if (type === 'completion') {
        toggleRoutineCompletion(routine.id, dateStr);
      } else {
        toggleRoutineSkip(routine.id, dateStr);
      }
    }
  };

  const isAssignedToDate = (routine: Routine, dateStr: string) => {
    if (!routine.frequencyConfig || routine.frequencyConfig.type === 'daily') return true;
    
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    
    if (routine.frequencyConfig.type === 'specific_days') {
      return routine.frequencyConfig.days?.includes(dateObj.getDay()) ?? true;
    }
    // 'x_per_week' is visually assigned every day until completed
    return true;
  };

  const isScheduledForDate = (routine: Routine, dateStr: string) => {
    return isAssignedToDate(routine, dateStr) && !(routine.skippedDates?.includes(dateStr));
  };

  const calculateStreak = (routine: Routine) => {
    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 0;
    
    // Fast path: if no completions, return 0
    if (!routine.completedDates || routine.completedDates.length === 0) return { current: 0, best: 0 };
    
    const start = new Date(routine.createdAt);
    start.setHours(0,0,0,0);
    const today = new Date();
    today.setHours(0,0,0,0);

    let curr = new Date(start);
    while (curr <= today) {
      const dStr = getLocalYMD(curr);
      const isCompleted = routine.completedDates.includes(dStr);
      const isSkipped = routine.skippedDates?.includes(dStr);
      
      let scheduled = true;
      if (routine.frequencyConfig?.type === 'specific_days') {
        scheduled = routine.frequencyConfig.days?.includes(curr.getDay()) ?? true;
      }
      // For x_per_week, precise streak calculation is complex. We approximate by ignoring it as a daily breaker unless it's weekly-based.

      if (scheduled) {
        if (isCompleted) {
          tempStreak++;
          maxStreak = Math.max(maxStreak, tempStreak);
        } else if (isSkipped) {
          // preserve streak
        } else {
          if (dStr !== todayStr) {
            tempStreak = 0;
          }
        }
      } else {
        // If not scheduled but they did it anyway, boost streak
        if (isCompleted) {
          tempStreak++;
          maxStreak = Math.max(maxStreak, tempStreak);
        }
      }
      curr.setDate(curr.getDate() + 1);
    }
    
    return { current: tempStreak, best: maxStreak };
  };

  const openAddModal = () => {
    setEditingRoutine(null);
    setTitle('');
    setDescription('');
    setColor('emerald');
    setIcon('activity');
    setTimeOfDay('any');
    setFreqType('daily');
    setFreqDays([1, 2, 3, 4, 5]);
    setFreqTarget(3);
    setIsFormModalOpen(true);
    setStatsRoutineId(null);
  };

  const openEditModal = (routine: Routine) => {
    setEditingRoutine(routine);
    setTitle(routine.title);
    setDescription(routine.description);
    setColor(routine.color || 'emerald');
    setIcon(routine.icon || 'activity');
    setTimeOfDay(routine.timeOfDay || 'any');
    if (routine.frequencyConfig) {
      setFreqType(routine.frequencyConfig.type);
      setFreqDays(routine.frequencyConfig.days || [1, 2, 3, 4, 5]);
      setFreqTarget(routine.frequencyConfig.target || 3);
    } else {
      setFreqType('daily');
    }
    setIsFormModalOpen(true);
    setStatsRoutineId(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const frequencyConfig = {
      type: freqType,
      days: freqType === 'specific_days' ? freqDays : undefined,
      target: freqType === 'x_per_week' ? freqTarget : undefined,
    };

    if (editingRoutine) {
      updateRoutine(editingRoutine.id, { title, description, color, icon, timeOfDay, frequencyConfig });
    } else {
      addRoutine({ title, description, color, icon, timeOfDay, frequency: 'daily', frequencyConfig });
    }
    setIsFormModalOpen(false);
  };

  const handleDelete = (id: string) => {
    deleteRoutine(id);
    setIsFormModalOpen(false);
    setStatsRoutineId(null);
  };

  // Drag and Drop Handler
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const { source, destination } = result;
    
    if (source.droppableId !== destination.droppableId) return; // Only reorder within same block for now
    
    // Get items for the specific block
    const blockItems = [...routines]
      .filter(r => (r.timeOfDay || 'any') === source.droppableId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
      
    // Reorder
    const [reorderedItem] = blockItems.splice(source.index, 1);
    blockItems.splice(destination.index, 0, reorderedItem);
    
    // Create new array with updated orders
    const updatedRoutines = [...routines];
    blockItems.forEach((item, index) => {
      const idx = updatedRoutines.findIndex(r => r.id === item.id);
      if (idx !== -1) updatedRoutines[idx] = { ...updatedRoutines[idx], order: index };
    });
    
    reorderRoutines(updatedRoutines);
  };

  // Derived Data
  const sortedRoutines = [...routines].filter(r => r && r.id).sort((a, b) => (a.order || 0) - (b.order || 0));
  
  const sections = [
    { id: 'morning', title: 'Morning', icon: <Sunrise size={16} className="text-amber-500" />, items: sortedRoutines.filter(r => r.timeOfDay === 'morning') },
    { id: 'afternoon', title: 'Afternoon', icon: <Sun size={16} className="text-orange-500" />, items: sortedRoutines.filter(r => r.timeOfDay === 'afternoon') },
    { id: 'evening', title: 'Evening', icon: <Moon size={16} className="text-white" />, items: sortedRoutines.filter(r => r.timeOfDay === 'evening') },
    { id: 'night', title: 'Night', icon: <MoonStar size={16} className="text-purple-400" />, items: sortedRoutines.filter(r => r.timeOfDay === 'night') },
    { id: 'any', title: 'Any Time', icon: <Activity size={16} className="text-emerald-500" />, items: sortedRoutines.filter(r => !r.timeOfDay || r.timeOfDay === 'any') }
  ];

  const assignedToday = sortedRoutines.filter(r => isAssignedToDate(r, selectedDateStr));
  const scheduledToday = routines.filter(r => isScheduledForDate(r, selectedDateStr));
  const completedToday = assignedToday.filter(r => r.completedDates.includes(selectedDateStr));
  
  const progressPercentage = assignedToday.length 
    ? Math.round((completedToday.length / assignedToday.length) * 100) 
    : 100;
  
  const isPerfectDay = assignedToday.length > 0 && progressPercentage === 100;

  // Calendar Week
  const weekDates = useMemo(() => {
    const dates = [];
    const curr = new Date(selectedDate);
    curr.setDate(curr.getDate() - curr.getDay());
    for (let i = 0; i < 7; i++) {
      dates.push(new Date(curr));
      curr.setDate(curr.getDate() + 1);
    }
    return dates;
  }, [selectedDate]);

  // Last 30 Days for History
  const last30Days = useMemo(() => {
    return Array.from({length: 30}, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      return d;
    });
  }, []);

  // Card Renderer
  const renderRoutineCard = (routine: Routine, index: number) => {
    const isDone = routine.completedDates.includes(selectedDateStr);
    const isSkipped = routine.skippedDates?.includes(selectedDateStr);
    const isScheduled = isScheduledForDate(routine, selectedDateStr);
    const streakData = calculateStreak(routine);
    const theme = ROUTINE_COLORS.find(c => c.id === (routine.color || 'emerald')) || ROUTINE_COLORS[0];
    const IconComp = ICONS[routine.icon || 'activity'] || ICONS['activity'];

    return (
      <Draggable key={routine.id} draggableId={routine.id} index={index}>
        {(provided, snapshot) => (
          <div 
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={`group flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
              snapshot.isDragging ? 'shadow-2xl shadow-black/50 border-zinc-600 bg-[#18181b] z-50 rotate-1' : ''
            } ${
              isDone 
                ? 'bg-zinc-900/40 border-zinc-800/50 opacity-60 hover:opacity-100' 
                : isSkipped 
                  ? 'bg-zinc-900/20 border-zinc-800/30 opacity-40 hover:opacity-80'
                  : 'bg-[#18181b] border-zinc-800 hover:border-zinc-700 shadow-sm hover:shadow-md'
            }`}
            onClick={(e) => {
              if (isMultiSelectMode) {
                e.stopPropagation();
                const next = new Set(selectedRoutineIds);
                if (next.has(routine.id)) next.delete(routine.id);
                else next.add(routine.id);
                setSelectedRoutineIds(next);
              } else {
                handleRoutineAction('completion', routine, selectedDateStr);
              }
            }}
            style={provided.draggableProps.style}
          >
            <div className="flex items-center gap-3 flex-1 overflow-hidden">
              {isMultiSelectMode && (
                <div className="shrink-0 mr-1" onClick={(e) => { e.stopPropagation(); const next = new Set(selectedRoutineIds); if (next.has(routine.id)) next.delete(routine.id); else next.add(routine.id); setSelectedRoutineIds(next); }}>
                  {selectedRoutineIds.has(routine.id) ? (
                    <CheckCircle2 size={20} className="text-white" />
                  ) : (
                    <Circle size={20} className="text-zinc-600" />
                  )}
                </div>
              )}
              <div 
                {...provided.dragHandleProps} 
                className="w-5 flex items-center justify-center opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity cursor-grab text-zinc-500 shrink-0 -ml-1 mr-1"
                onClick={(e) => { e.stopPropagation(); const next = new Set(selectedRoutineIds); if (next.has(routine.id)) next.delete(routine.id); else next.add(routine.id); setSelectedRoutineIds(next); }}
              >
                <GripVertical size={16} />
              </div>
              
                            <div 
                className="flex items-center gap-3 shrink overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                onClick={(e) => {
                  if (!isMultiSelectMode) {
                    e.stopPropagation();
                    setStatsRoutineId(routine.id);
                  }
                }}
              >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                isDone ? 'bg-zinc-800 text-zinc-500' : isSkipped ? 'bg-zinc-900 text-zinc-600' : theme.bg + ' ' + theme.text
              }`}>
                {IconComp}
              </div>
              <div className="overflow-hidden pr-2">
                <h4 className={`font-semibold text-base truncate transition-colors ${isDone ? 'text-zinc-500 line-through' : isSkipped ? 'text-zinc-600 italic' : 'text-zinc-100'}`}>
                  {routine.title}
                </h4>
                <div className="flex items-center gap-3 mt-1">
                  {routine.description && (
                    <p className="text-xs text-zinc-500 truncate max-w-[200px] hidden sm:block">{routine.description}</p>
                  )}
                  {streakData.current > 0 && !isSkipped && (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-md shrink-0">
                      <Flame size={10} /> {streakData.current} day{streakData.current > 1 ? 's' : ''}
                    </span>
                  )}
                  {isSkipped && (
                     <span className="flex items-center gap-1 text-[11px] font-medium text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded-md shrink-0">
                       <Ban size={10} /> Skipped
                     </span>
                  )}
                </div>
              </div>
            </div>
            
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isMultiSelectMode ? (
                <>
                  <button 
                    onClick={(e) => { e.stopPropagation(); openEditModal(routine); }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirmation({ type: 'single', id: routine.id }); }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-rose-500/70 hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              ) : (
                <div 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    handleRoutineAction('completion', routine, selectedDateStr); 
                  }}
                  className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all cursor-pointer ${
                  isDone 
                    ? `bg-white border-transparent text-zinc-900 scale-110 shadow-lg shadow-white/20` 
                    : isSkipped 
                      ? 'border-zinc-800 text-transparent'
                      : 'border-zinc-700 text-transparent hover:border-zinc-500'
                }`}>
                  <Check size={14} className={isDone ? 'opacity-100' : 'opacity-0'} />
                </div>
              )}
            </div>
          </div>
        )}
      </Draggable>
    );
  };

  // Render Stats Modal Helper
  
  // Helper to determine the state of a given date for a routine
  const getDayState = (routine: Routine, dateStr: string, todayStr: string): 'done' | 'skipped' | 'missed' | 'pending' | 'blank' => {
    if (routine.completedDates.includes(dateStr)) return 'done';
    if (routine.skippedDates?.includes(dateStr)) return 'skipped';

    if (dateStr > todayStr) return 'pending'; // Future
    if (dateStr === todayStr) {
      if (routine.frequencyConfig?.type === 'daily') return 'pending';
      if (routine.frequencyConfig?.type === 'specific_days') {
         const jsDay = new Date(dateStr).getDay();
         const uiDay = jsDay === 0 ? 6 : jsDay - 1;
         return routine.frequencyConfig?.days?.includes(uiDay) ? 'pending' : 'blank';
      }
      return 'pending'; // x_per_week is pending today
    }

    // Past days
    if (routine.frequencyConfig?.type === 'daily') return 'missed';
    
    if (routine.frequencyConfig?.type === 'specific_days') {
      const jsDay = new Date(dateStr).getDay();
      const uiDay = jsDay === 0 ? 6 : jsDay - 1;
      return routine.frequencyConfig?.days?.includes(uiDay) ? 'missed' : 'blank';
    }
    
    if (routine.frequencyConfig?.type === 'x_per_week') {
      const target = routine.frequencyConfig?.target || 1;
      const d = new Date(dateStr);
      const jsDay = d.getDay();
      const uiDay = jsDay === 0 ? 6 : jsDay - 1; // 0=Mon, 6=Sun
      
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - uiDay);
      
      let completionsBeforeD = 0;
      for (let i = 0; i < uiDay; i++) {
         const checkD = new Date(weekStart);
         checkD.setDate(weekStart.getDate() + i);
         const checkStr = getLocalYMD(checkD);
         if (routine.completedDates.includes(checkStr)) completionsBeforeD++;
      }
      
      const daysLeftInWeekAfterD = 6 - uiDay;
      const neededAfterD = target - completionsBeforeD;
      
      if (daysLeftInWeekAfterD < neededAfterD) return 'missed';
      return 'blank';
    }
    
    return 'blank';
  };

  const renderStatsModal = () => {
    if (!statsRoutineId) return null;
    const routine = routines.find(r => r.id === statsRoutineId);
    if (!routine) return null;
    
    const theme = ROUTINE_COLORS.find(c => c.id === (routine.color || 'emerald')) || ROUTINE_COLORS[0];
    const IconComp = ICONS[routine.icon || 'activity'] || ICONS['activity'];
    const streak = calculateStreak(routine);
    
    // Advanced Stats calculation
    const totalCompletions = routine.completedDates.length;
    let expected = 0;
    const msSinceCreation = Math.max(0, new Date().getTime() - new Date(routine.createdAt).getTime());
    const daysSinceCreation = Math.max(1, Math.ceil(msSinceCreation / 86400000));
    
    if (routine.frequencyConfig?.type === 'daily') {
      expected = daysSinceCreation;
    } else if (routine.frequencyConfig?.type === 'specific_days') {
      const start = new Date(routine.createdAt);
      for(let i=0; i<daysSinceCreation; i++) {
         const d = new Date(start.getTime() + i * 86400000);
         const jsDay = d.getDay();
         const uiDay = jsDay === 0 ? 6 : jsDay - 1;
         if (routine.frequencyConfig?.days?.includes(uiDay)) expected++;
      }
    } else {
      expected = Math.ceil(daysSinceCreation / 7) * (routine.frequencyConfig?.target || 1);
    }
    const completionRate = expected === 0 ? 0 : Math.min(100, Math.round((totalCompletions / expected) * 100));
    
    const isDoneToday = routine.completedDates.includes(selectedDateStr);
    const isSkippedToday = routine.skippedDates?.includes(selectedDateStr);

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in" onClick={() => setStatsRoutineId(null)}>
        <div className="bg-[#09090b] border border-zinc-800 rounded-[32px] w-full max-w-md shadow-2xl relative overflow-hidden animate-slide-up flex flex-col" onClick={e => e.stopPropagation()}>
          
          <div className={`h-24 ${theme.bg} relative overflow-hidden flex-shrink-0`}>
            <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] to-transparent"></div>
            <button 
              onClick={() => setStatsRoutineId(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center backdrop-blur-md transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          
          <div className="px-6 pb-6 -mt-10 relative z-10 flex-1 overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center shadow-xl border-4 border-[#09090b] ${theme.bg} ${theme.text} shrink-0`}>
                  {React.cloneElement(IconComp as React.ReactElement<any>, { className: "w-8 h-8 sm:w-10 sm:h-10" })}
                </div>
                <div className="flex flex-col justify-center">
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1 leading-tight">{routine.title}</h2>
                  {routine.description && (
                    <p className="text-zinc-400 text-sm sm:text-base max-w-[180px] sm:max-w-xs truncate">{routine.description}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button 
                  onClick={() => { openEditModal(routine); setStatsRoutineId(null); }}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
                >
                  <Edit3 size={16} />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-8">
              <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 flex flex-col">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Current Streak</span>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-black text-white">{streak.current}</span>
                  <span className="text-amber-500 text-sm font-medium mb-1 flex items-center gap-1"><Flame size={14}/> days</span>
                </div>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 flex flex-col">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Best Streak</span>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-black text-white">{streak.best}</span>
                  <span className="text-zinc-400 text-sm font-medium mb-1">days</span>
                </div>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 flex flex-col">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Total Done</span>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-black text-white">{totalCompletions}</span>
                  <span className="text-zinc-400 text-sm font-medium mb-1">times</span>
                </div>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 flex flex-col">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Completion</span>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-black text-white">{completionRate}%</span>
                  <span className="text-zinc-400 text-sm font-medium mb-1">rate</span>
                </div>
              </div>
            </div>
            
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Last 30 Days</h3>
            </div>
            <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-4 overflow-x-auto custom-scrollbar">
              <div className="min-w-[600px] flex justify-between">
                 {last30Days.map((dayDate, i) => {
                   const dateStr = getLocalYMD(dayDate);
                   const state = getDayState(routine, dateStr, todayStr);
                   const isToday = dateStr === todayStr;
                   
                   return (
                     <div key={i} className="flex flex-col items-center gap-1.5">
                       <div className="flex flex-col items-center mb-0.5">
                         <span className="text-[10px] text-zinc-500 font-medium">{DAYS_OF_WEEK[dayDate.getDay()][0]}</span>
                         <span className={`text-[10px] font-bold ${isToday ? 'text-white' : 'text-zinc-400'}`}>{dayDate.getDate()}</span>
                       </div>
                       {state === 'done' ? (
                         <div className="w-6 h-6 rounded-md bg-emerald-500/20 border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.15)] flex items-center justify-center text-emerald-400" title="Completed">
                           <Check size={14} strokeWidth={4} />
                         </div>
                       ) : state === 'missed' ? (
                         <div className="w-6 h-6 rounded-md bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500" title="Missed">
                           <X size={14} strokeWidth={3} />
                         </div>
                       ) : state === 'skipped' ? (
                         <div className="w-6 h-6 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500" title="Skipped">
                           <SkipForward size={12} strokeWidth={3} />
                         </div>
                       ) : state === 'pending' ? (
                         <div className="w-6 h-6 rounded-md bg-zinc-800/50 border border-zinc-700/30" title="Pending" />
                       ) : (
                         <div className="w-6 h-6 rounded-md flex items-center justify-center text-zinc-700 font-bold" title="Not scheduled">
                           -
                         </div>
                       )}
                     </div>
                   );
                 })}
              </div>
            </div>
          </div>
          
          <div className="p-4 border-t border-zinc-800/80 bg-zinc-900/50 flex gap-2 sm:gap-3 shrink-0">
            <button 
              onClick={() => handleRoutineAction('skip', routine, selectedDateStr)}
              className={`flex-[1.2] py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm ${
                isSkippedToday ? 'bg-zinc-700 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              <Ban size={16} className="shrink-0" /> 
              <span className="whitespace-nowrap">{isSkippedToday ? 'Unskip Today' : 'Skip Today'}</span>
            </button>
            <button 
              onClick={() => handleRoutineAction('completion', routine, selectedDateStr)}
              className={`flex-[1.8] py-3 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-1.5 sm:gap-2 text-sm ${
                isDoneToday 
                  ? 'bg-zinc-200 text-zinc-900 shadow-white/10 hover:bg-white' 
                  : 'bg-white text-zinc-900 hover:bg-zinc-200 shadow-[0_0_15px_rgba(255,255,255,0.1)] active:scale-95'
              }`}
            >
              <Check size={18} strokeWidth={isDoneToday ? 3 : 2} className="shrink-0" /> 
              <span className="whitespace-nowrap">{isDoneToday ? 'Completed' : 'Mark Done'}</span>
            </button>
          </div>
          
        </div>
      </div>
    );
  };
  return (
    <div className="h-full flex flex-col relative overflow-hidden bg-[#09090b]">
      {/* Header */}
      <div className="h-16 shrink-0 border-b border-zinc-800/80 px-6 flex items-center justify-between bg-zinc-900/20 z-10 relative">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <CheckSquare size={20} className="text-white" />
          Routines
        </h2>
        <button 
          onClick={openAddModal}
          className="flex items-center justify-center text-zinc-900 bg-white hover:bg-zinc-200 w-8 h-8 rounded-lg transition-colors shadow-sm"
          title="New Routine"
        >
          <Plus size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8 relative z-0">
        <div className="max-w-5xl mx-auto">
          {/* Dashboard Parent Block */}
          <div className="bg-[#18181b] border border-zinc-800 rounded-[32px] p-4 sm:p-6 shadow-2xl mb-10 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent rounded-[32px] pointer-events-none"></div>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 relative z-10">
              {/* Progress Card */}
              <div className="lg:col-span-7 bg-[#09090b] border border-zinc-800/80 rounded-3xl p-6 sm:p-8 relative overflow-hidden flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 shadow-inner">
                {isPerfectDay ? (
                  <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none animate-pulse"></div>
                ) : (
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                )}
                
                <div className="z-10 text-center sm:text-left w-full">
                  <h3 className={`font-semibold mb-2 ${isPerfectDay ? 'text-amber-200' : 'text-zinc-400'}`}>
                    {isToday ? "Today's Progress" : selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                  </h3>
                  <div className="flex items-end gap-3 justify-center sm:justify-start">
                    <span className={`text-6xl font-black tracking-tighter ${isPerfectDay ? 'text-amber-400 drop-shadow-md' : 'text-white'}`}>
                      {progressPercentage}%
                    </span>
                    <span className={`font-medium mb-2 flex items-center gap-1.5 ${isPerfectDay ? 'text-amber-200/80' : 'text-zinc-500'}`}>
                      {isPerfectDay ? <Flame size={16} className="text-amber-400" /> : <CheckCircle2 size={16} className="text-emerald-500" />}
                      {completedToday.length} of {assignedToday.length} completed
                    </span>
                  </div>
                  
                  <div className={`mt-6 w-full max-w-sm h-3 rounded-full overflow-hidden border ${isPerfectDay ? 'bg-amber-900/30 border-amber-500/30' : 'bg-zinc-900 border-zinc-800'}`}>
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ease-out relative ${
                        isPerfectDay ? 'bg-gradient-to-r from-amber-400 to-yellow-300 shadow-[0_0_15px_rgba(251,191,36,0.5)]' : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                      }`}
                      style={{ width: `${progressPercentage}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                    </div>
                  </div>
                  
                  {isPerfectDay && (
                    <p className="mt-3 text-sm font-bold text-amber-400 uppercase tracking-widest animate-fade-in">Perfect Day Unlocked!</p>
                  )}
                </div>

                <div className="bg-zinc-900/50 backdrop-blur border border-zinc-800/80 rounded-2xl p-4 flex flex-col items-center justify-center min-w-[130px] shrink-0 z-10">
                  <CalendarDays size={24} className="text-white mb-2" />
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Scheduled</span>
                  <span className="text-3xl font-bold text-white">{assignedToday.length}</span>
                </div>
              </div>

              {/* Weekly Calendar */}
              <div className="lg:col-span-5 bg-[#09090b] border border-zinc-800/80 rounded-3xl p-5 sm:p-6 flex flex-col relative shadow-inner">
                {selectedDateStr < todayStr && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 mb-4 flex items-center justify-center gap-2 text-amber-500 animate-slide-down">
                    <CalendarIcon size={14} />
                    <span className="text-xs font-semibold">Viewing past date. Actions will affect history.</span>
                  </div>
                )}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}>
                    <h3 className="text-zinc-100 font-semibold text-base">This Week</h3>
                    <button className="p-1 rounded-md text-zinc-400 group-hover:bg-zinc-800 group-hover:text-white transition-colors">
                      <ChevronDown size={16} className={`transition-transform ${isHistoryExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                  <button 
                    onClick={() => setSelectedDate(new Date())}
                    className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${isToday ? 'bg-white/10 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
                  >
                    Today
                  </button>
                </div>
                
                <div className="flex justify-between items-center h-full gap-1">
                  {weekDates.map((date, i) => {
                    const dStr = getLocalYMD(date);
                    const isSelected = dStr === selectedDateStr;
                    const isCurrentToday = dStr === todayStr;
                    const isFuture = dStr > todayStr;
                    
                    const dayScheduled = routines.filter(r => isScheduledForDate(r, dStr));
                    const dayCompletions = dayScheduled.filter(r => r.completedDates.includes(dStr)).length;
                    const dayRatio = dayScheduled.length ? dayCompletions / dayScheduled.length : 0;
                    
                    return (
                      <div 
                        key={i} 
                        onClick={() => { if (!isFuture) setSelectedDate(date); }}
                        className={`flex flex-col items-center gap-1.5 w-full ${isFuture ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer group'}`}
                      >
                        <span className={`text-[10px] font-bold uppercase ${isCurrentToday ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-400'}`}>
                          {DAYS_OF_WEEK[date.getDay()]}
                        </span>
                        <div className={`w-8 h-10 sm:w-9 sm:h-12 rounded-full flex flex-col items-center justify-center transition-all relative ${
                          isSelected 
                            ? 'bg-white/10 text-white border border-white/20' 
                            : 'bg-zinc-900 text-zinc-400 border border-transparent group-hover:border-zinc-700'
                        }`}>
                          <span className="text-xs sm:text-sm font-bold z-10">{date.getDate()}</span>
                          
                          {/* Fill background based on ratio */}
                          {dayRatio > 0 && !isSelected && (
                            <div 
                              className="absolute bottom-0 left-0 right-0 bg-white/10 rounded-full rounded-t-none transition-all"
                              style={{ height: `${dayRatio * 100}%` }}
                            />
                          )}
                          {dayRatio === 1 && !isSelected && (
                            <div className="absolute inset-0 rounded-full border border-white/20"></div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 30-Day History */}
            {isHistoryExpanded && (
              <div className="mt-4 sm:mt-6 bg-[#09090b] border border-zinc-800/80 rounded-3xl p-5 sm:p-6 animate-slide-down shadow-inner overflow-hidden relative z-10">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-800/40">
                  <h3 className="text-base font-bold text-white">Recent History</h3>
                  <span className="text-xs font-medium text-zinc-500">Last 30 Days</span>
                </div>
                
                <div className="overflow-x-auto custom-scrollbar pb-4" ref={(el) => {
                  if (el) {
                    requestAnimationFrame(() => { el.scrollLeft = el.scrollWidth; });
                  }
                }}>
                  <div className="min-w-[900px]">
                    {/* Grid Header (Days) */}
                    <div className="flex mb-3">
                      <div className="w-48 shrink-0"></div>
                      <div className="flex-1 flex justify-between px-1">
                        {last30Days.map((dayDate, i) => {
                          const isToday = getLocalYMD(dayDate) === todayStr;
                          return (
                            <div key={i} className="w-8 flex flex-col items-center">
                              <span className="text-[10px] text-zinc-500 font-medium">{DAYS_OF_WEEK[dayDate.getDay()][0]}</span>
                              <span className={`text-xs font-bold ${isToday ? 'text-white' : 'text-zinc-300'}`}>{dayDate.getDate()}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                    {/* Grid Rows (Routines) */}
                    <div className="space-y-3">
                      {routines.map(routine => {
                        const theme = ROUTINE_COLORS.find(c => c.id === (routine.color || 'emerald')) || ROUTINE_COLORS[0];
                        const IconComp = ICONS[routine.icon || 'activity'] || ICONS['activity'];
                        
                        return (
                          <div key={routine.id} className="flex items-center group">
                            <div className="w-48 shrink-0 flex items-center gap-3 pr-4">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${theme.bg} ${theme.text}`}>
                                {React.cloneElement(IconComp as React.ReactElement<any>, { size: 14 })}
                              </div>
                              <span className="text-sm font-medium text-zinc-200 truncate">{routine.title}</span>
                            </div>
                            <div className="flex-1 flex justify-between bg-zinc-900/30 rounded-xl p-1.5 border border-zinc-800/30">
                              {last30Days.map((dayDate, i) => {
                                const dateStr = getLocalYMD(dayDate);
                                const state = getDayState(routine, dateStr, todayStr);
                                
                                return (
                                  <div key={i} className="w-8 flex justify-center py-0.5">
                                    {state === 'done' ? (
                                      <div className="w-5 h-5 rounded-md bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400" title="Completed">
                                        <Check size={12} strokeWidth={4} />
                                      </div>
                                    ) : state === 'missed' ? (
                                      <div className="w-5 h-5 rounded-md bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500" title="Missed">
                                        <X size={12} strokeWidth={4} />
                                      </div>
                                    ) : state === 'skipped' ? (
                                      <div className="w-5 h-5 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500" title="Skipped">
                                        <SkipForward size={10} strokeWidth={4} />
                                      </div>
                                    ) : state === 'pending' ? (
                                      <div className="w-5 h-5 rounded-md bg-zinc-800/50 border border-zinc-700/30 cursor-pointer" title="Pending" />
                                    ) : (
                                      <div className="w-5 h-5 rounded-md flex items-center justify-center text-zinc-700 font-bold text-xs" title="Not scheduled">
                                        -
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Routine Lists with Drag and Drop */}
          <div className="flex justify-between items-center mb-4">
             <div className="flex items-center gap-4">
                <h3 className="text-lg font-bold text-white">Your Routines</h3>
             </div>
             
             <div className="flex items-center gap-2">
                {isMultiSelectMode && (
                   <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-zinc-400">{selectedRoutineIds.size} selected</span>
                      <button 
                         disabled={selectedRoutineIds.size === 0}
                         onClick={() => setDeleteConfirmation({ type: 'bulk' })}
                         className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium transition-colors border border-rose-500/20"
                      >
                         <Trash2 size={14} /> Delete Selected
                      </button>
                   </div>
                )}
                
                <button
                   onClick={() => {
                      setIsMultiSelectMode(!isMultiSelectMode);
                      if (isMultiSelectMode) setSelectedRoutineIds(new Set());
                   }}
                   className={`p-2 rounded-xl border transition-colors flex items-center justify-center shrink-0 ${isMultiSelectMode ? 'bg-white/10 text-white border-white/20' : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                   title={isMultiSelectMode ? "Cancel Selection" : "Select Routines"}
                >
                   <ListChecks size={18} />
                </button>
             </div>
          </div>

          {routines.length === 0 ? (
            <div className="text-center py-20 bg-[#18181b] border border-zinc-800 border-dashed rounded-3xl">
              <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-4 text-zinc-600">
                <Target size={32} />
              </div>
              <h3 className="text-lg font-bold text-zinc-200 mb-2">Build Better Routines</h3>
              <p className="text-zinc-500 max-w-sm mx-auto mb-6">Create daily routines and track your streaks over time to build a healthier lifestyle.</p>
              <button 
                onClick={openAddModal}
                className="px-6 py-3 bg-white text-black font-semibold rounded-xl hover:bg-zinc-200 transition-colors"
              >
                Create Your First Routine
              </button>
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {sections.map(section => (
                  section.items.length > 0 && (
                    <div key={section.id} className="mb-2">
                      <div className="flex items-center gap-2 mb-4">
                        {section.icon}
                        <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">{section.title}</h4>
                      </div>
                      <Droppable droppableId={section.id}>
                        {(provided) => (
                          <div 
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className="space-y-3 min-h-[10px]"
                          >
                            {section.items.map((routine, index) => renderRoutineCard(routine, index))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  )
                ))}
              </div>
            </DragDropContext>
          )}
        </div>
      </div>

      {renderStatsModal()}

      {/* Add/Edit Modal */}
      {isFormModalOpen && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" 
          onClick={() => setIsFormModalOpen(false)}
        >
          <div 
            className="bg-[#0a0a0a] border border-zinc-800/60 rounded-[32px] p-8 max-w-[540px] w-full shadow-[0_0_80px_rgba(0,0,0,0.8)] relative max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col my-auto animate-slide-up" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-800/40">
              <h3 className="text-xl font-bold text-white">
                {editingRoutine ? 'Edit Routine' : 'New Routine'}
              </h3>
              <button onClick={() => setIsFormModalOpen(false)} className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              <div className="relative z-10">
                
                <input
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Routine Title..."
                  className="w-full bg-zinc-900/40 border border-zinc-800/50 rounded-2xl px-5 py-4 text-xl text-white placeholder-zinc-600 focus:outline-none focus:bg-zinc-900/80 focus:border-zinc-700 transition-all font-semibold"
                  required
                />
              </div>

              <div className="relative z-10">
                
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short description..."
                  className="w-full bg-zinc-900/40 border border-zinc-800/50 rounded-2xl px-5 py-3.5 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:bg-zinc-900/80 focus:border-zinc-700 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 relative z-50">
                <div className="relative">
                  <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Time of Day</label>
                  <div 
                    onClick={() => { setIsTimeDropdownOpen(!isTimeDropdownOpen); setIsFreqDropdownOpen(false); }}
                    className="w-full flex items-center justify-between bg-zinc-900/40 border border-zinc-800/50 rounded-2xl px-5 py-3.5 text-sm text-white cursor-pointer hover:bg-zinc-900/80 hover:border-zinc-700 transition-all h-[72px]"
                  >
                    <div className="flex flex-col text-left">
                      <span className="font-medium">{TIME_OPTIONS.find(t => t.id === timeOfDay)?.label}</span>
                      <span className="text-[10px] text-zinc-500 mt-0.5 truncate max-w-[100px]">{TIME_OPTIONS.find(t => t.id === timeOfDay)?.hint}</span>
                    </div>
                    <ChevronDown size={16} className={`text-zinc-500 transition-transform ${isTimeDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                  
                  {isTimeDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-[100]" onClick={(e) => { e.stopPropagation(); setIsTimeDropdownOpen(false); }} />
                      <div className="absolute top-full left-0 w-full mt-2 bg-[#121214] border border-zinc-800/80 rounded-2xl shadow-2xl z-[101] overflow-hidden flex flex-col py-1">
                        {TIME_OPTIONS.map(option => (
                          <div
                            key={option.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setTimeOfDay(option.id as any);
                              setIsTimeDropdownOpen(false);
                            }}
                            className={`flex items-center justify-between px-4 py-2.5 mx-1 my-0.5 rounded-xl hover:bg-zinc-800/80 cursor-pointer transition-colors ${timeOfDay === option.id ? 'bg-white/5' : ''}`}
                          >
                            <div className="flex flex-col text-left">
                              <span className={`text-sm font-medium ${timeOfDay === option.id ? 'text-white' : 'text-zinc-200'}`}>{option.label}</span>
                              <span className="text-[10px] text-zinc-500 mt-0.5">{option.hint}</span>
                            </div>
                            {timeOfDay === option.id && <Check size={16} className="text-white" />}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                
                <div className="relative">
                  <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Frequency</label>
                  <div 
                    onClick={() => { setIsFreqDropdownOpen(!isFreqDropdownOpen); setIsTimeDropdownOpen(false); }}
                    className="w-full flex items-center justify-between bg-zinc-900/40 border border-zinc-800/50 rounded-2xl px-5 py-3.5 text-sm text-white cursor-pointer hover:bg-zinc-900/80 hover:border-zinc-700 transition-all h-[72px]"
                  >
                    <div className="flex flex-col text-left">
                      <span className="font-medium">
                        {freqType === 'daily' ? 'Every Day' : freqType === 'specific_days' ? 'Specific Days' : `${freqTarget}x a Week`}
                      </span>
                    </div>
                    <ChevronDown size={16} className={`text-zinc-500 transition-transform ${isFreqDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                  
                  {isFreqDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-[100]" onClick={(e) => { e.stopPropagation(); setIsFreqDropdownOpen(false); }} />
                      <div className="absolute top-full left-0 w-full mt-2 bg-[#121214] border border-zinc-800/80 rounded-2xl shadow-2xl z-[101] overflow-hidden flex flex-col py-1">
                         {[{id:'daily', label: 'Every Day'}, {id:'specific_days', label: 'Specific Days'}, {id:'x_per_week', label: 'Times per Week'}].map(opt => (
                           <div
                             key={opt.id}
                             onClick={(e) => { 
                               e.stopPropagation();
                               setFreqType(opt.id as any); 
                               setIsFreqDropdownOpen(false); 
                             }}
                             className={`px-4 py-2.5 mx-1 my-0.5 rounded-xl cursor-pointer hover:bg-zinc-800/80 text-sm font-medium transition-colors flex justify-between items-center ${freqType === opt.id ? 'bg-white/5' : ''}`}
                           >
                             <span className={freqType === opt.id ? 'text-white' : 'text-zinc-200'}>{opt.label}</span>
                             {freqType === opt.id && <Check size={16} className="text-white" />}
                           </div>
                         ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Advanced Frequency Options */}
              {freqType === 'specific_days' && (
                <div className="relative z-40 p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl flex justify-between">
                  {DAYS_OF_WEEK.map((d, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setFreqDays(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])}
                      className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${freqDays.includes(i) ? 'bg-white text-zinc-900 shadow-md scale-105' : 'bg-zinc-900/40 border border-zinc-800/50 text-zinc-400 hover:bg-zinc-800/80'}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              )}
              {freqType === 'x_per_week' && (
                <div className="relative z-40 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-300">Target per week</span>
                  <div className="flex items-center gap-4">
                    <button type="button" onClick={() => setFreqTarget(Math.max(1, freqTarget - 1))} className="w-8 h-8 rounded-xl bg-zinc-800/60 hover:bg-zinc-700 flex items-center justify-center text-zinc-300 transition-colors">-</button>
                    <span className="font-bold text-lg text-white">{freqTarget}</span>
                    <button type="button" onClick={() => setFreqTarget(Math.min(7, freqTarget + 1))} className="w-8 h-8 rounded-xl bg-zinc-800/60 hover:bg-zinc-700 flex items-center justify-center text-zinc-300 transition-colors">+</button>
                  </div>
                </div>
              )}

              <div className="relative z-30">
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Theme Color</label>
                <div className="flex gap-2 p-3 bg-zinc-900 border border-zinc-800 rounded-xl justify-between items-center">
                  {ROUTINE_COLORS.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setColor(c.id)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all border-2 ${c.solid} ${color === c.id ? 'border-white scale-110 shadow-sm' : 'border-transparent opacity-50 hover:opacity-100'}`}
                    >
                      {color === c.id && <Check size={14} strokeWidth={3} className="text-white" />}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="relative z-20">
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Icon</label>
                <div className="grid grid-cols-5 gap-2 p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
                  {Object.entries(ICONS).map(([key, IconComp]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setIcon(key)}
                      className={`h-12 rounded-[14px] flex items-center justify-center transition-all duration-200 ${icon === key ? 'bg-white text-zinc-900 shadow-md scale-105' : 'text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300'}`}
                    >
                      {IconComp}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-zinc-800 mt-6 relative z-10">
                {editingRoutine ? (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmation({ type: 'single', id: editingRoutine.id })}
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
                    onClick={() => setIsFormModalOpen(false)}
                    className="px-5 py-2.5 text-zinc-400 font-medium hover:text-white transition-colors rounded-xl hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!title.trim()}
                    className="px-8 py-3 bg-white text-zinc-900 hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed font-bold rounded-2xl transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] active:scale-95"
                  >
                    {editingRoutine ? 'Save Changes' : 'Create Routine'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
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
                Delete {deleteConfirmation.type === 'bulk' ? `${selectedRoutineIds.size} Routines` : 'Routine'}?
              </h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                This action cannot be undone. All history, streaks, and progress associated with {deleteConfirmation.type === 'bulk' ? 'these routines' : 'this routine'} will be permanently removed.
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

      {/* Past Action Confirmation Modal */}
      {pastActionConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-fade-in" onClick={() => setPastActionConfirm(null)}>
          <div className="bg-[#09090b] border border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl relative overflow-hidden animate-slide-up flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 mb-4 mx-auto">
                <History size={24} />
              </div>
              <h3 className="text-lg font-bold text-white text-center mb-2">Modify Past Record?</h3>
              <p className="text-sm text-zinc-400 text-center mb-6">
                You are about to {pastActionConfirm.type === 'completion' ? 'change the completion status' : 'change the skip status'} for <strong>{pastActionConfirm.routine.title}</strong> on a past date ({pastActionConfirm.dateStr}).
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setPastActionConfirm(null)}
                  className="flex-1 py-2.5 rounded-xl font-semibold bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    if (pastActionConfirm.type === 'completion') {
                      toggleRoutineCompletion(pastActionConfirm.routine.id, pastActionConfirm.dateStr);
                    } else {
                      toggleRoutineSkip(pastActionConfirm.routine.id, pastActionConfirm.dateStr);
                    }
                    setPastActionConfirm(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl font-bold bg-amber-500 text-amber-950 hover:bg-amber-400 transition-colors"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

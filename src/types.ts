export type TaskStatus = 'todo' | 'in-progress' | 'done';
export type Priority = 'low' | 'medium' | 'high';

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  labels: string[]; 
  dueDate: string | null; 
  createdAt: string; 
  icon?: string;
  subtasks?: Subtask[];
}

export interface Routine {
  id: string;
  title: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  frequencyConfig?: {
    type: 'daily' | 'specific_days' | 'x_per_week';
    days?: number[];
    target?: number;
  };
  completedDates: string[]; 
  skippedDates?: string[];
  createdAt: string;
  icon?: string;
  color?: string;
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night' | 'any';
  order?: number;
}

export interface Note {
  id: string;
  title: string;
  content: string; 
  pinned?: boolean;
  tags?: string[];
  color?: string;
  updatedAt: string;
  createdAt: string;
}

// Custom Collections (Meta-Planner)
export type FieldType = 'text' | 'number' | 'checkbox' | 'select' | 'url' | 'date' | 'tag';

export interface FieldDef {
  id: string;
  name: string;
  type: FieldType;
  options?: string[]; // For 'select' type
  section?: string; // Grouping identifier (e.g. "FEES & FINANCES")
  width?: 'full' | 'half' | 'third'; // Layout width
  dependsOn?: string; // ID of a boolean field that must be true
  required?: boolean; // Whether the field is mandatory
  color?: 'blue' | 'emerald' | 'amber' | 'rose' | 'purple' | 'zinc'; // For 'tag' type
}

export interface CollectionTab {
  id: string;
  name: string;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  icon: string;
  fields: FieldDef[];
  tabs: CollectionTab[]; 
  pinned?: boolean;
  viewMode?: 'list' | 'grid';
  simplifiedViewFieldIds?: string[];
  createdAt: string;
}

export interface RecordItem {
  id: string;
  collectionId: string;
  tabId: string;
  data: Record<string, any>;
  order: number; 
  createdAt: string;
  updatedAt: string;
}

export interface AppState {
  tasks: Task[];
  routines: Routine[];
  notes: Note[];
  labels: Label[];
  collections: Collection[];
  records: RecordItem[];
  
  // Task Actions
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  deleteTasks: (ids: string[]) => void;
  reorderTasks: (tasks: Task[]) => void;

  // Routine Actions
  addRoutine: (routine: Omit<Routine, 'id' | 'createdAt' | 'completedDates' | 'skippedDates' | 'order'>) => void;
  updateRoutine: (id: string, updates: Partial<Routine>) => void;
  deleteRoutine: (id: string) => void;
  toggleRoutineCompletion: (id: string, dateStr: string) => void;
  toggleRoutineSkip: (id: string, dateStr: string) => void;
  reorderRoutines: (routines: Routine[]) => void;

  // Note Actions
  addNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => Note;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;

  // Label Actions
  addLabel: (label: Omit<Label, 'id'>) => void;
  deleteLabel: (id: string) => void;

  // Collection Actions
  addCollection: (collection: Omit<Collection, 'id' | 'createdAt'>) => void;
  updateCollection: (id: string, updates: Partial<Collection>) => void;
  deleteCollection: (id: string) => void;
  addCollectionTab: (collectionId: string, name: string) => void;
  updateCollectionTab: (collectionId: string, tabId: string, name: string) => void;
  deleteCollectionTab: (collectionId: string, tabId: string) => void;

  // Record Actions
  addRecord: (record: Omit<RecordItem, 'id' | 'createdAt' | 'updatedAt' | 'order'>) => void;
  updateRecord: (id: string, updates: Partial<RecordItem>) => void;
  deleteRecord: (id: string) => void;
  copyRecordsToTab: (recordIds: string[], targetTabId: string) => void;
  moveRecordsToTab: (recordIds: string[], targetTabId: string) => void;
  reorderRecords: (collectionId: string, tabId: string, startIndex: number, endIndex: number) => void;
  
  // System
  importData: (data: any) => void;
  importCollection: (collection: Collection, records: RecordItem[]) => void;
  clearAllData: () => void;
}

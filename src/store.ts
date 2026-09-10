import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppState, Task, Routine, Note, Label, Collection, RecordItem } from './types';

const generateId = () => Math.random().toString(36).substring(2, 9);

const defaultLabels: Label[] = [
  { id: 'l1', name: 'Work', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { id: 'l2', name: 'Personal', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { id: 'l3', name: 'Urgent', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' }
];

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      tasks: [],
      routines: [],
      notes: [],
      labels: defaultLabels,
      collections: [],
      records: [],

      // Tasks
      addTask: (taskData) => set((state) => ({
        tasks: [...state.tasks, { ...taskData, id: generateId(), createdAt: new Date().toISOString() }]
      })),
      updateTask: (id, updates) => set((state) => ({
        tasks: state.tasks.map((t) => (t && t.id === id ? { ...t, ...updates } : t))
      })),
      deleteTask: (id) => set((state) => ({
        tasks: state.tasks.filter((t) => t && t.id !== id)
      })),
      deleteTasks: (ids) => set((state) => ({
        tasks: state.tasks.filter((t) => t && !ids.includes(t.id))
      })),
      reorderTasks: (tasks) => set({ tasks }),

      // Routines
      addRoutine: (routineData) => set((state) => ({
        routines: [...state.routines, { ...routineData, id: generateId(), completedDates: [], skippedDates: [], order: state.routines.length, createdAt: new Date().toISOString() }]
      })),
      updateRoutine: (id, updates) => set((state) => ({
        routines: state.routines.map((r) => (r && r.id === id ? { ...r, ...updates } : r))
      })),
      deleteRoutine: (id) => set((state) => ({
        routines: state.routines.filter((r) => r && r.id !== id)
      })),
      toggleRoutineCompletion: (id, dateStr) => set((state) => ({
        routines: state.routines.map((r) => {
          if (r && r.id === id) {
            const isCompleted = r.completedDates.includes(dateStr);
            return {
              ...r,
              completedDates: isCompleted 
                ? r.completedDates.filter(d => d !== dateStr) 
                : [...r.completedDates, dateStr],
              skippedDates: (r.skippedDates || []).filter(d => d !== dateStr)
            };
          }
          return r;
        })
      })),
      toggleRoutineSkip: (id, dateStr) => set((state) => ({
        routines: state.routines.map((r) => {
          if (r && r.id === id) {
            const isSkipped = (r.skippedDates || []).includes(dateStr);
            return {
              ...r,
              skippedDates: isSkipped 
                ? (r.skippedDates || []).filter(d => d !== dateStr) 
                : [...(r.skippedDates || []), dateStr],
              completedDates: r.completedDates.filter(d => d !== dateStr)
            };
          }
          return r;
        })
      })),
      reorderRoutines: (reordered) => set((state) => {
        const map = new Map(reordered.map(r => [r?.id, r]));
        return {
          routines: state.routines.map(r => r && map.has(r.id) ? map.get(r.id)! : r)
        };
      }),

      // Notes
      addNote: (noteData) => {
        const newNote: Note = {
          ...noteData,
          id: generateId(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        set((state) => ({ notes: [newNote, ...state.notes] }));
        return newNote;
      },
      updateNote: (id, updates) => set((state) => ({
        notes: state.notes.map((n) => (n && n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n))
      })),
      deleteNote: (id) => set((state) => ({
        notes: state.notes.filter((n) => n && n.id !== id)
      })),

      // Labels
      addLabel: (labelData) => set((state) => ({
        labels: [...state.labels, { ...labelData, id: generateId() }]
      })),
      deleteLabel: (id) => set((state) => ({
        labels: state.labels.filter((l) => l && l.id !== id)
      })),

      // Collections
      addCollection: (collectionData) => set((state) => ({
        collections: [...state.collections, { 
          ...collectionData, 
          id: generateId(), 
          tabs: collectionData.tabs && collectionData.tabs.length > 0 ? collectionData.tabs.map(t => ({ id: generateId(), name: t.name })) : [{ id: generateId(), name: 'Main' }],
          createdAt: new Date().toISOString() 
        }]
      })),
      updateCollection: (id, updates) => set((state) => ({
        collections: state.collections.map((c) => (c && c.id === id ? { ...c, ...updates } : c))
      })),
      deleteCollection: (id) => set((state) => ({
        collections: state.collections.filter((c) => c && c.id !== id),
        records: state.records.filter((r) => r.collectionId !== id) // Cascade delete records
      })),
      addCollectionTab: (collectionId, name) => set((state) => ({
        collections: state.collections.map(c => 
          c && c && c.id === collectionId 
            ? { ...c, tabs: [...(c.tabs || []), { id: generateId(), name }] }
            : c
        )
      })),
      updateCollectionTab: (collectionId, tabId, name) => set((state) => ({
        collections: state.collections.map(c => 
          c && c && c.id === collectionId 
            ? { ...c, tabs: (c.tabs || []).map(t => t && t.id === tabId ? { ...t, name } : t) }
            : c
        )
      })),
      deleteCollectionTab: (collectionId, tabId) => set((state) => {
        // Also cascade delete records for this tab
        return {
          collections: state.collections.map(c => 
            c && c.id === collectionId 
              ? { ...c, tabs: (c.tabs || []).filter(t => t && t.id !== tabId) }
              : c
          ),
          records: state.records.filter(r => !(r.collectionId === collectionId && r.tabId === tabId))
        };
      }),

      // Records
      addRecord: (recordData) => set((state) => {
        const tabRecords = state.records.filter(r => r.collectionId === recordData.collectionId && r.tabId === recordData.tabId);
        const nextOrder = tabRecords.length > 0 ? Math.max(...tabRecords.map(r => r.order)) + 1 : 0;
        return {
          records: [...state.records, { 
            ...recordData, 
            id: generateId(), 
            order: nextOrder,
            createdAt: new Date().toISOString(), 
            updatedAt: new Date().toISOString() 
          }]
        };
      }),
      updateRecord: (id, updates) => set((state) => ({
        records: state.records.map((r) => (r && r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r))
      })),
      deleteRecord: (id) => set((state) => ({
        records: state.records.filter((r) => r && r.id !== id)
      })),
      copyRecordsToTab: (recordIds, targetTabId) => set((state) => {
        const recordsToCopy = state.records.filter(r => r && recordIds.includes(r.id));
        if (recordsToCopy.length === 0) return state;
        
        const collectionId = recordsToCopy[0].collectionId;
        const targetRecords = state.records.filter(r => r.collectionId === collectionId && r.tabId === targetTabId);
        let currentOrder = targetRecords.length > 0 ? Math.max(...targetRecords.map(r => r.order)) + 1 : 0;
        
        const newRecords = recordsToCopy.map(r => {
          const newOrder = currentOrder++;
          return {
            ...r,
            id: generateId(),
            tabId: targetTabId,
            order: newOrder,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
        });
        
        return {
          records: [...state.records, ...newRecords]
        };
      }),
      moveRecordsToTab: (recordIds, targetTabId) => set((state) => {
        const recordsToMove = state.records.filter(r => r && recordIds.includes(r.id));
        if (recordsToMove.length === 0) return state;
        
        const collectionId = recordsToMove[0].collectionId;
        const targetRecords = state.records.filter(r => r.collectionId === collectionId && r.tabId === targetTabId);
        let currentOrder = targetRecords.length > 0 ? Math.max(...targetRecords.map(r => r.order)) + 1 : 0;
        
        return {
          records: state.records.map(r => {
            if (r && recordIds.includes(r.id)) {
              return { ...r, tabId: targetTabId, order: currentOrder++, updatedAt: new Date().toISOString() };
            }
            return r;
          })
        };
      }),
      reorderRecords: (collectionId, tabId, startIndex, endIndex) => set((state) => {
        const tabRecords = state.records
          .filter(r => r.collectionId === collectionId && r.tabId === tabId)
          .sort((a, b) => (a.order || 0) - (b.order || 0));
        
        const result = Array.from(tabRecords);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        
        const updatedRecords = result.map((r, index) => ({ ...r, order: index }));
        const updatedRecordIds = updatedRecords.map(r => r?.id);
        
        return {
          records: state.records.map(r => {
            if (!r) return r;
            const index = updatedRecordIds.indexOf(r.id);
            if (index !== -1) {
              return updatedRecords[index];
            }
            return r;
          })
        };
      }),
      
      // System
      importData: (data) => set((state) => ({ ...state, ...data })),
      importCollection: (collection, newRecords) => set((state) => ({
        collections: [...state.collections, collection],
        records: [...state.records, ...newRecords]
      })),
      clearAllData: () => set({ tasks: [], routines: [], notes: [], collections: [], records: [] })
    }),
    {
      name: 'planner-storage',
    }
  )
);

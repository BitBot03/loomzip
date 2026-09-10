import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Sidebar';
import TasksView from './components/TasksView';
import RoutinesView from './components/RoutinesView';
import NotesView from './components/NotesView';
import CollectionView from './components/CollectionView';
import { useAppStore } from './store';

export default function App() {
  const [currentView, setCurrentView] = useState<string>('tasks');
  const collections = useAppStore(state => state.collections);

  const renderContent = () => {
    switch (currentView) {
      case 'tasks':
        return <TasksView />;
      case 'routines':
        return <RoutinesView />;
      case 'notes':
        return <NotesView />;
      default:
        const collection = collections.find(c => c && c.id === currentView);
        if (collection) {
          return <CollectionView collectionId={collection.id} />;
        }
        // Fallback if collection was deleted
        setCurrentView('tasks');
        return <TasksView />;
    }
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
      <Toaster position="bottom-center" toastOptions={{ style: { background: '#18181b', color: '#fff', border: '1px solid #27272a', borderRadius: '12px' } }} />
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
      <main className="flex-1 overflow-hidden relative flex flex-col">
        <div key={currentView} className="motion-page flex-1 min-h-0">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

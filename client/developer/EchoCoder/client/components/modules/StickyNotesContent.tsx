import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';

interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  createdAt: Date;
}

const colors = ['yellow', 'pink', 'blue', 'green', 'purple'];

export default function StickyNotesContent() {
  const [notes, setNotes] = useState<Note[]>([
    { id: '1', title: 'Meeting Notes', content: 'Discuss Q2 menu changes', color: 'yellow', createdAt: new Date() },
    { id: '2', title: 'TODO', content: 'Order new uniforms', color: 'pink', createdAt: new Date() },
  ]);
  const [newNote, setNewNote] = useState('');

  const addNote = () => {
    if (!newNote.trim()) return;
    setNotes([...notes, {
      id: Date.now().toString(),
      title: 'Quick Note',
      content: newNote,
      color: colors[Math.floor(Math.random() * colors.length)],
      createdAt: new Date(),
    }]);
    setNewNote('');
  };

  const colorBg = {
    yellow: 'bg-yellow-100',
    pink: 'bg-pink-100',
    blue: 'bg-blue-100',
    green: 'bg-green-100',
    purple: 'bg-purple-100',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sticky Notes</h1>
          <p className="text-sm text-muted-foreground mt-1">Quick notes & reminders</p>
        </div>
      </div>

      <div className="space-y-3">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Write a quick note..."
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-sm resize-none"
          rows={3}
        />
        <Button onClick={addNote} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Note
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {notes.map((note) => (
          <div
            key={note.id}
            className={`${colorBg[note.color as keyof typeof colorBg]} p-4 rounded-lg shadow-md border border-yellow-300 relative min-h-40`}
          >
            <p className="font-bold text-sm mb-2">{note.title}</p>
            <p className="text-sm text-gray-700">{note.content}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setNotes(notes.filter(n => n.id !== note.id))}
              className="absolute top-2 right-2"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <p className="text-xs text-gray-600 mt-4">{note.createdAt.toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

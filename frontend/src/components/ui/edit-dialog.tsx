'use client';

import { useState } from 'react';
import { Application, CANONICAL_STATUSES } from '@/lib/types';
import { X } from 'lucide-react';

export function EditDialog({ 
  app, 
  isOpen, 
  onClose, 
  onSave 
}: { 
  app: Application; 
  isOpen: boolean; 
  onClose: () => void;
  onSave: (id: number, status: string, notes: string) => Promise<void>;
}) {
  const [status, setStatus] = useState(app.status);
  const [notes, setNotes] = useState(app.notes);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    await onSave(app.number, status, notes);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
          <h2 className="text-xl font-bold">Edit Application</h2>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-400">Status</label>
            <select 
              value={status} 
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50"
            >
              {CANONICAL_STATUSES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-400">Notes</label>
            <textarea 
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 resize-none tabular-nums"
              placeholder="Add your notes here..."
            />
          </div>
        </div>
        
        <div className="p-6 bg-black/50 border-t border-zinc-800 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">Cancel</button>
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 rounded-xl font-bold text-white hover:bg-blue-500 transition-all active:scale-95 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

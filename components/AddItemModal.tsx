import React, { useState } from 'react';
import { Category, Condition, Item } from '../types';
import { X } from 'lucide-react';

interface AddItemModalProps {
  onClose: () => void;
  onAdd: (item: Item) => void;
}

export const AddItemModal: React.FC<AddItemModalProps> = ({ onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>(Category.TOY);
  const [condition, setCondition] = useState<Condition>(Condition.NEW);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [tagInput, setTagInput] = useState('');

  const handleAddTag = () => {
    if (tagInput.trim()) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newItem: Item = {
      id: Date.now().toString(),
      name,
      category,
      condition,
      description: description || "Ein tolles Ding für Fiffy!",
      imageUrl: imageUrl || undefined,
      tags: tags.length > 0 ? tags : ['Neu'],
    };
    onAdd(newItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 relative shadow-2xl animate-in fade-in zoom-in duration-200">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X size={24} />
        </button>
        
        <h2 className="text-2xl font-bold text-amber-900 mb-6">Neues für Fiffy</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name des Objekts</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Roter Quietsch-Ball"
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
                <select 
                    value={category} 
                    onChange={(e) => setCategory(e.target.value as Category)}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                >
                    {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Zustand</label>
                <select 
                    value={condition} 
                    onChange={(e) => setCondition(e.target.value as Condition)}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                >
                    {Object.values(Condition).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Beschreibe den Gegenstand..."
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none h-24 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="Tag hinzufügen..."
                className="flex-1 p-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="bg-amber-100 text-amber-700 px-4 py-2 rounded-xl text-sm hover:bg-amber-200"
              >
                +
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {tags.map((tag, i) => (
                <span key={i} className="bg-amber-50 text-amber-600 text-xs px-2 py-1 rounded-md flex items-center gap-1">
                  {tag}
                  <button type="button" onClick={() => setTags(tags.filter((_, idx) => idx !== i))} className="hover:text-amber-800">×</button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bild URL (Optional)</label>
            <input 
              type="text" 
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm"
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-amber-600 text-white py-3 rounded-xl font-bold hover:bg-amber-700 transition-colors mt-4"
          >
            In die Kiste legen
          </button>
        </form>
      </div>
    </div>
  );
};
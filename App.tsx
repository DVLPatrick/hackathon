import React, { useState } from 'react';
import { Item, Category, Condition } from './types';
import { ItemCard } from './components/ItemCard';
import { AddItemModal } from './components/AddItemModal';
import { 
  Dog, 
  Shirt, 
  Gamepad2, 
  Plus, 
  Search,
  Bone
} from 'lucide-react';

// Mock Data
const INITIAL_ITEMS: Item[] = [
  {
    id: '1',
    name: 'Ringel-Pulli',
    category: Category.CLOTHING,
    condition: Condition.USED,
    description: "Mein Lieblingspulli für kalte Tage. Kratzt ein bisschen, aber ich sehe schick aus!",
    tags: ['Winter', 'Rot', 'Warm'],
    imageUrl: 'https://picsum.photos/seed/dog-sweater/400/300'
  },
  {
    id: '2',
    name: 'Quietsch-Huhn',
    category: Category.TOY,
    condition: Condition.BROKEN,
    description: "Es quietscht nicht mehr, aber das Kauen macht immer noch Spaß.",
    tags: ['Gummi', 'Laut', 'Kauen'],
    imageUrl: 'https://picsum.photos/seed/dog-toy/400/300'
  },
  {
    id: '3',
    name: 'Regenmantel Gelb',
    category: Category.CLOTHING,
    condition: Condition.NEW,
    description: "Damit werde ich bei Regen nicht nass. Ich hasse Regen.",
    tags: ['Regen', 'Gelb', 'Schutz'],
    imageUrl: 'https://picsum.photos/seed/raincoat/400/300'
  }
];

export default function App() {
  const [items, setItems] = useState<Item[]>(INITIAL_ITEMS);
  const [filter, setFilter] = useState<Category | 'ALL'>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const filteredItems = filter === 'ALL' 
    ? items 
    : items.filter(item => item.category === filter);

  const handleAddItem = (newItem: Item) => {
    setItems(prev => [newItem, ...prev]);
  };

  const handleDeleteItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#fdf6e3] text-gray-800 pb-20 md:pb-0">
      
      {/* Header */}
      <header className="bg-amber-500 text-white p-6 shadow-lg sticky top-0 z-30 rounded-b-[2rem]">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded-full shadow-inner">
              <Dog size={32} className="text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold leading-none">Fiffys Welt</h1>
              <p className="text-amber-100 text-sm font-medium">Alles für den besten Hund</p>
            </div>
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-white text-amber-600 p-3 rounded-xl shadow-md hover:bg-amber-50 transition-all transform hover:scale-105"
            aria-label="Item hinzufügen"
          >
            <Plus size={24} strokeWidth={3} />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-6 space-y-8">

        {/* Filter Navigation */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          <button 
            onClick={() => setFilter('ALL')}
            className={`px-5 py-2 rounded-full font-medium transition-colors whitespace-nowrap flex items-center gap-2
              ${filter === 'ALL' ? 'bg-amber-800 text-white' : 'bg-white text-gray-600 hover:bg-amber-50'}`}
          >
            <Bone size={16} /> Alles
          </button>
          <button 
            onClick={() => setFilter(Category.CLOTHING)}
            className={`px-5 py-2 rounded-full font-medium transition-colors whitespace-nowrap flex items-center gap-2
              ${filter === Category.CLOTHING ? 'bg-amber-800 text-white' : 'bg-white text-gray-600 hover:bg-amber-50'}`}
          >
            <Shirt size={16} /> Kleidung
          </button>
          <button 
            onClick={() => setFilter(Category.TOY)}
            className={`px-5 py-2 rounded-full font-medium transition-colors whitespace-nowrap flex items-center gap-2
              ${filter === Category.TOY ? 'bg-amber-800 text-white' : 'bg-white text-gray-600 hover:bg-amber-50'}`}
          >
            <Gamepad2 size={16} /> Spielzeug
          </button>
        </div>

        {/* Grid List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.length > 0 ? (
            filteredItems.map(item => (
              <ItemCard key={item.id} item={item} onDelete={handleDeleteItem} />
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-gray-400">
              <div className="bg-white w-24 h-24 rounded-full mx-auto flex items-center justify-center mb-4 shadow-sm">
                <Search size={32} />
              </div>
              <p>Nichts gefunden. Fiffy hat das wohl verbuddelt.</p>
            </div>
          )}
        </div>
      </main>

      {/* Add Modal */}
      {isAddModalOpen && (
        <AddItemModal 
          onClose={() => setIsAddModalOpen(false)} 
          onAdd={handleAddItem} 
        />
      )}
    </div>
  );
}
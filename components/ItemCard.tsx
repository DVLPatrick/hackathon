import React from 'react';
import { Item, Category, Condition } from '../types';
import { Tag, Trash2, Edit3 } from 'lucide-react';

interface ItemCardProps {
  item: Item;
  onDelete: (id: string) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, onDelete }) => {
  const categoryColor = 
    item.category === Category.CLOTHING ? 'bg-blue-100 text-blue-800' :
    item.category === Category.TOY ? 'bg-orange-100 text-orange-800' :
    'bg-green-100 text-green-800';

  const conditionColor = 
    item.condition === Condition.WASH_NEEDED ? 'bg-red-100 text-red-800 border-red-200' :
    item.condition === Condition.BROKEN ? 'bg-gray-200 text-gray-600' :
    'bg-white text-gray-600';

  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden border border-amber-100">
      <div className="h-40 w-full bg-amber-50 relative overflow-hidden group">
        <img 
          src={item.imageUrl || `https://picsum.photos/seed/${item.id}/400/300`} 
          alt={item.name} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute top-2 right-2 flex gap-2">
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${categoryColor}`}>
                {item.category}
            </span>
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
            <h3 className="font-bold text-lg text-gray-800">{item.name}</h3>
        </div>
        
        <p className="text-sm text-gray-600 italic mb-3">"{item.description}"</p>
        
        <div className={`inline-block px-2 py-0.5 rounded text-xs border mb-3 ${conditionColor}`}>
            {item.condition}
        </div>

        <div className="flex flex-wrap gap-1 mb-4">
            {item.tags.map((tag, idx) => (
                <span key={idx} className="flex items-center text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                    <Tag size={10} className="mr-1"/> {tag}
                </span>
            ))}
        </div>

        <div className="flex justify-end pt-2 border-t border-gray-100">
            <button 
                onClick={() => onDelete(item.id)}
                className="text-gray-400 hover:text-red-500 transition-colors p-1"
                aria-label="Löschen"
            >
                <Trash2 size={18} />
            </button>
        </div>
      </div>
    </div>
  );
};
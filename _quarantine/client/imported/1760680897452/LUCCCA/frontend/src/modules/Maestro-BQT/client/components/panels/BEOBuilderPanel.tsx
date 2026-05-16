import React, { useState } from 'react';
import { useEventStore, MenuItem } from '../../stores/eventStore';
import { PanelShell } from '../../builder/maestro-banquets.builder-seed';

const CategoryTabs = ['appetizers', 'mains', 'desserts', 'beverages'] as const;
type MenuCategory = typeof CategoryTabs[number];
const singularCategory: Record<MenuCategory, import('../../stores/eventStore').MenuItem['category']> = {
  appetizers: 'appetizer',
  mains: 'main',
  desserts: 'dessert',
  beverages: 'beverage',
};

const MenuItemCard: React.FC<{
  item: MenuItem;
  category: MenuCategory;
  onEdit: () => void;
  onRemove: () => void;
}> = ({ item, category, onEdit, onRemove }) => {
  const allergenColors: Record<string, string> = {
    'Shellfish': 'bg-red-100 text-red-800',
    'Fish': 'bg-orange-100 text-orange-800',
    'Dairy': 'bg-blue-100 text-blue-800',
    'Gluten': 'bg-yellow-100 text-yellow-800',
    'Eggs': 'bg-purple-100 text-purple-800',
    'Nuts': 'bg-pink-100 text-pink-800',
    'Soy': 'bg-green-100 text-green-800',
    'Sulfites': 'bg-gray-100 text-gray-800'
  };

  return (
    <div className="glass-panel p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-semibold text-primary">{item.name}</h4>
          <p className="text-sm text-muted">{item.ingredients.join(', ')}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="p-1 hover:bg-accent hover:text-white rounded transition-colors"
            title="Edit item"
          >
            ✏️
          </button>
          <button
            onClick={onRemove}
            className="p-1 hover:bg-err hover:text-white rounded transition-colors"
            title="Remove item"
          >
            🗑️
          </button>
        </div>
      </div>
      
      <div className="flex justify-between items-center">
        <span className="font-bold text-accent">${item.cost.toFixed(2)}</span>
        <div className="text-xs text-muted">
          {item.nutritionalInfo.calories} cal | {item.nutritionalInfo.protein}g protein
        </div>
      </div>
      
      {item.allergens.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.allergens.map((allergen) => (
            <span
              key={allergen}
              className={`px-2 py-1 text-xs rounded-full ${allergenColors[allergen] || 'bg-gray-100 text-gray-800'}`}
            >
              {allergen}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

const MenuItemForm: React.FC<{
  item?: MenuItem;
  category: MenuCategory;
  onSave: (item: MenuItem) => void;
  onCancel: () => void;
}> = ({ item, category, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<MenuItem>>(
    item || {
      name: '',
      category: singularCategory[category],
      cost: 0,
      ingredients: [],
      allergens: [],
      nutritionalInfo: { calories: 0, protein: 0, carbs: 0, fat: 0 }
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.cost) return;

    const newItem: MenuItem = {
      id: item?.id || `${category}-${Date.now()}`,
      name: formData.name!,
      category: singularCategory[category],
      cost: formData.cost!,
      ingredients: formData.ingredients || [],
      allergens: formData.allergens || [],
      nutritionalInfo: formData.nutritionalInfo || { calories: 0, protein: 0, carbs: 0, fat: 0 }
    };

    onSave(newItem);
  };

  const commonAllergens = ['Dairy', 'Eggs', 'Fish', 'Shellfish', 'Nuts', 'Soy', 'Gluten', 'Sulfites'];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass-panel-elevated p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold text-primary mb-6">
          {item ? 'Edit' : 'Add'} {category.slice(0, -1)}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Item Name *
            </label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full p-3 border border-default rounded-lg bg-panel text-primary focus:ring-2 focus:ring-accent focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Cost per serving *
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.cost || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, cost: parseFloat(e.target.value) }))}
              className="w-full p-3 border border-default rounded-lg bg-panel text-primary focus:ring-2 focus:ring-accent focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Ingredients (comma separated)
            </label>
            <textarea
              value={formData.ingredients?.join(', ') || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                ingredients: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
              }))}
              className="w-full p-3 border border-default rounded-lg bg-panel text-primary focus:ring-2 focus:ring-accent focus:border-transparent"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Allergens
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {commonAllergens.map((allergen) => (
                <label key={allergen} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.allergens?.includes(allergen) || false}
                    onChange={(e) => {
                      const allergens = formData.allergens || [];
                      if (e.target.checked) {
                        setFormData(prev => ({ ...prev, allergens: [...allergens, allergen] }));
                      } else {
                        setFormData(prev => ({ 
                          ...prev, 
                          allergens: allergens.filter(a => a !== allergen) 
                        }));
                      }
                    }}
                    className="rounded border-default text-accent focus:ring-accent"
                  />
                  <span className="text-sm text-primary">{allergen}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Calories
              </label>
              <input
                type="number"
                value={formData.nutritionalInfo?.calories || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  nutritionalInfo: { 
                    ...prev.nutritionalInfo!, 
                    calories: parseInt(e.target.value) || 0 
                  }
                }))}
                className="w-full p-2 border border-default rounded-lg bg-panel text-primary focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Protein (g)
              </label>
              <input
                type="number"
                value={formData.nutritionalInfo?.protein || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  nutritionalInfo: { 
                    ...prev.nutritionalInfo!, 
                    protein: parseInt(e.target.value) || 0 
                  }
                }))}
                className="w-full p-2 border border-default rounded-lg bg-panel text-primary focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Carbs (g)
              </label>
              <input
                type="number"
                value={formData.nutritionalInfo?.carbs || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  nutritionalInfo: { 
                    ...prev.nutritionalInfo!, 
                    carbs: parseInt(e.target.value) || 0 
                  }
                }))}
                className="w-full p-2 border border-default rounded-lg bg-panel text-primary focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Fat (g)
              </label>
              <input
                type="number"
                value={formData.nutritionalInfo?.fat || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  nutritionalInfo: { 
                    ...prev.nutritionalInfo!, 
                    fat: parseInt(e.target.value) || 0 
                  }
                }))}
                className="w-full p-2 border border-default rounded-lg bg-panel text-primary focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-accent text-white py-3 px-6 rounded-lg font-medium hover:bg-accent/90 transition-colors"
            >
              {item ? 'Update' : 'Add'} Item
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-panel border border-default text-primary py-3 px-6 rounded-lg font-medium hover:bg-muted/10 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const BEOBuilderPanel: React.FC<{
  eventId?: string;
}> = ({ eventId }) => {
  const { currentEvent, addMenuItem, removeMenuItem, updateMenuItem } = useEventStore();
  const [activeTab, setActiveTab] = useState<MenuCategory>('appetizers');
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [showForm, setShowForm] = useState(false);

  if (!currentEvent) {
    return (
      <PanelShell title="BEO Builder">
        <div className="text-center text-muted">No event selected</div>
      </PanelShell>
    );
  }

  const currentItems = currentEvent.menu[activeTab];
  const totalCost = Object.values(currentEvent.menu)
    .flat()
    .reduce((sum, item) => sum + item.cost, 0);

  const handleSaveItem = (item: MenuItem) => {
    if (editingItem) {
      updateMenuItem(activeTab, item.id, item);
    } else {
      addMenuItem(activeTab, item);
    }
    setEditingItem(null);
    setShowForm(false);
  };

  const toolbarRight = (
    <div className="flex gap-2">
      <button
        onClick={() => setShowForm(true)}
        className="px-3 py-1.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
      >
        + Add Item
      </button>
      <button className="px-3 py-1.5 bg-panel border border-default rounded-lg text-sm font-medium hover:bg-muted/10 transition-colors">
        💾 Generate BEO
      </button>
    </div>
  );

  return (
    <>
      <PanelShell title="BEO Builder" toolbarRight={toolbarRight}>
        <div className="space-y-6">
          {/* Cost Summary */}
          <div className="glass-panel p-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-accent">Menu Cost Analysis</h3>
              <div className="text-right">
                <div className="text-2xl font-bold text-accent">${totalCost.toFixed(2)}</div>
                <div className="text-sm text-muted">per guest</div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
              {CategoryTabs.map((category) => {
                const items = currentEvent.menu[category];
                const cost = items.reduce((sum, item) => sum + item.cost, 0);
                return (
                  <div key={category} className="text-center">
                    <div className="font-semibold text-primary capitalize">{category}</div>
                    <div className="text-accent">${cost.toFixed(2)}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex space-x-1 bg-panel rounded-lg p-1">
            {CategoryTabs.map((category) => (
              <button
                key={category}
                onClick={() => setActiveTab(category)}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors capitalize ${
                  activeTab === category
                    ? 'bg-accent text-white'
                    : 'text-muted hover:text-primary hover:bg-muted/10'
                }`}
              >
                {category}
                <span className="ml-2 text-xs">
                  ({currentEvent.menu[category].length})
                </span>
              </button>
            ))}
          </div>

          {/* Menu Items */}
          <div className="space-y-4">
            {currentItems.length === 0 ? (
              <div className="text-center py-8 text-muted">
                No {activeTab} added yet. Click "Add Item" to get started.
              </div>
            ) : (
              currentItems.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  category={activeTab}
                  onEdit={() => {
                    setEditingItem(item);
                    setShowForm(true);
                  }}
                  onRemove={() => removeMenuItem(activeTab, item.id)}
                />
              ))
            )}
          </div>
        </div>
      </PanelShell>

      {/* Form Modal */}
      {showForm && (
        <MenuItemForm
          item={editingItem || undefined}
          category={activeTab}
          onSave={handleSaveItem}
          onCancel={() => {
            setShowForm(false);
            setEditingItem(null);
          }}
        />
      )}
    </>
  );
};

export default BEOBuilderPanel;

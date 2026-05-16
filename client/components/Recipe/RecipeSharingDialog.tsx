import React, { useState } from 'react';
import { useRecipe } from '../../contexts/RecipeContext';
import './RecipeSharing.css';

interface Props {
  recipeId: string;
  open: boolean;
  onClose: () => void;
}

/**
 * Recipe Sharing Dialog
 * Allows outlet managers to share recipes with other outlets or make them global
 */
export function RecipeSharingDialog({ recipeId, open, onClose }: Props) {
  const {
    recipes,
    outlets,
    currentOutletId,
    makeRecipeGlobal,
    shareRecipeWithOutlet,
    unshareRecipeFromOutlet,
    canEditRecipe
  } = useRecipe();
  
  const recipe = recipes.find(r => r.id === recipeId);
  const [selectedOutlets, setSelectedOutlets] = useState<Set<string>>(
    new Set(recipe?.sharedWithOutlets || [])
  );
  
  if (!open || !recipe || !currentOutletId) return null;
  
  const canEdit = canEditRecipe(recipeId, currentOutletId);
  
  if (!canEdit) {
    return (
      <div className="dialog-overlay">
        <div className="dialog">
          <h2>No Permission</h2>
          <p>You can only share recipes owned by your outlet.</p>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }
  
  const handleToggleOutlet = (outletId: string) => {
    const newSelected = new Set(selectedOutlets);
    if (newSelected.has(outletId)) {
      newSelected.delete(outletId);
    } else {
      newSelected.add(outletId);
    }
    setSelectedOutlets(newSelected);
  };
  
  const handleSave = async () => {
    // Remove outlets no longer selected
    for (const outletId of recipe.sharedWithOutlets) {
      if (!selectedOutlets.has(outletId)) {
        await unshareRecipeFromOutlet(recipeId, outletId);
      }
    }
    
    // Add newly selected outlets
    for (const outletId of selectedOutlets) {
      if (!recipe.sharedWithOutlets.includes(outletId)) {
        await shareRecipeWithOutlet(recipeId, outletId);
      }
    }
    
    onClose();
  };
  
  const handleMakeGlobal = async () => {
    if (confirm('Make this recipe available to ALL outlets?')) {
      await makeRecipeGlobal(recipeId);
      onClose();
    }
  };
  
  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>Share Recipe: {recipe.name}</h2>
          <button onClick={onClose}>×</button>
        </div>
        
        <div className="dialog-content">
          {/* Global sharing */}
          <div className="sharing-section">
            <h3>Global Access</h3>
            <label className="sharing-option">
              <input
                type="checkbox"
                checked={recipe.isGlobal}
                onChange={handleMakeGlobal}
              />
              <span>
                <strong>Make available to all outlets</strong>
                <small>All current and future outlets will have access</small>
              </span>
            </label>
          </div>
          
          {/* Specific outlet sharing */}
          {!recipe.isGlobal && (
            <div className="sharing-section">
              <h3>Share with Specific Outlets</h3>
              <div className="outlet-list">
                {outlets
                  .filter(o => o.id !== currentOutletId) // Don't show own outlet
                  .map(outlet => (
                    <label key={outlet.id} className="outlet-item">
                      <input
                        type="checkbox"
                        checked={selectedOutlets.has(outlet.id)}
                        onChange={() => handleToggleOutlet(outlet.id)}
                      />
                      <span>
                        {outlet.name}
                        {outlet.type === 'commissary' && (
                          <span className="badge">Commissary</span>
                        )}
                      </span>
                    </label>
                  ))}
              </div>
            </div>
          )}
          
          {/* Commissary settings */}
          {recipe.outletId === currentOutletId && (
            <div className="sharing-section">
              <h3>Commissary Settings</h3>
              <label>
                Transfer Cost Markup (%)
                <input
                  type="number"
                  value={recipe.transferCostMarkup}
                  onChange={(e) => {
                    // Update transfer markup
                  }}
                  min="0"
                  max="100"
                  step="5"
                />
              </label>
              <small>
                When this recipe is transferred to another outlet via commissary
              </small>
            </div>
          )}
        </div>
        
        <div className="dialog-footer">
          <button onClick={onClose}>Cancel</button>
          <button onClick={handleSave} className="primary">
            Save Sharing Settings
          </button>
        </div>
      </div>
    </div>
  );
}


import React, { useState } from 'react';
import { FormFieldGroup } from '../components/FormFieldGroup';
import { FormButton } from '../components/FormButton';

export default function PastryRecipeForm() {
  const [recipeName, setRecipeName] = useState('');
  const [category, setCategory] = useState('Base Recipe');
  const [instructions, setInstructions] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(`Recipe Saved: ${recipeName}`);
  };

  return (
    <div className="pastry-recipe-form-page">
      <h1 className="text-2xl font-bold mb-4">Add Pastry Recipe</h1>
      <form onSubmit={handleSubmit} className="w-full max-w-lg">
        <FormFieldGroup label="Recipe Name">
          // Inside form fields:
<input
  type="text"
  value={recipeName}
  onChange={(e) => setRecipeName(e.target.value)}
  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-pink-400"
/>

        </FormFieldGroup>

        <FormFieldGroup label="Category">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option>Base Recipe</option>
            <option>Flavor Variation</option>
            <option>Decoration</option>
          </select>
        </FormFieldGroup>

        <FormFieldGroup label="Instructions">
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            className="w-full p-2 border rounded"
            rows="6"
          ></textarea>
        </FormFieldGroup>

        <FormButton label="Save Recipe" onClick={handleSubmit} />
      </form>
    </div>
  );
}

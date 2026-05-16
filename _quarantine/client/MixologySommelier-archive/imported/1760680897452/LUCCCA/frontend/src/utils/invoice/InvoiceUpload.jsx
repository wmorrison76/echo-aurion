import React, { useState } from 'react';
import { echoPromptLogic } from '@/utils/invoice/echoLogicRouter';
import { checkStoreroomForDuplicates } from '@/utils/invoice/checkInventory';
import { parseInvoice } from '@/utils/invoice/InvoiceParser';
import IngredientMasterList from '@/components/Ingredients/IngredientMasterList';

const InvoiceUpload = () => {
  const [parsedItems, setParsedItems] = useState([]);
  const [error, setError] = useState('');

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const rawJson = JSON.parse(event.target.result);
        const parsed = parseInvoice(rawJson);
        
        // Mock storeroom fetch (later replace with API call or db query)
        const storeroomInventory = await import('@/data/invoiceMocks/storeroomInventory.json');

        const checked = checkStoreroomForDuplicates(parsed, storeroomInventory.default);
        const echoed = echoPromptLogic(checked);
        setParsedItems(echoed);
        setError('');
      } catch (err) {
        console.error(err);
        setError('Failed to parse invoice. Please upload a valid .json file.');
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="p-6 border rounded-lg shadow bg-white">
      <h2 className="text-xl font-bold mb-4">Upload Invoice</h2>
      <input
        type="file"
        accept=".json"
        onChange={handleFileUpload}
        className="mb-4"
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}

      {parsedItems.length > 0 && (
        <>
          <h3 className="text-lg font-semibold mt-4 mb-2">Parsed Ingredients</h3>
          <IngredientMasterList ingredients={parsedItems} />
        </>
      )}
    </div>
  );
};

export default InvoiceUpload;

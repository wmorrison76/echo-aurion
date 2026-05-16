import React, { useState, useEffect } from 'react';
import RightSidebar from '../components/PRightSidebar';
import { Save, Image, Settings, PlusCircle, MinusCircle, Menu, Plus, Minus, Bold, Italic, Underline, Type, Sun, Moon, Weight, NotebookPen, ArrowRightLeft, DollarSign } from 'lucide-react';
import '../RecipeApp.css';

const RecipeInputPage = () => {
  const [recipeName, setRecipeName] = useState('');
  const [ingredients, setIngredients] = useState([
    { qty: '', unit: '', item: '', prep: '', yield: '', cost: '' },
    { qty: '', unit: '', item: '', prep: '', yield: '', cost: '' },
    { qty: '', unit: '', item: '', prep: '', yield: '', cost: '' },
    { qty: '', unit: '', item: '', prep: '', yield: '', cost: '' },
    { qty: '', unit: '', item: '', prep: '', yield: '', cost: '' },
    { qty: '', unit: '', item: '', prep: '', yield: '', cost: '' },
    { qty: '', unit: '', item: '', prep: '', yield: '', cost: '' },
  ]);
  const [directions, setDirections] = useState('1. ');
  const [autoSaveMessage, setAutoSaveMessage] = useState('');
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(false);
  const [showAutoSaveNotification, setShowAutoSaveNotification] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedFont, setSelectedFont] = useState('Arial');
  const [selectedFontSize, setSelectedFontSize] = useState('14px');
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [selectedNationality, setSelectedNationality] = useState<string[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [selectedRecipeType, setSelectedRecipeType] = useState<string[]>([]);
  const [selectedPrepMethod, setSelectedPrepMethod] = useState<string[]>([]);
  const [selectedCookingEquipment, setSelectedCookingEquipment] = useState<string[]>([]);
  const [selectedRecipeAccess, setSelectedRecipeAccess] = useState<string[]>([]);
  const [isRecipeAccessCollapsed, setIsRecipeAccessCollapsed] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [showImagePopup, setShowImagePopup] = useState(false);
  const [imageSize, setImageSize] = useState(100);
  const [imageBrightness, setImageBrightness] = useState(100);
  const [imageContrast, setImageContrast] = useState(100);
  const [currentCurrency, setCurrentCurrency] = useState('USD');
  const [currentUnits, setCurrentUnits] = useState('Imperial');
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showUnitsModal, setShowUnitsModal] = useState(false);

  const units = [
    'TSP', 'TBSP', 'CUP', 'PT', 'QT', 'GAL', 'OZ', 'FL OZ', 'LB',
    'G', 'KG', 'ML', 'L', 'DOZ', 'EA', 'SM', 'LG'
  ];

  const findUnitMatch = (input: string) => {
    const upperInput = input.toUpperCase();
    return units.find(unit => unit.startsWith(upperInput));
  };

  // Auto-close right sidebar after 450ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsRightSidebarCollapsed(true);
    }, 450);

    return () => clearTimeout(timer);
  }, []);

  // Listen for image editor events from sidebar
  useEffect(() => {
    const handleOpenImageEditor = () => {
      if (image) {
        setShowImagePopup(true);
      }
    };

    window.addEventListener('openImageEditor', handleOpenImageEditor);
    return () => window.removeEventListener('openImageEditor', handleOpenImageEditor);
  }, [image]);

  const handleIngredientChange = (index: number, field: string, value: string) => {
    const updated = [...ingredients];
    updated[index][field as keyof typeof updated[0]] = value;
    setIngredients(updated);

    // Only add new line if this is the last row AND the row is complete (has qty, unit, and item)
    if (index === ingredients.length - 1) {
      const currentRow = updated[index];
      const isRowComplete = currentRow.qty && currentRow.unit && currentRow.item;

      if (isRowComplete && value !== '') {
        setIngredients([...updated, { qty: '', unit: '', item: '', prep: '', yield: '', cost: '' }]);
      }
    }
  };

  const addIngredientRow = () => {
    setIngredients([...ingredients, { qty: '', unit: '', item: '', prep: '', yield: '', cost: '' }]);
  };

  const removeIngredientRow = () => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.slice(0, -1));
    }
  };

  const applyTextFormat = (format: string) => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = directions.substring(start, end);

      if (selectedText.length === 0) {
        alert('Please select text first to apply formatting');
        return;
      }

      let formattedText = '';
      switch (format) {
        case 'bold':
          formattedText = `**${selectedText}**`;
          break;
        case 'italic':
          formattedText = `*${selectedText}*`;
          break;
        case 'underline':
          formattedText = `__${selectedText}__`;
          break;
        default:
          formattedText = selectedText;
      }

      const newText = directions.substring(0, start) + formattedText + directions.substring(end);
      setDirections(newText);

      // Restore focus and cursor position
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = start + formattedText.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  };

  const handleDirectionChange = (value: string) => {
    setDirections(value);
  };

  const handleDirectionKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const textarea = e.target as HTMLTextAreaElement;
      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = directions.substring(0, cursorPos);
      const textAfterCursor = directions.substring(cursorPos);

      // Count existing numbered lines
      const lines = textBeforeCursor.split('\n');
      const numberedLines = lines.filter(line => /^\d+\.\s/.test(line.trim()));
      const nextNumber = numberedLines.length + 1;

      const newText = textBeforeCursor + '\n' + nextNumber + '. ' + textAfterCursor;
      setDirections(newText);

      // Set cursor position after the new number
      setTimeout(() => {
        const newCursorPos = cursorPos + ('\n' + nextNumber + '. ').length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  };

  return (
    <div className={`relative w-full h-full transition-all duration-300 ${isDarkMode ? 'bg-black text-cyan-400' : 'bg-white text-black'}`}>
      <div className={`w-full pl-5 pr-6 py-6 overflow-y-auto ${isDarkMode ? 'bg-gradient-to-br from-gray-900 via-black to-blue-900' : ''}`}>
        {/* Logo and Icons Layout */}
        <div className="flex justify-between items-start">
          {/* Logo in top left corner */}
          <div className="p-0.5">
            <div className="h-12 w-auto flex items-center">
              <span className="text-xl font-bold text-indigo-600">Echo Recipe Pro</span>
            </div>
          </div>

          {/* Icons and Hamburger Menu in top right */}
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2 items-center">
              <Weight title="Baker's Yield" className="text-xl cursor-pointer" />
              <NotebookPen title="R&D Mode" className="text-xl cursor-pointer" />
              <ArrowRightLeft
                title="Convert Units"
                className="text-xl cursor-pointer hover:text-blue-600"
                onClick={() => setShowUnitsModal(true)}
              />
              <DollarSign
                title="Currency"
                className="text-xl cursor-pointer hover:text-blue-600"
                onClick={() => setShowCurrencyModal(true)}
              />
              <Settings title="Settings" className="text-xl cursor-pointer" />

              {/* Dark/Light Mode Slider */}
              <div className="flex items-center gap-1 ml-2">
                <Sun className="text-sm" />
                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className={`w-8 h-4 rounded-full transition-colors ${isDarkMode ? 'bg-blue-600' : 'bg-gray-300'}`}
                >
                  <div className={`w-3 h-3 bg-white rounded-full transition-transform ${isDarkMode ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
                <Moon className="text-sm" />
              </div>
            </div>

            {/* Right Sidebar Toggle - Hamburger Menu */}
            <button
              onClick={() => setIsRightSidebarCollapsed(!isRightSidebarCollapsed)}
              className="flex flex-col gap-1 p-2 hover:bg-gray-100 rounded transition-colors self-end"
              title={isRightSidebarCollapsed ? "Open Recipe Tools" : "Close Recipe Tools"}
            >
              <div className="w-4 h-0.5 bg-gray-600"></div>
              <div className="w-4 h-0.5 bg-gray-600"></div>
              <div className="w-4 h-0.5 bg-gray-600"></div>
            </button>
          </div>
        </div>

        {/* Recipe Name and Allergens Section */}
        <div className="flex items-end gap-4 mt-4">
          <div className={`w-1/2 border p-2 rounded-md shadow-md ${isDarkMode ? 'border-cyan-400 bg-black/50 shadow-cyan-400/20' : 'border-black bg-white'}`}>
            <input
              type="text"
              maxLength={50}
              value={recipeName}
              onChange={(e) => setRecipeName(e.target.value)}
              placeholder="RECIPE NAME"
              className={`w-full text-lg font-bold uppercase bg-transparent focus:outline-none ${isDarkMode ? 'text-cyan-400 placeholder-cyan-600' : 'text-black placeholder-gray-400'}`}
            />
          </div>

          {/* Allergens Section - Bottom aligned with Recipe Name */}
          <div className={`border rounded-lg p-3 w-1/3 flex flex-col justify-end ${isDarkMode ? 'bg-red-900/20 border-red-400/30' : 'bg-red-50/50 border-red-200/50'}`}>
            <div className={`font-semibold text-xs mb-2 ${isDarkMode ? 'text-red-400' : 'text-red-800'}`}>ALLERGENS</div>
            {selectedAllergens.length > 0 ? (
              <div className={`grid grid-cols-5 gap-1 text-xs ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
                {selectedAllergens.map((allergen) => (
                  <div key={allergen}>{allergen}</div>
                ))}
              </div>
            ) : (
              <div className={`text-xs italic ${isDarkMode ? 'text-red-500' : 'text-red-400'}`}>
                No allergens selected
              </div>
            )}
          </div>
        </div>

        {/* Cooking Time and Temperature - Directly under recipe name */}
        <div className="flex items-center gap-4 text-sm mt-4">
          <div className="flex items-center gap-2">
            <span className={`font-bold ${isDarkMode ? 'text-cyan-300' : 'text-black'}`}>COOK TIME:</span>
            <input
              type="text"
              placeholder="2:30"
              className={`w-16 p-1 border rounded text-sm ${isDarkMode ? 'bg-black/50 border-cyan-400/50 text-cyan-300' : 'bg-white border-gray-300 text-black'}`}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className={`font-bold ${isDarkMode ? 'text-cyan-300' : 'text-black'}`}>COOK TEMP:</span>
            <input
              type="text"
              placeholder="350F"
              className={`w-16 p-1 border rounded text-sm ${isDarkMode ? 'bg-black/50 border-cyan-400/50 text-cyan-300' : 'bg-white border-gray-300 text-black'}`}
            />

            {selectedCookingEquipment.length > 0 && (
              <span className={`text-xs ml-2 ${isDarkMode ? 'text-cyan-400' : 'text-gray-600'}`}>
                {selectedCookingEquipment.join(', ').toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* Recipe Image and Costing Info - Combined container */}
        <div className="flex items-start mt-2">
          {/* Left side - Costing Info */}
          <div className={`w-1/2 text-sm space-y-1 ${isDarkMode ? 'text-cyan-300' : 'text-black'}`}>
            <div className="flex items-center gap-4">
              <span><span className="font-bold">FULL RECIPE:</span> $15.00</span>
              <span><span className="font-bold">YIELD:</span> 6 QTS</span>
              <span><span className="font-bold">RECIPE ACCESS:</span> {selectedRecipeAccess.length > 0 ? selectedRecipeAccess.join(', ').toUpperCase() : 'NONE'}</span>
            </div>
            <div className="flex items-center gap-4">
              <span><span className="font-bold">PORTION:</span> 6</span>
              <span><span className="font-bold">UNIT:</span> OZ</span>
              <span><span className="font-bold">PORTION COST:</span> $00.00</span>
              <span title="Theoretical Yield"><span className="font-bold">Ψ:</span> 6 QTS</span>
            </div>

            {/* MODIFIERS - Added directly in costing container */}
            <div className="mt-1">
              <div className={`border rounded-lg p-3 ${isDarkMode ? 'bg-blue-900/20 border-blue-400/30' : 'bg-blue-50/50 border-blue-200/50'}`}>
                <div className={`font-semibold text-sm mb-2 ${isDarkMode ? 'text-blue-400' : 'text-blue-800'}`}>MODIFIERS</div>
                {(selectedNationality.length > 0 || selectedCourses.length > 0 || selectedRecipeType.length > 0 || selectedPrepMethod.length > 0 || selectedCookingEquipment.length > 0) ? (
                  <div className={`grid grid-cols-7 gap-1 text-xs ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                    {selectedNationality.map((item) => (
                      <div key={item}>{item}</div>
                    ))}
                    {selectedCourses.map((item) => (
                      <div key={item}>{item}</div>
                    ))}
                    {selectedRecipeType.map((item) => (
                      <div key={item}>{item}</div>
                    ))}
                    {selectedPrepMethod.map((item) => (
                      <div key={item}>{item}</div>
                    ))}
                    {selectedCookingEquipment.map((item) => (
                      <div key={item}>{item}</div>
                    ))}
                  </div>
                ) : (
                  <div className={`text-xs italic ${isDarkMode ? 'text-blue-500' : 'text-blue-400'}`}>
                    No modifiers selected
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right side - Recipe Image (aligned with allergen box) */}
          <div className="w-1/3 flex justify-center">
            <div className="w-48 h-32 flex-shrink-0">
              {image ? (
                <img
                  src={image}
                  alt="Recipe"
                  className="w-full h-full object-cover rounded-md"
                  style={{
                    border: '0.5px solid #000',
                    boxShadow: '0 6px 12px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2)'
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gray-100 border rounded-md flex items-center justify-center">
                  <span className="text-sm text-gray-400">Recipe Image</span>
                </div>
              )}
            </div>
          </div>
        </div>


        {/* Ingredient Grid */}
        <div className="mt-4">
          <h3 className={`font-bold text-lg mt-4 ${isDarkMode ? 'text-cyan-400' : 'text-black'}`}>INGREDIENTS</h3>

          {/* Column Headers */}
          <div className="grid gap-2 mt-2 mb-1" style={{gridTemplateColumns: '7rem 5rem 15rem 15rem 6rem 7rem'}}>
            <div className={`text-xs font-medium ${isDarkMode ? 'text-cyan-400' : 'text-black'}`}>QTY</div>
            <div className={`text-xs font-medium ${isDarkMode ? 'text-cyan-400' : 'text-black'}`}>UNIT</div>
            <div className={`text-xs font-medium ${isDarkMode ? 'text-cyan-400' : 'text-black'}`}>ITEM</div>
            <div className={`text-xs font-medium ${isDarkMode ? 'text-cyan-400' : 'text-black'}`}>PREP</div>
            <div className={`text-xs font-medium ${isDarkMode ? 'text-cyan-400' : 'text-black'}`}>YIELD %</div>
            <div className={`text-xs font-medium text-right ${isDarkMode ? 'text-cyan-400' : 'text-black'}`}>COST</div>
          </div>

          <div className="space-y-2">
            {ingredients.map((line, index) => (
              <div key={index} className="grid gap-2" style={{gridTemplateColumns: '7rem 5rem 15rem 15rem 6rem 7rem'}}>
                <input
                  data-row={index}
                  className={`border p-1 rounded text-sm shadow-sm ${isDarkMode ? 'bg-black/50 border-cyan-400/50 text-cyan-300' : 'bg-white border-gray-300 text-black'}`}
                  value={line.qty}
                  maxLength={9}
                  onChange={(e) => handleIngredientChange(index, 'qty', e.target.value)}
                />
                <input
                  data-row={index}
                  className={`border p-1 rounded text-sm shadow-sm ${isDarkMode ? 'bg-black/50 border-cyan-400/50 text-cyan-300' : 'bg-white border-gray-300 text-black'}`}
                  value={line.unit}
                  maxLength={6}
                  onChange={(e) => {
                    const upperValue = e.target.value.toUpperCase();
                    handleIngredientChange(index, 'unit', upperValue);
                  }}
                />
                <input
                  data-row={index}
                  className={`border p-1 rounded text-sm shadow-sm ${isDarkMode ? 'bg-black/50 border-cyan-400/50 text-cyan-300' : 'bg-white border-gray-300 text-black'}`}
                  value={line.item}
                  maxLength={25}
                  onChange={(e) => handleIngredientChange(index, 'item', e.target.value)}
                />
                <input
                  data-row={index}
                  className={`border p-1 rounded text-sm shadow-sm ${isDarkMode ? 'bg-black/50 border-cyan-400/50 text-cyan-300' : 'bg-white border-gray-300 text-black'}`}
                  value={line.prep}
                  maxLength={35}
                  onChange={(e) => handleIngredientChange(index, 'prep', e.target.value)}
                />
                <input
                  data-row={index}
                  className={`border p-1 rounded text-sm shadow-sm ${isDarkMode ? 'bg-black/50 border-cyan-400/50 text-cyan-300' : 'bg-white border-gray-300 text-black'}`}
                  value={line.yield}
                  maxLength={7}
                  onChange={(e) => {
                    let value = e.target.value.replace('%', '');
                    if (value) value += ' %';
                    handleIngredientChange(index, 'yield', value);
                  }}
                />
                <input
                  className={`border p-1 rounded text-sm shadow-sm text-right ${isDarkMode ? 'bg-black/50 border-cyan-400/50 text-cyan-300' : 'bg-white border-gray-300 text-black'}`}
                  value={line.cost}
                  maxLength={9}
                  onChange={(e) => {
                    let value = e.target.value.replace(/[$,\s]/g, '');
                    if (value) {
                      value = value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                      value = '$ ' + value;
                    }
                    handleIngredientChange(index, 'cost', value);
                  }}
                />
              </div>
            ))}

            {/* Ingredient Controls */}
            <div className="flex items-center justify-start gap-2 mt-3">
              <button
                onClick={addIngredientRow}
                className="flex items-center gap-1 text-sm text-green-600 hover:text-green-800 transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
              </button>
              <span className={`text-sm font-medium ${isDarkMode ? 'text-cyan-400' : 'text-black'}`}>INGREDIENT</span>
              <button
                onClick={removeIngredientRow}
                className="flex items-center gap-1 text-sm text-red-600 hover:text-red-800 transition-colors"
                disabled={ingredients.length <= 1}
              >
                <MinusCircle className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Directions */}
        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-4 shadow-md mt-4`} style={{width: 'calc(7rem + 5rem + 15rem + 15rem + 6rem + 7rem + 5 * 0.5rem)'}}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-lg">DIRECTIONS</h3>
            <div className="flex gap-2">
              <Image title="Add Image to Directions" className="text-lg cursor-pointer hover:text-blue-600" onClick={() => setShowImagePopup(true)} />
              <Bold
                title="Bold"
                className="text-lg cursor-pointer hover:text-blue-600"
                onClick={() => applyTextFormat('bold')}
              />
              <Italic
                title="Italic"
                className="text-lg cursor-pointer hover:text-blue-600"
                onClick={() => applyTextFormat('italic')}
              />
              <Underline
                title="Underline"
                className="text-lg cursor-pointer hover:text-blue-600"
                onClick={() => applyTextFormat('underline')}
              />
              <select
                className={`text-xs border rounded p-1 ${isDarkMode ? 'bg-black/50 border-cyan-400/50 text-cyan-300' : 'bg-white border-gray-300'}`}
                value={selectedFont}
                onChange={(e) => setSelectedFont(e.target.value)}
              >
                <option value="Arial">Arial</option>
                <option value="Times">Times</option>
                <option value="Helvetica">Helvetica</option>
                <option value="Georgia">Georgia</option>
              </select>
              <select
                className={`text-xs border rounded p-1 ${isDarkMode ? 'bg-black/50 border-cyan-400/50 text-cyan-300' : 'bg-white border-gray-300'}`}
                value={selectedFontSize}
                onChange={(e) => setSelectedFontSize(e.target.value)}
              >
                <option value="12px">12px</option>
                <option value="14px">14px</option>
                <option value="16px">16px</option>
                <option value="18px">18px</option>
                <option value="20px">20px</option>
              </select>
            </div>
          </div>
          <textarea
            className={`w-full border p-3 rounded shadow-sm resize-none ${isDarkMode ? 'bg-black/50 border-cyan-400/50 text-cyan-300' : 'bg-white border-gray-300 text-black'}`}
            rows={8}
            value={directions}
            onChange={(e) => handleDirectionChange(e.target.value)}
            onKeyDown={handleDirectionKeyDown}
            style={{
              minHeight: '200px',
              lineHeight: '1.5',
              whiteSpace: 'pre-wrap',
              fontFamily: selectedFont,
              fontSize: selectedFontSize
            }}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-6">
          <button className="flex items-center gap-2 text-sm text-gray-700 hover:text-black">
            <Save className="text-xl" />
            Submit
          </button>
          <button className="text-xs border border-gray-400 px-3 py-1 rounded hover:bg-gray-100">
            Generate Nutrition Label
          </button>
        </div>

        {/* Stats Bar at Bottom */}
        <div className={`mt-8 pt-4 border-t rounded-lg p-3 ${isDarkMode ? 'border-cyan-400/30 bg-black/30 shadow-cyan-400/10' : 'border-gray-200 bg-gray-50/50'}`}>
          <div className={`flex justify-end gap-8 text-sm ${isDarkMode ? 'text-cyan-300' : 'text-black'}`}>
            <div className="flex items-center gap-2">
              <span className={`${isDarkMode ? 'text-cyan-500' : 'text-gray-600'}`}>Total Recipes:</span>
              <span className={`font-semibold ${isDarkMode ? 'text-cyan-400' : 'text-gray-800'}`}>247</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`${isDarkMode ? 'text-cyan-500' : 'text-gray-600'}`}>Active Menus:</span>
              <span className={`font-semibold ${isDarkMode ? 'text-cyan-400' : 'text-gray-800'}`}>12</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`${isDarkMode ? 'text-cyan-500' : 'text-gray-600'}`}>Ingredients:</span>
              <span className={`font-semibold ${isDarkMode ? 'text-cyan-400' : 'text-gray-800'}`}>1,432</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Right Sidebar */}
      <RightSidebar
        isCollapsed={isRightSidebarCollapsed}
        onToggle={() => setIsRightSidebarCollapsed(!isRightSidebarCollapsed)}
        selectedAllergens={selectedAllergens}
        onAllergensChange={setSelectedAllergens}
        selectedNationality={selectedNationality}
        onNationalityChange={setSelectedNationality}
        selectedCourses={selectedCourses}
        onCoursesChange={setSelectedCourses}
        selectedRecipeType={selectedRecipeType}
        onRecipeTypeChange={setSelectedRecipeType}
        selectedPrepMethod={selectedPrepMethod}
        onPrepMethodChange={setSelectedPrepMethod}
        selectedCookingEquipment={selectedCookingEquipment}
        onCookingEquipmentChange={setSelectedCookingEquipment}
        selectedRecipeAccess={selectedRecipeAccess}
        onRecipeAccessChange={setSelectedRecipeAccess}
        image={image}
        onImageChange={setImage}
      />

      {/* Image Popup */}
      {showImagePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${isDarkMode ? 'bg-black/90 border border-cyan-400/50 text-cyan-400 shadow-cyan-400/20' : 'bg-white text-black'} rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Recipe Image Editor</h3>
              <button
                onClick={() => setShowImagePopup(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* Image Upload Section */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Upload Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      setImage(event.target?.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className={`w-full p-2 border rounded ${isDarkMode ? 'bg-black/50 border-cyan-400/50 text-cyan-300' : 'bg-white border-gray-300'}`}
              />
            </div>

            {/* Image Preview */}
            {image && (
              <div className="mb-6">
                <div className="w-full h-64 flex items-center justify-center border rounded overflow-hidden">
                  <img
                    src={image}
                    alt="Recipe Preview"
                    className="max-w-full max-h-full object-contain"
                    style={{
                      transform: `scale(${imageSize / 100})`,
                      filter: `brightness(${imageBrightness}%) contrast(${imageContrast}%)`
                    }}
                  />
                </div>
              </div>
            )}

            {/* Image Editing Controls */}
            {image && (
              <div className="space-y-4">
                {/* Size Control */}
                <div>
                  <label className="block text-sm font-medium mb-1">Size: {imageSize}%</label>
                  <input
                    type="range"
                    min="25"
                    max="300"
                    value={imageSize}
                    onChange={(e) => setImageSize(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Brightness Control */}
                <div>
                  <label className="block text-sm font-medium mb-1">Brightness: {imageBrightness}%</label>
                  <input
                    type="range"
                    min="25"
                    max="200"
                    value={imageBrightness}
                    onChange={(e) => setImageBrightness(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Contrast Control */}
                <div>
                  <label className="block text-sm font-medium mb-1">Contrast: {imageContrast}%</label>
                  <input
                    type="range"
                    min="25"
                    max="200"
                    value={imageContrast}
                    onChange={(e) => setImageContrast(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Color Filters */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Color Filters</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => {
                        setImageBrightness(120);
                        setImageContrast(110);
                      }}
                      className="px-3 py-2 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600"
                    >
                      Warm
                    </button>
                    <button
                      onClick={() => {
                        setImageBrightness(95);
                        setImageContrast(120);
                      }}
                      className="px-3 py-2 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Cool
                    </button>
                    <button
                      onClick={() => {
                        setImageBrightness(85);
                        setImageContrast(130);
                      }}
                      className="px-3 py-2 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                      Vintage
                    </button>
                  </div>
                </div>

                {/* Crop Aspect Ratios */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Crop Aspect Ratio</label>
                  <div className="grid grid-cols-4 gap-2">
                    <button className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600">
                      1:1
                    </button>
                    <button className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600">
                      4:3
                    </button>
                    <button className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600">
                      16:9
                    </button>
                    <button className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600">
                      Free
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowImagePopup(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save & Close
              </button>
              <button
                onClick={() => {
                  setImageSize(100);
                  setImageBrightness(100);
                  setImageContrast(100);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Reset Edits
              </button>
              <button
                onClick={() => {
                  setImage(null);
                  setImageSize(100);
                  setImageBrightness(100);
                  setImageContrast(100);
                  setShowImagePopup(false);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Remove Image
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Currency Modal */}
      {showCurrencyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${isDarkMode ? 'bg-black/90 border border-cyan-400/50 text-cyan-400' : 'bg-white text-black'} rounded-lg p-6 max-w-md w-full mx-4`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Select Currency</h3>
              <button
                onClick={() => setShowCurrencyModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'].map((currency) => (
                <button
                  key={currency}
                  onClick={() => {
                    setCurrentCurrency(currency);
                    setShowCurrencyModal(false);
                  }}
                  className={`p-2 rounded border ${
                    currentCurrency === currency
                      ? (isDarkMode ? 'bg-cyan-600 border-cyan-400' : 'bg-blue-600 text-white')
                      : (isDarkMode ? 'border-cyan-400/50 hover:bg-cyan-900/20' : 'border-gray-300 hover:bg-gray-100')
                  }`}
                >
                  {currency}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Unit Conversion Modal */}
      {showUnitsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${isDarkMode ? 'bg-black/90 border border-cyan-400/50 text-cyan-400' : 'bg-white text-black'} rounded-lg p-6 max-w-md w-full mx-4`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Select Unit System</h3>
              <button
                onClick={() => setShowUnitsModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              {['Imperial', 'Metric'].map((unit) => (
                <button
                  key={unit}
                  onClick={() => {
                    setCurrentUnits(unit);
                    setShowUnitsModal(false);
                  }}
                  className={`w-full p-3 rounded border text-left ${
                    currentUnits === unit
                      ? (isDarkMode ? 'bg-cyan-600 border-cyan-400' : 'bg-blue-600 text-white')
                      : (isDarkMode ? 'border-cyan-400/50 hover:bg-cyan-900/20' : 'border-gray-300 hover:bg-gray-100')
                  }`}
                >
                  <div className="font-semibold">{unit}</div>
                  <div className="text-sm opacity-75">
                    {unit === 'Imperial' ? 'Ounces, Pounds, Cups, etc.' : 'Grams, Kilograms, Liters, etc.'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipeInputPage;

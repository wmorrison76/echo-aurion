import React, { useState, useEffect } from "react";
import { ChevronRight, ChevronLeft, Plus, Minus, Send, Crop, Palette, RotateCw } from "lucide-react";

interface RightSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  selectedAllergens: string[];
  onAllergensChange: (allergens: string[]) => void;
  selectedNationality: string[];
  onNationalityChange: (nationality: string[]) => void;
  selectedCourses: string[];
  onCoursesChange: (courses: string[]) => void;
  selectedRecipeType: string[];
  onRecipeTypeChange: (recipeType: string[]) => void;
  selectedPrepMethod: string[];
  onPrepMethodChange: (prepMethod: string[]) => void;
  selectedCookingEquipment: string[];
  onCookingEquipmentChange: (cookingEquipment: string[]) => void;
  selectedRecipeAccess: string[];
  onRecipeAccessChange: (recipeAccess: string[]) => void;
  image: string | null;
  onImageChange: (image: string | null) => void;
}

export default function RightSidebar({
  isCollapsed,
  onToggle,
  selectedAllergens,
  onAllergensChange,
  selectedNationality,
  onNationalityChange,
  selectedCourses,
  onCoursesChange,
  selectedRecipeType,
  onRecipeTypeChange,
  selectedPrepMethod,
  onPrepMethodChange,
  selectedCookingEquipment,
  onCookingEquipmentChange,
  selectedRecipeAccess,
  onRecipeAccessChange,
  image,
  onImageChange
}: RightSidebarProps) {
  const [status, setStatus] = useState("active");
  const [recipeUrl, setRecipeUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [imageSize, setImageSize] = useState(100);
  const [imageBrightness, setImageBrightness] = useState(100);
  const [imageContrast, setImageContrast] = useState(100);
  const [isAllergenCollapsed, setIsAllergenCollapsed] = useState(false);
  const [isNationalityCollapsed, setIsNationalityCollapsed] = useState(false);
  const [isCoursesCollapsed, setIsCoursesCollapsed] = useState(false);
  const [isRecipeTypeCollapsed, setIsRecipeTypeCollapsed] = useState(false);
  const [isPrepMethodCollapsed, setIsPrepMethodCollapsed] = useState(false);
  const [isCookingEquipmentCollapsed, setIsCookingEquipmentCollapsed] = useState(false);
  const [isRecipeAccessCollapsed, setIsRecipeAccessCollapsed] = useState(false);
  const [clipboardUrl, setClipboardUrl] = useState("");

  const allergenList = [
    "Corn", "Dairy", "Eggs", "Fish", "Gluten", "Mustard",
    "Nuts", "Peanuts", "Sesame", "Shellfish", "Soy", "Sulphites"
  ];

  const nationalityList = [
    "Chinese", "French", "Greek", "Indian", "Italian", "Japanese",
    "Korean", "Mexican", "Middle Eastern", "Spanish", "Thai", "Vietnamese"
  ];

  const coursesList = [
    "1st Course", "2nd Course", "3rd Course", "Amuse", "Dessert",
    "Entree", "Entrement", "Pastry", "Salad", "Side Component"
  ];

  const recipeTypeList = [
    "Full Recipe", "Sub Recipe"
  ];

  const prepMethodList = [
    "Bake", "Fried", "Grilled", "Hearth", "Poached", "Roasted",
    "Rotisserie", "Sauté", "Smoker", "Sous Vide", "Tandori"
  ];

  const cookingEquipmentList = [
    "Alto Sham", "Blast Freezer", "Cvap", "Deck Oven", "Rational", "Sous Vide"
  ];

  const recipeAccessList = [
    "Bar", "Global", "Grab & Go", "Outlet", "Pastry"
  ];

  const toggleAllergen = (item: string) => {
    if (selectedAllergens.includes(item)) {
      onAllergensChange(selectedAllergens.filter(a => a !== item));
    } else {
      onAllergensChange([...selectedAllergens, item]);
    }
  };

  const toggleNationality = (item: string) => {
    if (selectedNationality.includes(item)) {
      onNationalityChange(selectedNationality.filter(a => a !== item));
    } else {
      onNationalityChange([...selectedNationality, item]);
    }
  };

  const toggleCourse = (item: string) => {
    if (selectedCourses.includes(item)) {
      onCoursesChange(selectedCourses.filter(a => a !== item));
    } else {
      onCoursesChange([...selectedCourses, item]);
    }
  };

  const toggleRecipeType = (item: string) => {
    if (selectedRecipeType.includes(item)) {
      onRecipeTypeChange(selectedRecipeType.filter(a => a !== item));
    } else {
      onRecipeTypeChange([...selectedRecipeType, item]);
    }
  };

  const togglePrepMethod = (item: string) => {
    if (selectedPrepMethod.includes(item)) {
      onPrepMethodChange(selectedPrepMethod.filter(a => a !== item));
    } else {
      onPrepMethodChange([...selectedPrepMethod, item]);
    }
  };

  const toggleCookingEquipment = (item: string) => {
    if (selectedCookingEquipment.includes(item)) {
      onCookingEquipmentChange(selectedCookingEquipment.filter(a => a !== item));
    } else {
      onCookingEquipmentChange([...selectedCookingEquipment, item]);
    }
  };

  const toggleRecipeAccess = (item: string) => {
    if (selectedRecipeAccess.includes(item)) {
      onRecipeAccessChange(selectedRecipeAccess.filter(a => a !== item));
    } else {
      onRecipeAccessChange([...selectedRecipeAccess, item]);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onImageChange(URL.createObjectURL(file));
  };

  const handleUrlSubmit = () => {
    if (recipeUrl) {
      console.log("Submitting recipe URL:", recipeUrl);
    }
  };

  // Check clipboard for URL on mount
  useEffect(() => {
    const checkClipboard = async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text && (text.startsWith('http') || text.startsWith('www'))) {
          setClipboardUrl(text);
        }
      } catch (err) {
        // Clipboard access might be denied
      }
    };
    checkClipboard();
  }, []);

  return (
    <div className={`fixed top-32 right-0 z-40 ${isCollapsed ? 'w-0' : 'w-64'} h-[700px]
      bg-gradient-to-b from-gray-100/60 via-gray-200/50 to-gray-300/60 
      backdrop-blur-sm border-l border-t border-gray-400/50 rounded-tl-2xl rounded-bl-2xl
      shadow-inner transition-all duration-700 ease-in-out overflow-hidden
      before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:pointer-events-none`}>

      {/* Expanded State - Full sidebar content */}
      {!isCollapsed && (
        <div className="flex flex-col h-full">
          {/* Recipe URL at top with padding */}
          <div className="p-4 pt-4 border-b border-gray-300/50">
            {/* Recipe URL */}
            <div>
              <label className="block text-sm font-medium mb-1">Recipe URL</label>
              <div className="flex gap-1">
                <input
                  type="text"
                  placeholder="Enter Recipe Url"
                  value={recipeUrl}
                  onChange={(e) => setRecipeUrl(e.target.value)}
                  className="flex-1 border border-gray-400/50 p-2 rounded-l bg-gray-100/50 backdrop-blur-sm focus:bg-white/80 transition-colors text-sm placeholder-gray-400"
                />
                <button
                  onClick={handleUrlSubmit}
                  className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-r transition-colors"
                  title="Import Recipe"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              {clipboardUrl && (
                <div className="text-xs text-blue-600 mt-1">
                  URL detected in clipboard: {clipboardUrl.substring(0, 30)}...
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 p-4 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
            {/* Picture Upload */}
            <div>
              <label className="block text-sm font-medium mb-1">Recipe Image</label>
              <input
                type="file"
                onChange={handleImageUpload}
                className="w-full text-xs border border-gray-400/50 p-2 rounded bg-gray-100/50 backdrop-blur-sm focus:bg-white/80 transition-colors"
              />
              {image && (
                <div className="mt-2">
                  <img
                    src={image}
                    alt="Preview"
                    className="w-full h-32 object-cover rounded border"
                  />
                  <button
                    onClick={() => {
                      // Trigger image editor popup in main component
                      const event = new CustomEvent('openImageEditor', { detail: { image } });
                      window.dispatchEvent(event);
                    }}
                    className="w-full mt-2 px-3 py-2 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center justify-center gap-2"
                  >
                    <Palette className="w-3 h-3" />
                    Edit Image
                  </button>
                </div>
              )}
            </div>

            {/* Collapsible Allergens */}
            <div className="bg-red-50/80 border border-red-200 rounded-lg p-3">
              <button
                onClick={() => setIsAllergenCollapsed(!isAllergenCollapsed)}
                className="flex items-center justify-between w-full text-sm font-medium text-red-800 mb-2 hover:text-red-900 transition-colors"
              >
                <span>Allergens ({selectedAllergens.length})</span>
                {isAllergenCollapsed ? (
                  <Plus className="w-4 h-4" />
                ) : (
                  <Minus className="w-4 h-4" />
                )}
              </button>
              
              {!isAllergenCollapsed && (
                <div className="grid grid-cols-3 gap-1">
                  {allergenList.map((allergen) => (
                    <label key={allergen} className="flex items-center space-x-1 text-xs cursor-pointer hover:bg-red-100/50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={selectedAllergens.includes(allergen)}
                        onChange={() => toggleAllergen(allergen)}
                        className="scale-75 text-red-600"
                      />
                      <span className="text-red-700">{allergen}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Nationality */}
            <div className="bg-blue-50/80 border border-blue-200 rounded-lg p-3">
              <button
                onClick={() => setIsNationalityCollapsed(!isNationalityCollapsed)}
                className="flex items-center justify-between w-full text-sm font-medium text-blue-800 mb-2 hover:text-blue-900 transition-colors"
              >
                <span>Nationality ({selectedNationality.length})</span>
                {isNationalityCollapsed ? (
                  <Plus className="w-4 h-4" />
                ) : (
                  <Minus className="w-4 h-4" />
                )}
              </button>

              {!isNationalityCollapsed && (
                <div className="grid grid-cols-3 gap-1">
                  {nationalityList.map((nationality) => (
                    <label key={nationality} className="flex items-center space-x-1 text-xs cursor-pointer hover:bg-blue-100/50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={selectedNationality.includes(nationality)}
                        onChange={() => toggleNationality(nationality)}
                        className="scale-75 text-blue-600"
                      />
                      <span className="text-blue-700">{nationality}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Courses */}
            <div className="bg-blue-50/80 border border-blue-200 rounded-lg p-3">
              <button
                onClick={() => setIsCoursesCollapsed(!isCoursesCollapsed)}
                className="flex items-center justify-between w-full text-sm font-medium text-blue-800 mb-2 hover:text-blue-900 transition-colors"
              >
                <span>Courses ({selectedCourses.length})</span>
                {isCoursesCollapsed ? (
                  <Plus className="w-4 h-4" />
                ) : (
                  <Minus className="w-4 h-4" />
                )}
              </button>

              {!isCoursesCollapsed && (
                <div className="grid grid-cols-3 gap-1">
                  {coursesList.map((course) => (
                    <label key={course} className="flex items-center space-x-1 text-xs cursor-pointer hover:bg-blue-100/50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={selectedCourses.includes(course)}
                        onChange={() => toggleCourse(course)}
                        className="scale-75 text-blue-600"
                      />
                      <span className="text-blue-700">{course}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Recipe Type */}
            <div className="bg-blue-50/80 border border-blue-200 rounded-lg p-3">
              <button
                onClick={() => setIsRecipeTypeCollapsed(!isRecipeTypeCollapsed)}
                className="flex items-center justify-between w-full text-sm font-medium text-blue-800 mb-2 hover:text-blue-900 transition-colors"
              >
                <span>Recipe Type ({selectedRecipeType.length})</span>
                {isRecipeTypeCollapsed ? (
                  <Plus className="w-4 h-4" />
                ) : (
                  <Minus className="w-4 h-4" />
                )}
              </button>

              {!isRecipeTypeCollapsed && (
                <div className="grid grid-cols-2 gap-1">
                  {recipeTypeList.map((type) => (
                    <label key={type} className="flex items-center space-x-1 text-xs cursor-pointer hover:bg-blue-100/50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={selectedRecipeType.includes(type)}
                        onChange={() => toggleRecipeType(type)}
                        className="scale-75 text-blue-600"
                      />
                      <span className="text-blue-700">{type}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Preparation Method */}
            <div className="bg-blue-50/80 border border-blue-200 rounded-lg p-3">
              <button
                onClick={() => setIsPrepMethodCollapsed(!isPrepMethodCollapsed)}
                className="flex items-center justify-between w-full text-sm font-medium text-blue-800 mb-2 hover:text-blue-900 transition-colors"
              >
                <span>Preparation Method ({selectedPrepMethod.length})</span>
                {isPrepMethodCollapsed ? (
                  <Plus className="w-4 h-4" />
                ) : (
                  <Minus className="w-4 h-4" />
                )}
              </button>

              {!isPrepMethodCollapsed && (
                <div className="grid grid-cols-3 gap-1">
                  {prepMethodList.map((method) => (
                    <label key={method} className="flex items-center space-x-1 text-xs cursor-pointer hover:bg-blue-100/50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={selectedPrepMethod.includes(method)}
                        onChange={() => togglePrepMethod(method)}
                        className="scale-75 text-blue-600"
                      />
                      <span className="text-blue-700">{method}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Cooking Equipment */}
            <div className="bg-blue-50/80 border border-blue-200 rounded-lg p-3">
              <button
                onClick={() => setIsCookingEquipmentCollapsed(!isCookingEquipmentCollapsed)}
                className="flex items-center justify-between w-full text-sm font-medium text-blue-800 mb-2 hover:text-blue-900 transition-colors"
              >
                <span>Cooking Equipment ({selectedCookingEquipment.length})</span>
                {isCookingEquipmentCollapsed ? (
                  <Plus className="w-4 h-4" />
                ) : (
                  <Minus className="w-4 h-4" />
                )}
              </button>

              {!isCookingEquipmentCollapsed && (
                <div className="grid grid-cols-3 gap-1">
                  {cookingEquipmentList.map((equipment) => (
                    <label key={equipment} className="flex items-center space-x-1 text-xs cursor-pointer hover:bg-blue-100/50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={selectedCookingEquipment.includes(equipment)}
                        onChange={() => toggleCookingEquipment(equipment)}
                        className="scale-75 text-blue-600"
                      />
                      <span className="text-blue-700">{equipment}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Recipe Access */}
            <div className="bg-blue-50/80 border border-blue-200 rounded-lg p-3">
              <button
                onClick={() => setIsRecipeAccessCollapsed(!isRecipeAccessCollapsed)}
                className="flex items-center justify-between w-full text-sm font-medium text-blue-800 mb-2 hover:text-blue-900 transition-colors"
              >
                <span>Recipe Access ({selectedRecipeAccess.length})</span>
                {isRecipeAccessCollapsed ? (
                  <Plus className="w-4 h-4" />
                ) : (
                  <Minus className="w-4 h-4" />
                )}
              </button>

              {!isRecipeAccessCollapsed && (
                <div className="grid grid-cols-3 gap-1">
                  {recipeAccessList.map((access) => (
                    <label key={access} className="flex items-center space-x-1 text-xs cursor-pointer hover:bg-blue-100/50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={selectedRecipeAccess.includes(access)}
                        onChange={() => toggleRecipeAccess(access)}
                        className="scale-75 text-blue-600"
                      />
                      <span className="text-blue-700">{access}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-1">Internal Notes</label>
              <textarea
                placeholder="Version control, chef notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border border-gray-400/50 p-2 rounded bg-gray-100/50 backdrop-blur-sm focus:bg-white/80 transition-colors h-20 text-sm placeholder-gray-400"
              />
            </div>
          </div>

          {/* Status at Bottom */}
          <div className="p-4 border-t border-gray-300/50 bg-gray-100/30">
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border border-gray-400/50 p-2 rounded bg-gray-100/50 backdrop-blur-sm focus:bg-white/80 transition-colors text-sm"
            >
              <option value="active">Active</option>
              <option value="draft">In Development</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

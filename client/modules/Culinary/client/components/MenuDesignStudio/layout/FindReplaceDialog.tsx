import { useState, useCallback } from "react";
import { Search, Replace, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DesignerElement } from "../hooks";

interface FindReplaceDialogProps {
  elements: DesignerElement[];
  onReplace: (elementId: string, updates: Partial<DesignerElement>) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function FindReplaceDialog({
  elements,
  onReplace,
  isOpen,
  onClose,
}: FindReplaceDialogProps) {
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [searchInText, setSearchInText] = useState(true);
  const [searchInDescription, setSearchInDescription] = useState(true);
  const [matches, setMatches] = useState<Array<{ id: string; field: string; value: string }>>([]);
  const [selectedMatchIndex, setSelectedMatchIndex] = useState(0);

  const handleFind = useCallback(() => {
    if (!findText) {
      setMatches([]);
      return;
    }

    const foundMatches: Array<{ id: string; field: string; value: string }> = [];
    const searchText = caseSensitive ? findText : findText.toLowerCase();

    elements.forEach((el) => {
      if (searchInText && el.text) {
        const textToSearch = caseSensitive ? el.text : el.text.toLowerCase();
        if (textToSearch.includes(searchText)) {
          foundMatches.push({ id: el.id, field: "text", value: el.text });
        }
      }

      if (searchInDescription && el.description) {
        const descToSearch = caseSensitive ? el.description : el.description.toLowerCase();
        if (descToSearch.includes(searchText)) {
          foundMatches.push({ id: el.id, field: "description", value: el.description });
        }
      }
    });

    setMatches(foundMatches);
    setSelectedMatchIndex(0);
  }, [findText, caseSensitive, searchInText, searchInDescription, elements]);

  const handleReplace = useCallback(() => {
    if (matches.length === 0 || selectedMatchIndex >= matches.length) return;

    const match = matches[selectedMatchIndex];
    const element = elements.find((el) => el.id === match.id);
    if (!element) return;

    const searchText = caseSensitive ? findText : findText.toLowerCase();
    const currentValue = match.field === "text" ? element.text : element.description;

    if (!currentValue) return;

    let newValue: string;
    if (caseSensitive) {
      newValue = currentValue.replace(findText, replaceText);
    } else {
      const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      newValue = currentValue.replace(regex, replaceText);
    }

    onReplace(match.id, {
      [match.field]: newValue,
    });

    const updatedMatches = matches.filter((_, i) => i !== selectedMatchIndex);
    setMatches(updatedMatches);

    if (updatedMatches.length > 0) {
      setSelectedMatchIndex(Math.min(selectedMatchIndex, updatedMatches.length - 1));
    }
  }, [matches, selectedMatchIndex, findText, replaceText, caseSensitive, elements, onReplace]);

  const handleReplaceAll = useCallback(() => {
    if (matches.length === 0) return;

    matches.forEach((match) => {
      const element = elements.find((el) => el.id === match.id);
      if (!element) return;

      const currentValue = match.field === "text" ? element.text : element.description;
      if (!currentValue) return;

      let newValue: string;
      if (caseSensitive) {
        newValue = currentValue.replace(findText, replaceText);
      } else {
        const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
        newValue = currentValue.replace(regex, replaceText);
      }

      onReplace(match.id, {
        [match.field]: newValue,
      });
    });

    setMatches([]);
    setFindText("");
    setReplaceText("");
  }, [matches, findText, replaceText, caseSensitive, elements, onReplace]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-96 shadow-lg">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Find & Replace</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Tabs defaultValue="find" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="find" className="flex-1">
              Find
            </TabsTrigger>
            <TabsTrigger value="replace" className="flex-1">
              Replace
            </TabsTrigger>
          </TabsList>

          <TabsContent value="find" className="p-4 space-y-4">
            <div>
              <Label className="text-sm font-medium">Search for</Label>
              <Input
                placeholder="Enter text to find..."
                value={findText}
                onChange={(e) => setFindText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleFind();
                }}
                className="mt-1"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="caseSensitive"
                  checked={caseSensitive}
                  onCheckedChange={(checked) => setCaseSensitive(checked as boolean)}
                />
                <Label htmlFor="caseSensitive" className="text-sm cursor-pointer">
                  Case sensitive
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="searchText"
                  checked={searchInText}
                  onCheckedChange={(checked) => setSearchInText(checked as boolean)}
                />
                <Label htmlFor="searchText" className="text-sm cursor-pointer">
                  Search in text
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="searchDesc"
                  checked={searchInDescription}
                  onCheckedChange={(checked) => setSearchInDescription(checked as boolean)}
                />
                <Label htmlFor="searchDesc" className="text-sm cursor-pointer">
                  Search in descriptions
                </Label>
              </div>
            </div>

            <Button onClick={handleFind} className="w-full gap-2">
              <Search className="h-4 w-4" />
              Find All
            </Button>

            {matches.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Results</span>
                  <Badge variant="secondary">{matches.length} matches</Badge>
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto border rounded p-2">
                  {matches.map((match, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedMatchIndex(index)}
                      className={`w-full text-left text-sm p-2 rounded transition-colors ${
                        index === selectedMatchIndex
                          ? "bg-[#c8a97e]/15 text-[#c8a97e]/30 dark:text-white/80"
                          : "hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                    >
                      <div className="font-mono text-xs opacity-75">{match.id}</div>
                      <div className="truncate">{match.value}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="replace" className="p-4 space-y-4">
            <div>
              <Label className="text-sm font-medium">Search for</Label>
              <Input
                placeholder="Enter text to find..."
                value={findText}
                onChange={(e) => setFindText(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Replace with</Label>
              <Input
                placeholder="Enter replacement text..."
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="caseSensitiveReplace"
                  checked={caseSensitive}
                  onCheckedChange={(checked) => setCaseSensitive(checked as boolean)}
                />
                <Label htmlFor="caseSensitiveReplace" className="text-sm cursor-pointer">
                  Case sensitive
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="searchTextReplace"
                  checked={searchInText}
                  onCheckedChange={(checked) => setSearchInText(checked as boolean)}
                />
                <Label htmlFor="searchTextReplace" className="text-sm cursor-pointer">
                  Search in text
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="searchDescReplace"
                  checked={searchInDescription}
                  onCheckedChange={(checked) => setSearchInDescription(checked as boolean)}
                />
                <Label htmlFor="searchDescReplace" className="text-sm cursor-pointer">
                  Search in descriptions
                </Label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleFind} variant="outline" className="flex-1 gap-2">
                <Search className="h-4 w-4" />
                Find
              </Button>
              <Button onClick={handleReplace} variant="outline" className="flex-1 gap-2">
                <Replace className="h-4 w-4" />
                Replace
              </Button>
            </div>

            {matches.length > 0 && (
              <>
                <Button onClick={handleReplaceAll} className="w-full gap-2">
                  <Replace className="h-4 w-4" />
                  Replace All ({matches.length})
                </Button>
                <Badge variant="secondary">{matches.length} matches found</Badge>
              </>
            )}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}

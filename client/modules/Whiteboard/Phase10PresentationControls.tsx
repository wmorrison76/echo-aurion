import React, { useState } from "react";
import { PresentationDeck, CanvasState } from "./types";
import { Presentation, Plus, Play, Edit2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import SlideDeckGenerator from "./SlideDeckGenerator";
interface Phase10PresentationControlsProps {
  canvasState: CanvasState;
  sessionId: string;
  userId: string;
  presentations: PresentationDeck[];
  onCreatePresentation: (deck: PresentationDeck) => void;
  onStartPresentation: (deck: PresentationDeck) => void;
  onEditPresentation: (deck: PresentationDeck) => void;
  onDeletePresentation: (deckId: string) => void;
}
export const Phase10PresentationControls: React.FC<
  Phase10PresentationControlsProps
> = ({
  canvasState,
  sessionId,
  userId,
  presentations,
  onCreatePresentation,
  onStartPresentation,
  onEditPresentation,
  onDeletePresentation,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [createMode, setCreateMode] = useState<"auto" | "blank">("auto");
  const [presentationTitle, setPresentationTitle] = useState("My Presentation");
  const [isGenerating, setIsGenerating] = useState(false);
  const handleAutoGenerate = async () => {
    setIsGenerating(true);
    try {
      const deck = SlideDeckGenerator.generateDeckFromCanvas(
        canvasState,
        sessionId,
        userId,
        presentationTitle,
      );
      const validation = SlideDeckGenerator.validateDeck(deck);
      if (!validation.valid) {
        alert(`Validation errors:\n${validation.errors.join("\n")}`);
        setIsGenerating(false);
        return;
      }
      onCreatePresentation(deck);
      setShowModal(false);
      setPresentationTitle("My Presentation");
    } catch (error) {
      console.error("Failed to generate deck:", error);
      alert("Failed to generate presentation");
    } finally {
      setIsGenerating(false);
    }
  };
  const handleCreateBlank = () => {
    const deck = SlideDeckGenerator.createBlankDeck(
      sessionId,
      userId,
      presentationTitle,
    );
    onCreatePresentation(deck);
    setShowModal(false);
    setPresentationTitle("My Presentation");
  };
  return (
    <>
      {" "}
      {/* Controls */}{" "}
      <Button
        size="sm"
        variant="outline"
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2"
      >
        {" "}
        <Presentation className="w-4 h-4" /> Presentations{" "}
      </Button>{" "}
      {/* Presentations Modal */}{" "}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          {" "}
          <div className="bg-background rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            {" "}
            {/* Create New Presentation Section */}{" "}
            <div className="p-6 border-b border-gray-200">
              {" "}
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {" "}
                Presentations{" "}
              </h2>{" "}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {" "}
                {/* Auto-Generate Option */}{" "}
                <div
                  className="border-2 border-gray-200 rounded-lg p-4 cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  onClick={() => setCreateMode("auto")}
                >
                  {" "}
                  <div className="flex items-center gap-3 mb-2">
                    {" "}
                    <div
                      className={`w-4 h-4 rounded-full border-2 ${createMode === "auto" ? "bg-primary border-blue-500" : "border-border"}`}
                    />{" "}
                    <h3 className="font-semibold text-gray-900">
                      {" "}
                      Auto-Generate{" "}
                    </h3>{" "}
                  </div>{" "}
                  <p className="text-sm text-muted-foreground">
                    {" "}
                    Create slides automatically from canvas sections{" "}
                  </p>{" "}
                </div>{" "}
                {/* Blank Option */}{" "}
                <div
                  className="border-2 border-gray-200 rounded-lg p-4 cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  onClick={() => setCreateMode("blank")}
                >
                  {" "}
                  <div className="flex items-center gap-3 mb-2">
                    {" "}
                    <div
                      className={`w-4 h-4 rounded-full border-2 ${createMode === "blank" ? "bg-primary border-blue-500" : "border-border"}`}
                    />{" "}
                    <h3 className="font-semibold text-gray-900">
                      {" "}
                      Blank Presentation{" "}
                    </h3>{" "}
                  </div>{" "}
                  <p className="text-sm text-muted-foreground">
                    {" "}
                    Start with an empty presentation template{" "}
                  </p>{" "}
                </div>{" "}
              </div>{" "}
              {/* Title Input */}{" "}
              <div className="space-y-2 mb-4">
                {" "}
                <label className="text-sm font-medium text-foreground">
                  {" "}
                  Presentation Title{" "}
                </label>{" "}
                <input
                  type="text"
                  value={presentationTitle}
                  onChange={(e) => setPresentationTitle(e.target.value)}
                  placeholder="My Presentation"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />{" "}
              </div>{" "}
              {/* Create Button */}{" "}
              <div className="flex gap-2 justify-end">
                {" "}
                <Button variant="outline" onClick={() => setShowModal(false)}>
                  {" "}
                  Cancel{" "}
                </Button>{" "}
                {createMode === "auto" ? (
                  <Button
                    onClick={handleAutoGenerate}
                    disabled={isGenerating}
                    className="bg-primary hover:opacity-90"
                  >
                    {" "}
                    {isGenerating
                      ? "Generating..."
                      : "Generate Presentation"}{" "}
                  </Button>
                ) : (
                  <Button
                    onClick={handleCreateBlank}
                    className="bg-primary hover:opacity-90"
                  >
                    {" "}
                    Create Blank{" "}
                  </Button>
                )}{" "}
              </div>{" "}
            </div>{" "}
            {/* Presentations List */}{" "}
            {presentations.length > 0 && (
              <div className="p-6">
                {" "}
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {" "}
                  Your Presentations{" "}
                </h3>{" "}
                <div className="space-y-3">
                  {" "}
                  {presentations.map((deck) => (
                    <div
                      key={deck.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-surface transition-colors"
                    >
                      {" "}
                      <div className="flex-1">
                        {" "}
                        <h4 className="font-medium text-gray-900">
                          {" "}
                          {deck.title}{" "}
                        </h4>{" "}
                        <p className="text-sm text-muted-foreground">
                          {" "}
                          {deck.slides.length} slides{" "}
                          {deck.isAutoGenerated ? " • Auto-generated" : ""}{" "}
                        </p>{" "}
                      </div>{" "}
                      <div className="flex items-center gap-2">
                        {" "}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onStartPresentation(deck)}
                        >
                          {" "}
                          <Play className="w-4 h-4 mr-1" /> Present{" "}
                        </Button>{" "}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onEditPresentation(deck)}
                        >
                          {" "}
                          <Edit2 className="w-4 h-4" />{" "}
                        </Button>{" "}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => onDeletePresentation(deck.id)}
                        >
                          {" "}
                          <Trash2 className="w-4 h-4" />{" "}
                        </Button>{" "}
                      </div>{" "}
                    </div>
                  ))}{" "}
                </div>{" "}
              </div>
            )}{" "}
            {presentations.length === 0 && (
              <div className="p-6 text-center">
                {" "}
                <p className="text-muted-foreground">
                  {" "}
                  No presentations yet. Create one above to get started!{" "}
                </p>{" "}
              </div>
            )}{" "}
          </div>{" "}
        </div>
      )}{" "}
    </>
  );
};
export default Phase10PresentationControls;

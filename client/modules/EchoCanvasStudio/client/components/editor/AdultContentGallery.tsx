import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, AlertTriangle } from "lucide-react";
interface CakeDesign {
  id: string;
  designName?: string;
  imageUrl: string;
  isAdultContent: boolean;
  estimatedPrice?: number;
  createdAt: string;
  theme?: string;
  metadata?: { prompt?: string; cakeConfig?: any; consentStatus?: string };
}
interface AdultContentGalleryProps {
  designs: CakeDesign[];
  onSelectDesign?: (design: CakeDesign) => void;
  isLoggedIn?: boolean;
}
const OVERLAY_OPACITY = 0.8; // 80% opacity
const BLUR_AMOUNT = "8px";
export default function AdultContentGallery({
  designs,
  onSelectDesign,
  isLoggedIn = false,
}: AdultContentGalleryProps) {
  const [revealedImages, setRevealedImages] = useState<Set<string>>(new Set());
  const [showContentWarning, setShowContentWarning] = useState<string | null>(
    null,
  );
  const toggleReveal = (designId: string) => {
    const newRevealed = new Set(revealedImages);
    if (newRevealed.has(designId)) {
      newRevealed.delete(designId);
    } else {
      newRevealed.add(designId);
      setShowContentWarning(designId);
    }
    setRevealedImages(newRevealed);
  };
  const adultDesigns = designs.filter((d) => d.isAdultContent);
  const standardDesigns = designs.filter((d) => !d.isAdultContent);
  if (designs.length === 0) {
    return (
      <Card>
        {" "}
        <CardContent className="pt-6 text-center text-muted-foreground">
          {" "}
          No cake designs available yet. Create your first design!{" "}
        </CardContent>{" "}
      </Card>
    );
  }
  return (
    <div className="space-y-6">
      {" "}
      {/* Standard Content Gallery */}{" "}
      {standardDesigns.length > 0 && (
        <div className="space-y-3">
          {" "}
          <h3 className="font-semibold text-lg">Standard Designs</h3>{" "}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {" "}
            {standardDesigns.map((design) => (
              <Card
                key={design.id}
                className="overflow-hidden hover:shadow-lg transition"
              >
                {" "}
                <div className="relative aspect-square bg-surface">
                  {" "}
                  <img
                    src={design.imageUrl}
                    alt={design.designName}
                    className="w-full h-full object-cover"
                  />{" "}
                </div>{" "}
                <CardContent className="pt-4">
                  {" "}
                  <p className="font-semibold text-sm">
                    {design.designName || "Untitled"}
                  </p>{" "}
                  {design.estimatedPrice && (
                    <p className="text-sm text-muted-foreground">
                      ${design.estimatedPrice}
                    </p>
                  )}{" "}
                  {design.metadata?.prompt && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                      "{design.metadata.prompt}"{" "}
                    </p>
                  )}{" "}
                  {onSelectDesign && (
                    <Button
                      onClick={() => onSelectDesign(design)}
                      size="sm"
                      className="w-full mt-3"
                    >
                      {" "}
                      Select Design{" "}
                    </Button>
                  )}{" "}
                </CardContent>{" "}
              </Card>
            ))}{" "}
          </div>{" "}
        </div>
      )}{" "}
      {/* Adult Content Gallery */}{" "}
      {adultDesigns.length > 0 && (
        <div className="space-y-3">
          {" "}
          <div className="flex items-center gap-2">
            {" "}
            <AlertTriangle className="w-5 h-5 text-orange-600" />{" "}
            <h3 className="font-semibold text-lg text-orange-600">
              Adult Content Gallery
            </h3>{" "}
          </div>{" "}
          {!isLoggedIn && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
              {" "}
              <p className="font-semibold mb-2">⚠️ Access Restricted</p>{" "}
              <p>Please log in to view adult content designs.</p>{" "}
            </div>
          )}{" "}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {" "}
            {adultDesigns.map((design) => {
              const isRevealed = revealedImages.has(design.id);
              return (
                <Card
                  key={design.id}
                  className="overflow-hidden hover:shadow-lg transition border-orange-200"
                >
                  {" "}
                  {/* Image Container with Overlay */}{" "}
                  <div className="relative aspect-square bg-surface group cursor-pointer">
                    {" "}
                    <img
                      src={design.imageUrl}
                      alt={design.designName}
                      className="w-full h-full object-cover transition"
                      style={{
                        filter: isRevealed ? "none" : `blur(${BLUR_AMOUNT})`,
                        opacity: isRevealed ? 1 : 1,
                      }}
                    />{" "}
                    {/* Overlay */}{" "}
                    {!isRevealed && (
                      <div
                        className="absolute inset-0 bg-black flex items-center justify-center transition"
                        style={{ opacity: OVERLAY_OPACITY }}
                      >
                        {" "}
                        <div className="text-center space-y-3">
                          {" "}
                          <AlertTriangle className="w-8 h-8 text-orange-300 mx-auto" />{" "}
                          <p className="text-white font-semibold text-sm">
                            Adult Content
                          </p>{" "}
                          <p className="text-gray-300 text-xs">
                            Login required to view
                          </p>{" "}
                        </div>{" "}
                      </div>
                    )}{" "}
                    {/* Reveal Button */}{" "}
                    {isLoggedIn && (
                      <button
                        onClick={() => toggleReveal(design.id)}
                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/20 backdrop-blur-sm"
                      >
                        {" "}
                        {isRevealed ? (
                          <div className="flex flex-col items-center gap-1">
                            {" "}
                            <EyeOff className="w-6 h-6 text-white" />{" "}
                            <span className="text-xs text-white">
                              Hide
                            </span>{" "}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            {" "}
                            <Eye className="w-6 h-6 text-white" />{" "}
                            <span className="text-xs text-white">
                              Reveal
                            </span>{" "}
                          </div>
                        )}{" "}
                      </button>
                    )}{" "}
                  </div>{" "}
                  <CardContent className="pt-4">
                    {" "}
                    <p className="font-semibold text-sm">
                      {design.designName || "Untitled"}
                    </p>{" "}
                    <div className="flex items-center gap-1 mt-1">
                      {" "}
                      <span className="inline-block px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">
                        {" "}
                        Adult Content{" "}
                      </span>{" "}
                    </div>{" "}
                    {design.estimatedPrice && (
                      <p className="text-sm text-muted-foreground mt-2">
                        ${design.estimatedPrice}
                      </p>
                    )}{" "}
                    {design.metadata?.prompt && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        "{design.metadata.prompt}"{" "}
                      </p>
                    )}{" "}
                    {design.metadata?.consentStatus && (
                      <p className="text-xs text-gray-400 mt-1">
                        {" "}
                        Status: {design.metadata.consentStatus}{" "}
                      </p>
                    )}{" "}
                    {isLoggedIn && onSelectDesign && (
                      <Button
                        onClick={() => onSelectDesign(design)}
                        size="sm"
                        className="w-full mt-3 bg-orange-600 hover:bg-orange-700"
                      >
                        {" "}
                        Select Design{" "}
                      </Button>
                    )}{" "}
                  </CardContent>{" "}
                </Card>
              );
            })}{" "}
          </div>{" "}
        </div>
      )}{" "}
      {/* Content Warning Modal */}{" "}
      {showContentWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          {" "}
          <Card className="max-w-md">
            {" "}
            <CardHeader className="bg-orange-50">
              {" "}
              <CardTitle className="flex items-center gap-2 text-orange-600">
                {" "}
                <AlertTriangle className="w-5 h-5" /> Content Warning{" "}
              </CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent className="pt-6 space-y-4">
              {" "}
              <div>
                {" "}
                <p className="text-sm font-semibold mb-2">
                  You are about to view adult content.
                </p>{" "}
                <p className="text-sm text-muted-foreground">
                  {" "}
                  This content contains mature themes. By proceeding, you
                  acknowledge that you are of legal age and understand the
                  nature of the content.{" "}
                </p>{" "}
              </div>{" "}
              <div className="flex gap-3">
                {" "}
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowContentWarning(null);
                    setRevealedImages(new Set());
                  }}
                  className="flex-1"
                >
                  {" "}
                  Go Back{" "}
                </Button>{" "}
                <Button
                  onClick={() => setShowContentWarning(null)}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                >
                  {" "}
                  I Understand{" "}
                </Button>{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </div>
      )}{" "}
    </div>
  );
}

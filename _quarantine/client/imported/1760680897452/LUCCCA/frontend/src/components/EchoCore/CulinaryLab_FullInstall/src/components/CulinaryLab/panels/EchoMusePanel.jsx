import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const prompts = [
  "What if this dish had no heat—only cold?",
  "What does this flavor sound like in music?",
  "Could you tell a story with just texture?",
  "Imagine the aroma reaches the guest before the plate.",
  "Is there a nostalgic memory you could plate?",
  "What if the sauce was invisible until touched?",
  "Could bitterness be the star, not sweetness?",
  "What ingredient have you never dared to use?",
  "How would this taste in zero gravity?",
  "Where would this dish be served in a dream?"
];

export default function EchoMusePanel() {
  const [currentPrompt, setCurrentPrompt] = useState(prompts[0]);
  const [notes, setNotes] = useState("");

  const handleInspire = () => {
    const next = prompts[Math.floor(Math.random() * prompts.length)];
    setCurrentPrompt(next);
  };

  return (
    <Card className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-2xl shadow-lg border border-purple-700 mt-4">
      <CardContent className="p-4 space-y-4">
        <h2 className="text-xl font-semibold text-white">🎨 Echo Muse</h2>
        <p className="text-sm text-purple-300 italic">“{currentPrompt}”</p>

        <Textarea
          placeholder="Write your reaction or poetic response here..."
          className="bg-slate-800 text-white border border-slate-700"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="flex justify-between pt-2">
          <Button onClick={handleInspire} variant="secondary">
            Inspire Me Again
          </Button>
          <Button variant="default">Save Muse</Button>
        </div>
      </CardContent>
    </Card>
  );
}

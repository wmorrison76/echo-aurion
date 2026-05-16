import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export default function RecipeFormPanel() {
  const [form, setForm] = useState({
    title: "",
    ingredients: "",
    method: "",
    hypothesis: "",
    conclusion: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <Card className="rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 shadow-md text-white">
      <CardContent className="p-5 space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-teal-400" />
          R&D Recipe Form
        </h2>

        <Input
          name="title"
          placeholder="Dish Title"
          value={form.title}
          onChange={handleChange}
          className="bg-slate-700 text-white border-slate-600"
        />

        <Textarea
          name="ingredients"
          placeholder="Ingredients (with quantities)"
          value={form.ingredients}
          onChange={handleChange}
          rows={5}
          className="bg-slate-700 text-white border-slate-600"
        />

        <Textarea
          name="method"
          placeholder="Preparation Method / Steps"
          value={form.method}
          onChange={handleChange}
          rows={5}
          className="bg-slate-700 text-white border-slate-600"
        />

        <Textarea
          name="hypothesis"
          placeholder="Hypothesis / Experimental Theory"
          value={form.hypothesis}
          onChange={handleChange}
          rows={4}
          className="bg-slate-700 text-white border-slate-600"
        />

        <Textarea
          name="conclusion"
          placeholder="Conclusion / Tasting Notes"
          value={form.conclusion}
          onChange={handleChange}
          rows={4}
          className="bg-slate-700 text-white border-slate-600"
        />

        <Button className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700">
          Save Draft
        </Button>
      </CardContent>
    </Card>
  );
}

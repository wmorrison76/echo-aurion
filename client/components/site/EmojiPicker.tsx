import { useState, useRef, useEffect } from "react";
import { SmilePlus, X, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/glass";

const EMOJI_CATEGORIES = {
  smileys: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😚", "😙", "🥲", "😋", "😛", "😜", "🤪", "😌", "😑", "😐", "😏", "🙁", "☹️", "😕", "🙁", "😲", "😞", "😖", "😢", "😭", "😤", "😠", "😡", "🤬", "😈", "👿", "💀", "☠️", "💩", "🤡", "👹", "👺", "👻", "👽", "👾", "🤖"],
  hands: ["👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🫰", "🤟", "🤘", "🤙", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🤜", "🤛"],
  hearts: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "💌"],
  activities: ["⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎳", "🏓", "🏸", "🏒", "🏑", "🥍", "🏏", "🥅", "⛳", "⛸️", "🎣", "🎽", "🎿", "🛷", "🛹", "🛼"],
  food: ["🍕", "🍔", "🍟", "🍗", "🌭", "🍖", "🌮", "🌯", "🥙", "🧆", "🥗", "🥘", "🍝", "🍜", "🍲", "🍛", "🍣", "🍱", "🥟", "🦪", "🍤", "🍙", "🍚", "🍧", "🍨", "🍦", "🥧", "🧁", "🍰", "🎂", "🍮", "🍯", "🍼", "☕", "🍵", "🧃", "🥛", "🍶", "🍾", "🍷", "🍸", "🍹", "🍺", "🍻", "🥂", "🥃"],
  nature: ["🌲", "🌳", "🌴", "🌵", "🌾", "🌿", "☘️", "🍀", "🎍", "🎎", "🎏", "🎐", "🎑", "🌍", "🌎", "🌏", "🌐", "⭐", "💫", "⭐", "🌟", "✨", "⚡", "☄️", "💥", "🔥", "🌪️", "🌈", "🌤️", "⛅", "🌥️", "☁️", "🌦️", "🌧️", "⛈️", "🌩️", "🌨️", "❄️", "☃️", "⛄", "🌬️", "💨", "💧", "💦", "☔"],
  animals: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐽", "🐸", "🐵", "🐔", "🐧", "🐦", "🐤", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🐛", "🦋", "🐌", "🐞", "🐜", "🦟", "🦗", "🕷️", "🦂", "🐢", "🐍", "🦎", "🦖", "🦕", "🐙", "🦑", "🦐", "🦞", "🦀", "🐡", "🐠", "🐟", "🐬", "🐳", "🐋"],
  objects: ["⌚", "📱", "💻", "⌨️", "🖥️", "🖨️", "🖱️", "🖲️", "🕹️", "🗜️", "💽", "💾", "💿", "📀", "📼", "📷", "📸", "📹", "🎥", "🎬", "📽️", "🎞️", "📞", "☎️", "📟", "📠", "📺", "📻", "🎙️", "🎚️", "🎛️", "🧭", "⏱️", "⏲️", "⏰", "🕰️", "⌛", "⏳", "📡", "🔋", "🔌", "💡", "🔦", "🕯️", "🪔", "🧯", "🛢️", "💸", "💵", "💴", "💶", "💷", "💰", "💳", "🧾", "✉️", "📩", "📨", "📤", "📥", "📦", "🏷️", "🧧", "📪", "📫", "📬", "📭", "📮", "✏️", "✒️", "🖋️", "🖊️", "🖌️", "🖍️", "📝", "📁", "📂", "📅", "📆", "🗒️", "🗓️", "📇", "📈", "📉", "📊", "📋", "📌", "📍", "📎", "🖇️", "📐", "📏", "🧮", "📓", "📔", "📒", "📕", "📗", "📘", "📙", "📚", "📖", "🧷", "🧹", "🧺", "🧻", "🧼", "🧽", "🧯", "🛒", "🚚", "🚛", "🚐", "🚙", "🚗", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "🚐", "🛻", "🚚", "🚛", "🚜"],
  symbols: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "❤️‍🔥", "❤️‍🩹", "💔", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "💌", "💤", "💢", "💣", "💥", "💦", "💨", "🕳️", "💬", "👁️‍🗨️", "🗨️", "🗯️", "💭", "💤"],
};

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  position?: "top" | "bottom";
}

export default function EmojiPicker({ onSelect, position = "top" }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof EMOJI_CATEGORIES>("smileys");
  const [searchQuery, setSearchQuery] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleEmojiSelect = (emoji: string) => {
    onSelect(emoji);
    setIsOpen(false);
  };

  const filteredEmojis = searchQuery
    ? Object.values(EMOJI_CATEGORIES)
        .flat()
        .filter((emoji) => {
          const emojiName = new Intl.Segmenter("en", { granularity: "grapheme" })
            .segment(emoji)
            .toString()
            .toLowerCase();
          return emojiName.includes(searchQuery.toLowerCase());
        })
    : EMOJI_CATEGORIES[selectedCategory];

  return (
    <div className="relative" ref={pickerRef}>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className="h-7 w-7 p-0"
        title="Add emoji"
      >
        <SmilePlus size={16} className="text-slate-400" />
      </Button>

      {isOpen && (
        <div
          className={cn(
            "absolute z-50 bg-slate-900 border border-slate-700 rounded-lg shadow-lg p-3 w-80",
            position === "top" ? "bottom-full mb-2" : "top-full mt-2"
          )}
        >
          {/* Search */}
          <div className="mb-3">
            <Input
              type="text"
              placeholder="Search emojis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-800/50 border-slate-700 h-7 text-xs"
            />
          </div>

          {/* Category Tabs */}
          {!searchQuery && (
            <div className="flex gap-1 mb-3 overflow-x-auto">
              {Object.keys(EMOJI_CATEGORIES).map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category as keyof typeof EMOJI_CATEGORIES)}
                  className={cn(
                    "text-lg px-2 py-1 rounded transition-colors flex-shrink-0",
                    selectedCategory === category
                      ? "bg-blue-600/40"
                      : "hover:bg-slate-800/50"
                  )}
                  title={category}
                >
                  {category === "smileys" && "😀"}
                  {category === "hands" && "👋"}
                  {category === "hearts" && "❤️"}
                  {category === "activities" && "⚽"}
                  {category === "food" && "🍕"}
                  {category === "nature" && "🌲"}
                  {category === "animals" && "🐶"}
                  {category === "objects" && "⌚"}
                  {category === "symbols" && "❤️"}
                </button>
              ))}
            </div>
          )}

          {/* Emoji Grid */}
          <div className="grid grid-cols-6 gap-1 max-h-64 overflow-y-auto">
            {filteredEmojis.map((emoji, idx) => (
              <button
                key={idx}
                onClick={() => handleEmojiSelect(emoji)}
                className="text-2xl hover:bg-slate-800/50 p-2 rounded transition-colors"
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* No results */}
          {filteredEmojis.length === 0 && (
            <div className="text-center py-4 text-slate-400 text-sm">
              No emojis found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

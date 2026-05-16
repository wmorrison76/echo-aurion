import { useState, useRef } from "react";
import {
  Bold,
  Italic,
  Code,
  Link as LinkIcon,
  X,
  Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/glass";

interface MessageFormat {
  bold: boolean;
  italic: boolean;
  code: boolean;
  link?: { text: string; url: string };
}

interface MessageFormatterProps {
  value: string;
  onChange: (value: string, format?: MessageFormat) => void;
  onSubmit?: () => void;
}

export default function MessageFormatter({
  value,
  onChange,
  onSubmit,
}: MessageFormatterProps) {
  const [format, setFormat] = useState<MessageFormat>({
    bold: false,
    italic: false,
    code: false,
  });
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkText, setLinkText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const applyFormat = (type: "bold" | "italic" | "code") => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    if (!selectedText) return;

    let newText = value;
    let newFormat: MessageFormat = { ...format };

    switch (type) {
      case "bold":
        newText =
          value.substring(0, start) +
          `**${selectedText}**` +
          value.substring(end);
        newFormat.bold = true;
        break;
      case "italic":
        newText =
          value.substring(0, start) +
          `*${selectedText}*` +
          value.substring(end);
        newFormat.italic = true;
        break;
      case "code":
        newText =
          value.substring(0, start) +
          "`${selectedText}`" +
          value.substring(end);
        newFormat.code = true;
        break;
    }

    setFormat(newFormat);
    onChange(newText, newFormat);

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + 2;
      textarea.selectionEnd = end + 2;
    }, 0);
  };

  const addLink = () => {
    if (!textareaRef.current || !linkText || !linkUrl) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end) || linkText;

    const newText =
      value.substring(0, start) +
      `[${selectedText}](${linkUrl})` +
      value.substring(end);

    const newFormat: MessageFormat = {
      ...format,
      link: { text: selectedText, url: linkUrl },
    };

    setFormat(newFormat);
    onChange(newText, newFormat);

    setLinkText("");
    setLinkUrl("");
    setShowLinkModal(false);

    setTimeout(() => {
      textarea.focus();
    }, 0);
  };

  const removeFormat = (type: "bold" | "italic" | "code" | "link") => {
    let newFormat: MessageFormat = { ...format };

    switch (type) {
      case "bold":
        newFormat.bold = false;
        break;
      case "italic":
        newFormat.italic = false;
        break;
      case "code":
        newFormat.code = false;
        break;
      case "link":
        newFormat.link = undefined;
        break;
    }

    setFormat(newFormat);
    onChange(value, newFormat);
  };

  const formatPreview = () => {
    let preview = value;

    if (format.bold) {
      preview = preview.replace(/\*\*(.*?)\*\*/g, "$1");
    }
    if (format.italic) {
      preview = preview.replace(/\*(.*?)\*/g, "$1");
    }
    if (format.code) {
      preview = preview.replace(/`(.*?)`/g, '$1');
    }
    if (format.link) {
      preview = preview.replace(/\[(.*?)\]\((.*?)\)/g, "$1");
    }

    return preview;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 flex-wrap bg-slate-800/30 p-2 rounded">
        <Button
          size="sm"
          variant={format.bold ? "default" : "ghost"}
          onClick={() => applyFormat("bold")}
          className={cn(
            "h-7 w-7 p-0",
            format.bold && "bg-blue-600/50"
          )}
          title="Bold (Ctrl+B)"
        >
          <Bold size={14} />
        </Button>

        <Button
          size="sm"
          variant={format.italic ? "default" : "ghost"}
          onClick={() => applyFormat("italic")}
          className={cn(
            "h-7 w-7 p-0",
            format.italic && "bg-blue-600/50"
          )}
          title="Italic (Ctrl+I)"
        >
          <Italic size={14} />
        </Button>

        <Button
          size="sm"
          variant={format.code ? "default" : "ghost"}
          onClick={() => applyFormat("code")}
          className={cn(
            "h-7 w-7 p-0",
            format.code && "bg-blue-600/50"
          )}
          title="Code"
        >
          <Code size={14} />
        </Button>

        <div className="w-px h-6 bg-slate-600/50" />

        <Button
          size="sm"
          variant={format.link ? "default" : "ghost"}
          onClick={() => setShowLinkModal(!showLinkModal)}
          className={cn(
            "h-7 w-7 p-0",
            format.link && "bg-blue-600/50"
          )}
          title="Add Link"
        >
          <LinkIcon size={14} />
        </Button>

        {format.bold && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => removeFormat("bold")}
            className="h-7 px-2 text-xs text-slate-400 hover:text-red-400"
          >
            Bold <X size={12} className="ml-1" />
          </Button>
        )}

        {format.italic && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => removeFormat("italic")}
            className="h-7 px-2 text-xs text-slate-400 hover:text-red-400"
          >
            Italic <X size={12} className="ml-1" />
          </Button>
        )}

        {format.code && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => removeFormat("code")}
            className="h-7 px-2 text-xs text-slate-400 hover:text-red-400"
          >
            Code <X size={12} className="ml-1" />
          </Button>
        )}

        {format.link && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => removeFormat("link")}
            className="h-7 px-2 text-xs text-slate-400 hover:text-red-400"
          >
            Link <X size={12} className="ml-1" />
          </Button>
        )}
      </div>

      {/* Link Modal */}
      {showLinkModal && (
        <div className="bg-slate-800/50 p-3 rounded space-y-2">
          <Input
            type="text"
            placeholder="Link text"
            value={linkText}
            onChange={(e) => setLinkText(e.target.value)}
            className="bg-slate-700/50 border-slate-600 h-8 text-sm"
          />
          <Input
            type="url"
            placeholder="https://example.com"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            className="bg-slate-700/50 border-slate-600 h-8 text-sm"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={addLink}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-7"
            >
              Add Link
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowLinkModal(false)}
              className="text-slate-400 hover:text-slate-300 text-xs h-7"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Message Input */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.ctrlKey) {
            onSubmit?.();
          }
        }}
        placeholder="Type a message... (Ctrl+Enter to send)"
        className="w-full h-24 px-3 py-2 bg-slate-800/50 border border-slate-700 rounded text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
      />

      {/* Preview */}
      {value && (
        <div className="text-xs text-slate-400">
          <p className="font-medium mb-1">Preview:</p>
          <div className="bg-slate-800/30 p-2 rounded text-slate-200 break-words">
            {formatPreview()}
          </div>
        </div>
      )}
    </div>
  );
}

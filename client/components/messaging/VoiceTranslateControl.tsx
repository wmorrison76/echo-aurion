import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useVoiceTranslate, type VoiceTranslatePayload } from "@/hooks/useVoiceTranslate";

type VoiceTranslateControlProps = {
  onCommit: (payload: VoiceTranslatePayload) => void;
  onError?: (message: string) => void;
  className?: string;
  compact?: boolean;
};

export const VoiceTranslateControl = ({
  onCommit,
  onError,
  className,
  compact = false,
}: VoiceTranslateControlProps) => {
  const {
    isRecording,
    isProcessing,
    transcript,
    translation,
    targetLanguage,
    setTargetLanguage,
    languages,
    startRecording,
    stopRecording,
  } = useVoiceTranslate({
    onComplete: onCommit,
    onError,
  });

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Select value={targetLanguage} onValueChange={setTargetLanguage}>
        <SelectTrigger className={cn("h-8 w-28 text-xs", compact && "w-24")}>
          <SelectValue placeholder="Lang" />
        </SelectTrigger>
        <SelectContent>
          {languages.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              {lang.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        variant={isRecording ? "destructive" : "ghost"}
        onClick={isRecording ? stopRecording : startRecording}
        className="h-8 w-8 p-0"
        title={isRecording ? "Stop recording" : "Start recording"}
      >
        {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </Button>
      {isProcessing && (
        <Badge variant="outline" className="text-[10px]">
          Translating...
        </Badge>
      )}
      {!compact && (transcript || translation) && (
        <div className="text-[10px] text-muted-foreground line-clamp-1">
          {translation || transcript}
        </div>
      )}
    </div>
  );
};

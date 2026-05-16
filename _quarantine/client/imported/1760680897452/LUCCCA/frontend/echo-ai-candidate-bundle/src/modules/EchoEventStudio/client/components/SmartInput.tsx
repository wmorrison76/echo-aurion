import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import {
  Mic,
  MicOff,
  Volume2,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Play
} from 'lucide-react';
import { 
  spellCheckText, 
  autoCorrectText, 
  voiceNotesManager,
  type VoiceNotesManager 
} from '@/lib/spelling-voice-utils';

interface SmartInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
  rows?: number;
  enableSpellCheck?: boolean;
  enableVoiceNotes?: boolean;
  enableAutoCorrect?: boolean;
  onVoiceNote?: (audioBlob: Blob, transcription?: string) => void;
}

interface SpellingIssue {
  word: string;
  suggestions: string[];
  position: number;
}

export default function SmartInput({
  value,
  onChange,
  placeholder = "Type here...",
  className,
  multiline = false,
  rows = 3,
  enableSpellCheck = true,
  enableVoiceNotes = true,
  enableAutoCorrect = true,
  onVoiceNote
}: SmartInputProps) {
  const [spellingIssues, setSpellingIssues] = useState<SpellingIssue[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentSuggestions, setCurrentSuggestions] = useState<string[]>([]);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<string>('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Spell checking effect
  useEffect(() => {
    if (enableSpellCheck && value) {
      const timeout = setTimeout(() => {
        const issues = spellCheckText(value);
        setSpellingIssues(issues);
        
        if (issues.length > 0) {
          setCurrentSuggestions(issues[0].suggestions);
          setShowSuggestions(issues.length > 0);
        } else {
          setShowSuggestions(false);
        }
      }, 300); // Debounce spell checking

      return () => clearTimeout(timeout);
    }
  }, [value, enableSpellCheck]);

  // Auto-correct on blur
  const handleBlur = () => {
    if (enableAutoCorrect) {
      const correctedText = autoCorrectText(value);
      if (correctedText !== value) {
        onChange(correctedText);
      }
    }
  };

  // Handle suggestion selection
  const applySuggestion = (suggestion: string) => {
    if (spellingIssues.length > 0) {
      const issue = spellingIssues[0];
      const newValue = value.replace(new RegExp(`\\b${issue.word}\\b`, 'i'), suggestion);
      onChange(newValue);
      setShowSuggestions(false);
    }
  };

  // Voice recording functions
  const startRecording = async () => {
    const success = await voiceNotesManager.startRecording();
    if (success) {
      setIsRecording(true);
      setRecordingTime(0);
      
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = async () => {
    const audioBlob = await voiceNotesManager.stopRecording();
    setIsRecording(false);
    
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }

    if (audioBlob) {
      setRecordedAudio(audioBlob);
      const url = voiceNotesManager.createAudioURL(audioBlob);
      setAudioUrl(url);

      // Simulate transcription
      setIsTranscribing(true);
      try {
        const transcribedText = await voiceNotesManager.speechToText(audioBlob);
        setTranscription(transcribedText);
        
        // Auto-add transcription to input if it's empty
        if (!value.trim()) {
          onChange(transcribedText);
        }
        
        onVoiceNote?.(audioBlob, transcribedText);
      } catch (error) {
        console.error('Transcription failed:', error);
      } finally {
        setIsTranscribing(false);
      }
    }
  };

  const formatRecordingTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const playAudio = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play();
    }
  };

  const InputComponent = multiline ? Textarea : Input;

  return (
    <div className="relative space-y-2">
      <div className="relative">
        <InputComponent
          ref={inputRef as any}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={cn(
            "pr-20", // Space for voice button
            spellingIssues.length > 0 && enableSpellCheck && "border-yellow-400 focus:border-yellow-500",
            className
          )}
          rows={multiline ? rows : undefined}
        />
        
        {/* Voice Notes Button */}
        {enableVoiceNotes && (
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
            {isRecording ? (
              <Button
                size="sm"
                variant="destructive"
                onClick={stopRecording}
                className="h-8 w-8 p-0"
              >
                <MicOff className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={startRecording}
                className="h-8 w-8 p-0"
                title="Voice note"
              >
                <Mic className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Recording Status */}
      {isRecording && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <div className="h-2 w-2 bg-red-600 rounded-full animate-pulse" />
          <span>Recording: {formatRecordingTime(recordingTime)}</span>
        </div>
      )}

      {/* Transcription Status */}
      {isTranscribing && (
        <div className="flex items-center gap-2 text-sm text-blue-600">
          <Sparkles className="h-4 w-4 animate-spin" />
          <span>Converting speech to text...</span>
        </div>
      )}

      {/* Audio Playback */}
      {audioUrl && transcription && (
        <div className="p-3 bg-muted/20 rounded-lg border border-border/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Voice Note</span>
            <Button
              size="sm"
              variant="outline"
              onClick={playAudio}
              className="h-6 px-2"
            >
              <Play className="h-3 w-3 mr-1" />
              Play
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">{transcription}</p>
        </div>
      )}

      {/* Spelling Suggestions */}
      {enableSpellCheck && showSuggestions && currentSuggestions.length > 0 && (
        <Popover open={showSuggestions} onOpenChange={setShowSuggestions}>
          <PopoverTrigger asChild>
            <div className="invisible" />
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4" />
                <span>Spelling suggestions:</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {currentSuggestions.map((suggestion, index) => (
                  <Button
                    key={index}
                    size="sm"
                    variant="outline"
                    onClick={() => applySuggestion(suggestion)}
                    className="h-6 px-2 text-xs"
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Status Indicators */}
      <div className="flex items-center gap-2">
        {enableSpellCheck && (
          <div className="flex items-center gap-1">
            {spellingIssues.length > 0 ? (
              <>
                <AlertCircle className="h-3 w-3 text-yellow-500" />
                <span className="text-xs text-yellow-600">
                  {spellingIssues.length} spelling suggestion(s)
                </span>
              </>
            ) : value.trim() ? (
              <>
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span className="text-xs text-green-600">No spelling issues</span>
              </>
            ) : null}
          </div>
        )}
        
        {enableVoiceNotes && (
          <Badge variant="outline" className="text-xs">
            <Mic className="h-3 w-3 mr-1" />
            Voice enabled
          </Badge>
        )}
      </div>
    </div>
  );
}

// Export a simpler text input with just spell checking
export function SpellCheckInput(props: Omit<SmartInputProps, 'enableVoiceNotes'>) {
  return <SmartInput {...props} enableVoiceNotes={false} />;
}

// Export a voice-only input component
export function VoiceInput(props: Omit<SmartInputProps, 'enableSpellCheck'>) {
  return <SmartInput {...props} enableSpellCheck={false} />;
}

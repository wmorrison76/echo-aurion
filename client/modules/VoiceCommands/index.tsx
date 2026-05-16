import React, { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Mic,
  Volume2,
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingUp,
  Settings,
  Play,
} from "lucide-react";
import { cn } from "@/lib/glass";
import { useI18n } from "@/i18n";
import { ModuleChatButton } from "@/components/echo-ai3/ModuleChatButton";
import { useVoiceCommandsIntegration } from "./integrations/voice-integration";
import { useAppTheme } from "@/lib/theme-utils";
import { responsiveClasses } from "@/lib/responsive-utils";
interface VoiceCommand {
  id: string;
  command: string;
  category: string;
  action: string;
  successRate: number;
  timesUsed: number;
  lastUsed: string;
}
interface AudioGuidance {
  id: string;
  task: string;
  duration: number;
  playCount: number;
  rating: number;
  category: string;
}
interface UsageMetric {
  date: string;
  commands: number;
  accuracy: number;
  avgResponseTime: number;
  errorsFixed: number;
}
interface VoiceProfile {
  name: string;
  language: string;
  accent: string;
  speakingRate: number;
  masterVolume: number;
}
const VOICE_COMMANDS: VoiceCommand[] = [
  {
    id: "1",
    command: "Order prep for table 5",
    category: "Kitchen",
    action: "Sends prep order to kitchen display",
    successRate: 97,
    timesUsed: 142,
    lastUsed: "2024-02-19 18:45",
  },
  {
    id: "2",
    command: "Check reservation list",
    category: "Front of House",
    action: "Displays upcoming reservations",
    successRate: 99,
    timesUsed: 89,
    lastUsed: "2024-02-19 17:30",
  },
  {
    id: "3",
    command: "Modify order for table 3",
    category: "Kitchen",
    action: "Updates order in real-time",
    successRate: 94,
    timesUsed: 67,
    lastUsed: "2024-02-19 18:20",
  },
  {
    id: "4",
    command: "Show staff schedule",
    category: "Management",
    action: "Displays current shift assignments",
    successRate: 98,
    timesUsed: 34,
    lastUsed: "2024-02-19 16:00",
  },
  {
    id: "5",
    command: "Pull inventory report",
    category: "Inventory",
    action: "Generates real-time inventory status",
    successRate: 95,
    timesUsed: 21,
    lastUsed: "2024-02-19 14:30",
  },
];
const AUDIO_GUIDANCE: AudioGuidance[] = [
  {
    id: "1",
    task: "Preparing Crabcakes",
    duration: 3.5,
    playCount: 28,
    rating: 4.8,
    category: "Cooking Instructions",
  },
  {
    id: "2",
    task: "Table Setup Protocol",
    duration: 2.1,
    playCount: 15,
    rating: 4.6,
    category: "Service",
  },
  {
    id: "3",
    task: "Cleaning & Sanitation",
    duration: 4.2,
    playCount: 42,
    rating: 4.7,
    category: "Operations",
  },
  {
    id: "4",
    task: "Dessert Plating Standards",
    duration: 3.8,
    playCount: 19,
    rating: 4.9,
    category: "Plating",
  },
];
const USAGE_METRICS: UsageMetric[] = [
  {
    date: "Mon",
    commands: 34,
    accuracy: 96,
    avgResponseTime: 0.8,
    errorsFixed: 1,
  },
  {
    date: "Tue",
    commands: 42,
    accuracy: 97,
    avgResponseTime: 0.7,
    errorsFixed: 1,
  },
  {
    date: "Wed",
    commands: 38,
    accuracy: 95,
    avgResponseTime: 0.9,
    errorsFixed: 2,
  },
  {
    date: "Thu",
    commands: 51,
    accuracy: 98,
    avgResponseTime: 0.6,
    errorsFixed: 0,
  },
  {
    date: "Fri",
    commands: 67,
    accuracy: 97,
    avgResponseTime: 0.8,
    errorsFixed: 2,
  },
  {
    date: "Sat",
    commands: 89,
    accuracy: 96,
    avgResponseTime: 1.0,
    errorsFixed: 3,
  },
  {
    date: "Sun",
    commands: 54,
    accuracy: 98,
    avgResponseTime: 0.7,
    errorsFixed: 1,
  },
];
export default function VoiceCommandsModule() {
  const { t } = useI18n();
  const { theme, isDark } = useAppTheme();
  const { executeScheduleCommand, executeInventoryCommand } =
    useVoiceCommandsIntegration();
  const [activeTab, setActiveTab] = useState("overview");
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState(""); // Process voice commands when transcript changes useEffect(() => { if (transcript) { // Simple command parsing (would use NLP in production) const lowerTranscript = transcript.toLowerCase(); if (lowerTranscript.includes("schedule")) { executeScheduleCommand({ action:"show", date: new Date().toISOString().split("T")[0] }); } else if (lowerTranscript.includes("inventory") || lowerTranscript.includes("stock")) { executeInventoryCommand({ action:"check" }); } } }, [transcript, executeScheduleCommand, executeInventoryCommand]); const [voiceProfile, setVoiceProfile] = useState<VoiceProfile>({ name:"English (US)", language:"en-US", accent:"American", speakingRate: 1.0, masterVolume: 80, }); const mediaRecorderRef = useRef<MediaRecorder | null>(null); const audioChunksRef = useRef<Blob[]>([]); const totalCommands = VOICE_COMMANDS.reduce((sum, c) => c.timesUsed, 0); const avgSuccessRate = (VOICE_COMMANDS.reduce((sum, c) => sum + c.successRate * c.timesUsed, 0) / totalCommands).toFixed(1); const totalGuidanceViews = AUDIO_GUIDANCE.reduce((sum, g) => sum + g.playCount, 0); const avgGuidanceRating = (AUDIO_GUIDANCE.reduce((sum, g) => sum + g.rating * g.playCount, 0) / totalGuidanceViews).toFixed(1); const handleStartRecording = async () => { try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); const mediaRecorder = new MediaRecorder(stream); mediaRecorderRef.current = mediaRecorder; audioChunksRef.current = []; mediaRecorder.ondataavailable = (event) => { audioChunksRef.current.push(event.data); }; mediaRecorder.onstop = async () => { const audioBlob = new Blob(audioChunksRef.current, { type:"audio/wav" }); // In a real implementation, this would send to Elevenlabs or speech-to-text API setTranscript("Prep order for table 5 (example transcript)"); }; mediaRecorder.start(); setIsRecording(true); } catch (error) { console.error("Microphone access error:", error); } }; const handleStopRecording = () => { if (mediaRecorderRef.current) { mediaRecorderRef.current.stop(); mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop()); setIsRecording(false); } }; const handlePlayGuidance = async (guidance: AudioGuidance) => { try { // In a real implementation, this would use Elevenlabs text-to-speech const response = await fetch("/api/voice-commands/generate-audio", { method:"POST", headers: {"Content-Type":"application/json" }, body: JSON.stringify({ text: `${guidance.task}. Duration: ${guidance.duration} minutes.`, voiceId:"default", language: voiceProfile.language, }), }); if (response.ok) { const data = (await response.json()) as { audioUrl?: string }; if (data.audioUrl) { const audio = new Audio(data.audioUrl); audio.play().catch((e) => console.error("Playback error:", e)); } } } catch (error) { console.error("Audio playback error:", error); } };
  return (
    <div
      className={cn(
        "w-full h-full overflow-y-auto bg-background text-foreground backdrop-blur-sm",
        responsiveClasses({ default: "p-4", md: "p-6", lg: "p-8" }),
        "space-y-6",
      )}
    >
      {" "}
      {/* Header */}{" "}
      <div className="flex items-center justify-between">
        {" "}
        <div>
          {" "}
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            {" "}
            <Mic className="w-8 h-8 text-blue-500" />{" "}
            {t("module.voice-commands.title")}{" "}
          </h1>{" "}
          <p className="text-sm text-foreground/60 mt-1">
            {" "}
            {t("module.voice-commands.description")}{" "}
          </p>{" "}
        </div>{" "}
        <ModuleChatButton
          moduleId="voice-commands"
          moduleName={t("module.voice-commands.title")}
        />{" "}
      </div>{" "}
      {/* Quick Stats */}{" "}
      <div
        className={responsiveClasses({
          default: "grid grid-cols-1 gap-3",
          sm: "grid grid-cols-2 gap-3",
          md: "grid grid-cols-4 gap-4",
        })}
      >
        {" "}
        <Card className="bg-background border-white/10">
          {" "}
          <CardHeader className="pb-2">
            {" "}
            <CardTitle className="text-sm text-foreground/60">
              Total Commands Used
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold text-blue-500">
              {totalCommands}
            </div>{" "}
            <p className="text-xs text-foreground/50 mt-1">This week</p>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card className="bg-background border-white/10">
          {" "}
          <CardHeader className="pb-2">
            {" "}
            <CardTitle className="text-sm text-foreground/60">
              Avg Accuracy
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold text-green-500">
              {avgSuccessRate}%
            </div>{" "}
            <p className="text-xs text-foreground/50 mt-1">Success rate</p>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card className="bg-background border-white/10">
          {" "}
          <CardHeader className="pb-2">
            {" "}
            <CardTitle className="text-sm text-foreground/60">
              Guidance Plays
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold text-purple-500">
              {totalGuidanceViews}
            </div>{" "}
            <p className="text-xs text-foreground/50 mt-1">
              Audio instructions played
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card className="bg-background border-white/10">
          {" "}
          <CardHeader className="pb-2">
            {" "}
            <CardTitle className="text-sm text-foreground/60">
              Guidance Quality
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold text-yellow-500">
              {avgGuidanceRating}⭐
            </div>{" "}
            <p className="text-xs text-foreground/50 mt-1">Avg rating</p>{" "}
          </CardContent>{" "}
        </Card>{" "}
      </div>{" "}
      {/* Tabs */}{" "}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {" "}
        <TabsList className="grid w-full grid-cols-4 bg-background border border-white/10 p-1 rounded-lg">
          {" "}
          <TabsTrigger value="overview">Overview</TabsTrigger>{" "}
          <TabsTrigger value="commands">Commands</TabsTrigger>{" "}
          <TabsTrigger value="guidance">Audio Guidance</TabsTrigger>{" "}
          <TabsTrigger value="settings">Settings</TabsTrigger>{" "}
        </TabsList>{" "}
        {/* Overview */}{" "}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {" "}
          <div className="grid grid-cols-2 gap-4">
            {" "}
            <Card className="bg-background border-white/10">
              {" "}
              <CardHeader>
                {" "}
                <CardTitle>Weekly Usage Trend</CardTitle>{" "}
              </CardHeader>{" "}
              <CardContent className="h-80">
                {" "}
                <ResponsiveContainer width="100%" height="100%">
                  {" "}
                  <LineChart data={USAGE_METRICS}>
                    {" "}
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#ffffff20"
                    />{" "}
                    <XAxis dataKey="date" stroke="#ffffff60" />{" "}
                    <YAxis stroke="#ffffff60" />{" "}
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1a1a1a",
                        border: "1px solid #ffffff20",
                        borderRadius: "8px",
                      }}
                    />{" "}
                    <Legend />{" "}
                    <Line
                      type="monotone"
                      dataKey="commands"
                      stroke="#00b4d8"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />{" "}
                  </LineChart>{" "}
                </ResponsiveContainer>{" "}
              </CardContent>{" "}
            </Card>{" "}
            <Card className="bg-background border-white/10">
              {" "}
              <CardHeader>
                {" "}
                <CardTitle>Accuracy Performance</CardTitle>{" "}
              </CardHeader>{" "}
              <CardContent className="h-80">
                {" "}
                <ResponsiveContainer width="100%" height="100%">
                  {" "}
                  <BarChart data={USAGE_METRICS}>
                    {" "}
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#ffffff20"
                    />{" "}
                    <XAxis dataKey="date" stroke="#ffffff60" />{" "}
                    <YAxis stroke="#ffffff60" domain={[90, 100]} />{" "}
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1a1a1a",
                        border: "1px solid #ffffff20",
                        borderRadius: "8px",
                      }}
                    />{" "}
                    <Legend /> <Bar dataKey="accuracy" fill="#00b4d8" />{" "}
                  </BarChart>{" "}
                </ResponsiveContainer>{" "}
              </CardContent>{" "}
            </Card>{" "}
          </div>{" "}
          {/* Quick Voice Test */}{" "}
          <Card className="bg-background border-white/10">
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>Quick Voice Command Test</CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent className="space-y-4">
              {" "}
              <p className="text-sm text-foreground/70">
                {" "}
                Click the button below to test voice commands. Speak clearly
                after pressing record.{" "}
              </p>{" "}
              <div className="flex gap-3">
                {" "}
                <Button
                  onClick={
                    isRecording ? handleStopRecording : handleStartRecording
                  }
                  className={cn(isRecording && "bg-red-500 hover:bg-red-600")}
                >
                  {" "}
                  <Mic className="w-4 h-4 mr-2" />{" "}
                  {isRecording ? "Stop Recording" : "Start Recording"}{" "}
                </Button>{" "}
              </div>{" "}
              {transcript && (
                <div className="bg-background border border-white/20 rounded-lg p-4">
                  {" "}
                  <p className="text-sm text-foreground/60 mb-2">
                    Recognized Command:
                  </p>{" "}
                  <p className="text-foreground font-semibold">
                    {transcript}
                  </p>{" "}
                </div>
              )}{" "}
            </CardContent>{" "}
          </Card>{" "}
        </TabsContent>{" "}
        {/* Commands */}{" "}
        <TabsContent value="commands" className="space-y-4 mt-4">
          {" "}
          <Card className="bg-background border-white/10">
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>Voice Command Library</CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent className="space-y-3">
              {" "}
              {VOICE_COMMANDS.map((cmd) => (
                <div
                  key={cmd.id}
                  className="border border-white/10 rounded-lg p-4"
                >
                  {" "}
                  <div className="flex justify-between items-start mb-2">
                    {" "}
                    <div className="flex-1">
                      {" "}
                      <h4 className="font-semibold text-foreground">
                        "{cmd.command}"
                      </h4>{" "}
                      <p className="text-xs text-foreground/60 mt-1">
                        {cmd.category}
                      </p>{" "}
                    </div>{" "}
                    <div className="text-right">
                      {" "}
                      <div className="text-lg font-bold text-green-500">
                        {cmd.successRate}%
                      </div>{" "}
                      <p className="text-xs text-foreground/60">Success</p>{" "}
                    </div>{" "}
                  </div>{" "}
                  <p className="text-sm text-foreground/80 mb-3">
                    → {cmd.action}
                  </p>{" "}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {" "}
                    <div className="bg-background rounded p-2">
                      {" "}
                      <p className="text-foreground/60">Times Used</p>{" "}
                      <p className="font-semibold text-foreground">
                        {cmd.timesUsed}
                      </p>{" "}
                    </div>{" "}
                    <div className="bg-background rounded p-2">
                      {" "}
                      <p className="text-foreground/60">Last Used</p>{" "}
                      <p className="font-semibold text-foreground text-xs">
                        {cmd.lastUsed}
                      </p>{" "}
                    </div>{" "}
                  </div>{" "}
                </div>
              ))}{" "}
            </CardContent>{" "}
          </Card>{" "}
        </TabsContent>{" "}
        {/* Audio Guidance */}{" "}
        <TabsContent value="guidance" className="space-y-4 mt-4">
          {" "}
          <Card className="bg-background border-white/10">
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>Audio Guidance Instructions</CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent className="space-y-3">
              {" "}
              {AUDIO_GUIDANCE.map((guidance) => (
                <div
                  key={guidance.id}
                  className="border border-white/10 rounded-lg p-4"
                >
                  {" "}
                  <div className="flex justify-between items-start mb-3">
                    {" "}
                    <div className="flex-1">
                      {" "}
                      <h4 className="font-semibold text-foreground">
                        {guidance.task}
                      </h4>{" "}
                      <p className="text-xs text-foreground/60 mt-1">
                        {guidance.category}
                      </p>{" "}
                    </div>{" "}
                    <div className="text-right">
                      {" "}
                      <div className="text-lg font-bold text-yellow-500">
                        {guidance.rating}⭐
                      </div>{" "}
                    </div>{" "}
                  </div>{" "}
                  <div className="grid grid-cols-3 gap-3 mb-3 text-sm">
                    {" "}
                    <div className="bg-background rounded p-2">
                      {" "}
                      <p className="text-foreground/60">Duration</p>{" "}
                      <p className="font-semibold text-foreground">
                        {guidance.duration}m
                      </p>{" "}
                    </div>{" "}
                    <div className="bg-background rounded p-2">
                      {" "}
                      <p className="text-foreground/60">Played</p>{" "}
                      <p className="font-semibold text-foreground">
                        {guidance.playCount}x
                      </p>{" "}
                    </div>{" "}
                    <Button
                      size="sm"
                      onClick={() => handlePlayGuidance(guidance)}
                      className="h-auto py-2"
                    >
                      {" "}
                      <Play className="w-4 h-4" />{" "}
                    </Button>{" "}
                  </div>{" "}
                </div>
              ))}{" "}
            </CardContent>{" "}
          </Card>{" "}
        </TabsContent>{" "}
        {/* Settings */}{" "}
        <TabsContent value="settings" className="space-y-4 mt-4">
          {" "}
          <Card className="bg-background border-white/10">
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>Voice Profile Settings</CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent className="space-y-4">
              {" "}
              <div>
                {" "}
                <label className="text-sm text-foreground/70 mb-2 block">
                  Voice Language
                </label>{" "}
                <div className="bg-background border border-white/10 rounded px-4 py-2 text-foreground">
                  {" "}
                  {voiceProfile.name}{" "}
                </div>{" "}
              </div>{" "}
              <div>
                {" "}
                <label className="text-sm text-foreground/70 mb-2 block">
                  {" "}
                  Master Volume: {voiceProfile.masterVolume}%{" "}
                </label>{" "}
                <Input
                  type="range"
                  min="0"
                  max="100"
                  value={voiceProfile.masterVolume}
                  onChange={(e) =>
                    setVoiceProfile({
                      ...voiceProfile,
                      masterVolume: parseInt(e.target.value),
                    })
                  }
                  className="w-full"
                />{" "}
              </div>{" "}
              <div>
                {" "}
                <label className="text-sm text-foreground/70 mb-2 block">
                  {" "}
                  Speaking Rate: {voiceProfile.speakingRate}x{" "}
                </label>{" "}
                <Input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={voiceProfile.speakingRate}
                  onChange={(e) =>
                    setVoiceProfile({
                      ...voiceProfile,
                      speakingRate: parseFloat(e.target.value),
                    })
                  }
                  className="w-full"
                />{" "}
              </div>{" "}
              <Button className="w-full">Save Voice Settings</Button>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card className="bg-background border-white/10">
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>Command Training</CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent className="space-y-2">
              {" "}
              <p className="text-sm text-foreground/70">
                Improve command recognition by training custom phrases:
              </p>{" "}
              <Button variant="outline" className="w-full">
                {" "}
                Train Custom Command{" "}
              </Button>{" "}
              <Button variant="outline" className="w-full">
                {" "}
                Clear All Training Data{" "}
              </Button>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </TabsContent>
      </Tabs>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { ParticipantInfo } from "./types";
import { Check, X, Minus, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/glass";
import { realtimeManager } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";
interface Vote {
  pollId: string;
  userId: string;
  userName: string;
  vote: "yes" | "no" | "abstain";
  timestamp: number;
}
interface Poll {
  id: string;
  question: string;
  createdBy: string;
  createdAt: number;
  votes: Map<string, "yes" | "no" | "abstain">;
  isActive: boolean;
}
interface VotingSystemProps {
  sessionId: string;
  userId: string;
  userName: string;
  participants: ParticipantInfo[];
  onVoteSubmitted?: (vote: Vote) => void;
} /** * Voting System * * Features: * - Create yes/no/abstain polls * - Real-time vote counting * - Visual voting results * - Auto-close polls after 5 minutes * - Broadcast voting events * - Shows participant avatars with votes */
export const VotingSystem: React.FC<VotingSystemProps> = ({
  sessionId,
  userId,
  userName,
  participants,
  onVoteSubmitted,
}) => {
  const [polls, setPolls] = useState<Map<string, Poll>>(new Map());
  const [newQuestion, setNewQuestion] = useState("");
  const [userVotes, setUserVotes] = useState<Map<string, string>>(new Map());
  const [showCreateForm, setShowCreateForm] = useState(false); // Subscribe to new polls useEffect(() => { const unsubscribe = realtimeManager.subscribe( sessionId,"poll-created", (payload: Omit<Poll,"votes">) => { setPolls((prev) => { const updated = new Map(prev); updated.set(payload.id, { ...payload, votes: new Map(), }); return updated; }); } ); return () => unsubscribe(); }, [sessionId]); // Subscribe to votes useEffect(() => { const unsubscribe = realtimeManager.subscribe( sessionId,"vote-submitted", (payload: Vote) => { setPolls((prev) => { const updated = new Map(prev); const poll = updated.get(payload.pollId); if (poll) { const newVotes = new Map(poll.votes); newVotes.set(payload.userId, payload.vote); updated.set(payload.pollId, { ...poll, votes: newVotes }); } return updated; }); if (payload.userId === userId) { setUserVotes((prev) => { const updated = new Map(prev); updated.set(payload.pollId, payload.vote); return updated; }); } } ); return () => unsubscribe(); }, [sessionId, userId]); const createPoll = () => { if (!newQuestion.trim()) return; const poll: Poll = { id: uuidv4(), question: newQuestion, createdBy: userId, createdAt: Date.now(), votes: new Map(), isActive: true, }; setPolls((prev) => { const updated = new Map(prev); updated.set(poll.id, poll); return updated; }); realtimeManager.broadcastEvent(sessionId, { type: "poll-created", userId, sessionId, timestamp: Date.now(), data: { id: poll.id, question: poll.question, createdBy: poll.createdBy, createdAt: poll.createdAt } }); setNewQuestion(""); setShowCreateForm(false); // Auto-close poll after 5 minutes setTimeout(() => { setPolls((prev) => { const updated = new Map(prev); const p = updated.get(poll.id); if (p) p.isActive = false; return updated; }); }, 5 * 60 * 1000); }; const submitVote = (pollId: string, vote:"yes" |"no" |"abstain") => { const voteObj: Vote = { pollId, userId, userName, vote, timestamp: Date.now(), }; realtimeManager.broadcastEvent(sessionId, { type: "vote-submitted", userId, sessionId, timestamp: Date.now(), data: voteObj }); onVoteSubmitted?.(voteObj); }; const activePoll = Array.from(polls.values()).find((p) => p.isActive); if (!activePoll) { return ( <div className="fixed bottom-4 right-24 z-30"> <Button onClick={() => setShowCreateForm(!showCreateForm)} variant="outline" size="sm" className="rounded-lg gap-2" > <BarChart3 size={16} /> Vote </Button> {showCreateForm && ( <div className="absolute bottom-12 right-0 bg-background/95 border border-border/30 rounded-lg p-4 shadow-lg backdrop-blur-sm w-64"> <p className="text-sm font-semibold text-foreground mb-2">Create Poll</p> <Input placeholder="Ask a question..." value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} onKeyPress={(e) => e.key ==="Enter" && createPoll()} className="mb-2 text-sm" /> <div className="flex gap-2"> <Button onClick={createPoll} size="sm" className="text-xs flex-1" disabled={!newQuestion.trim()} > Create </Button> <Button onClick={() => setShowCreateForm(false)} variant="outline" size="sm" className="text-xs" > Cancel </Button> </div> </div> )} </div> ); } const yesCount = Array.from(activePoll.votes.values()).filter( (v) => v ==="yes" ).length; const noCount = Array.from(activePoll.votes.values()).filter( (v) => v ==="no" ).length; const abstainCount = Array.from(activePoll.votes.values()).filter( (v) => v ==="abstain" ).length; const total = yesCount + noCount + abstainCount; const userHasVoted = userVotes.has(activePoll.id); const userVote = userVotes.get(activePoll.id); return ( <div className="fixed bottom-4 right-24 z-30 bg-background/95 border border-border/30 rounded-lg p-4 shadow-lg backdrop-blur-sm max-w-sm"> {/* Question */} <p className="font-semibold text-foreground text-sm mb-3"> {activePoll.question} </p> {/* Vote Buttons */} <div className="grid grid-cols-3 gap-2 mb-3"> <button onClick={() => submitVote(activePoll.id,"yes")} className={cn("p-2 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1", userVote ==="yes" ?"bg-green-600 text-white" :"bg-green-600/20 text-green-600 hover:bg-green-600/30" )} disabled={userHasVoted && userVote !=="yes"} > <Check size={14} /> Yes </button> <button onClick={() => submitVote(activePoll.id,"abstain")} className={cn("p-2 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1", userVote ==="abstain" ?"bg-gray-600 text-white" :"bg-gray-600/20 text-muted-foreground hover:bg-gray-600/30" )} disabled={userHasVoted && userVote !=="abstain"} > <Minus size={14} /> Abstain </button> <button onClick={() => submitVote(activePoll.id,"no")} className={cn("p-2 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1", userVote ==="no" ?"bg-red-600 text-white" :"bg-red-600/20 text-red-600 hover:bg-red-600/30" )} disabled={userHasVoted && userVote !=="no"} > <X size={14} /> No </button> </div> {/* Results Bar */} {total > 0 && ( <div className="space-y-1"> {/* Yes Bar */} <div className="flex items-center gap-2 text-xs"> <span className="text-green-600 font-medium w-10"> {yesCount}/{total} </span> <div className="flex-1 bg-secondary rounded h-1.5 overflow-hidden"> <div className="bg-green-600 h-full transition-all duration-300" style={{ width: `${(yesCount / total) * 100}%` }} /> </div> </div> {/* No Bar */} <div className="flex items-center gap-2 text-xs"> <span className="text-red-600 font-medium w-10"> {noCount}/{total} </span> <div className="flex-1 bg-secondary rounded h-1.5 overflow-hidden"> <div className="bg-red-600 h-full transition-all duration-300" style={{ width: `${(noCount / total) * 100}%` }} /> </div> </div> {/* Abstain Bar */} {abstainCount > 0 && ( <div className="flex items-center gap-2 text-xs"> <span className="text-muted-foreground font-medium w-10"> {abstainCount}/{total} </span> <div className="flex-1 bg-secondary rounded h-1.5 overflow-hidden"> <div className="bg-gray-600 h-full transition-all duration-300" style={{ width: `${(abstainCount / total) * 100}%` }} /> </div> </div> )} </div> )} {/* Vote Status */} <div className="text-xs text-foreground/60 mt-2 text-center"> {userHasVoted ? ( <span className="text-green-600">✓ Your vote: {userVote}</span> ) : ( <span>Vote to participate</span> )} </div> </div> );
};
export default VotingSystem;

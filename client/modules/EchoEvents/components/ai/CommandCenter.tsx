import React, { useState, useCallback } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { SendHorizontal, Loader, CheckCircle, AlertCircle } from "lucide-react";
interface Move {
  id: string;
  commandId: string;
  sequence: number;
  action: string;
  description: string;
  parameters: Record<string, any>;
  status: "pending" | "executing" | "completed" | "failed";
  result?: Record<string, any>;
  error?: string;
}
interface CommandResult {
  command: { id: string; commandText: string; parsedIntent: string };
  moves: Move[];
}
interface AICommandCenterProps {
  userId: string;
  onCommandExecuted?: (result: CommandResult) => void;
  isLoading?: boolean;
}
const statusColors: Record<string, string> = {
  pending: "bg-surface text-gray-800",
  executing: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};
const statusIcons: Record<string, React.ReactNode> = {
  pending: <div className="w-2 h-2 rounded-full bg-muted animate-pulse" />,
  executing: <Loader size={14} className="animate-spin text-primary" />,
  completed: <CheckCircle size={14} className="text-green-600" />,
  failed: <AlertCircle size={14} className="text-red-600" />,
};
export const CommandCenter: React.FC<AICommandCenterProps> = ({
  userId,
  onCommandExecuted,
  isLoading = false,
}) => {
  const [commandInput, setCommandInput] = useState("");
  const [commandResult, setCommandResult] = useState<CommandResult | null>(
    null,
  );
  const [processing, setProcessing] = useState(false);
  const [executingMoveId, setExecutingMoveId] = useState<string | null>(null);
  const handleSendCommand = useCallback(async () => {
    if (!commandInput.trim()) return;
    setProcessing(true);
    try {
      const response = await fetch("/api/v1/ai-command-center/command", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ userId, commandText: commandInput }),
      });
      if (!response.ok) {
        throw new Error(`Failed to process command: ${response.statusText}`);
      }
      const data = await response.json();
      setCommandResult(data.data);
      onCommandExecuted?.(data.data);
      setCommandInput("");
    } catch (error) {
      console.error("Command processing failed:", error);
    } finally {
      setProcessing(false);
    }
  }, [commandInput, userId, onCommandExecuted]);
  const handleExecuteMove = useCallback(
    async (moveId: string) => {
      setExecutingMoveId(moveId);
      try {
        const response = await fetch(
          `/api/v1/ai-command-center/moves/${moveId}/execute`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        if (!response.ok) {
          throw new Error("Failed to execute move");
        }
        if (commandResult) {
          const updatedMoves = commandResult.moves.map((m) =>
            m.id === moveId ? { ...m, status: "completed" as const } : m,
          );
          setCommandResult({ ...commandResult, moves: updatedMoves });
        }
      } catch (error) {
        console.error("Move execution failed:", error);
      } finally {
        setExecutingMoveId(null);
      }
    },
    [commandResult],
  );
  const handleOverrideMove = useCallback(
    async (moveId: string) => {
      const newAction = prompt("Enter new action:");
      if (!newAction) return;
      try {
        const response = await fetch(
          `/api/v1/ai-command-center/moves/${moveId}/override`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify({ newAction }),
          },
        );
        if (!response.ok) {
          throw new Error("Failed to override move");
        }
        const data = await response.json();
        if (commandResult) {
          const updatedMoves = commandResult.moves.map((m) =>
            m.id === moveId ? { ...m, action: data.data.action } : m,
          );
          setCommandResult({ ...commandResult, moves: updatedMoves });
        }
      } catch (error) {
        console.error("Move override failed:", error);
      }
    },
    [commandResult],
  );
  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
      {" "}
      {/* Command Input Section */}{" "}
      <Card className="p-4">
        {" "}
        <h3 className="font-semibold mb-3 text-sm">
          Natural Language Command
        </h3>{" "}
        <p className="text-xs text-muted-foreground mb-3">
          {" "}
          Describe what you want to achieve:"Optimize pricing for next
          event","Find better vendors","Recommend menu items", etc.{" "}
        </p>{" "}
        <div className="flex gap-2">
          {" "}
          <Input
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !processing) {
                handleSendCommand();
              }
            }}
            placeholder="e.g., 'Increase profit margin by optimizing our pricing'"
            className="flex-1"
            disabled={processing || isLoading}
          />{" "}
          <Button
            onClick={handleSendCommand}
            disabled={processing || isLoading || !commandInput.trim()}
            className="flex items-center gap-2"
          >
            {" "}
            {processing ? (
              <>
                {" "}
                <Loader size={16} className="animate-spin" />{" "}
              </>
            ) : (
              <>
                {" "}
                <SendHorizontal size={16} />{" "}
              </>
            )}{" "}
          </Button>{" "}
        </div>{" "}
      </Card>{" "}
      {/* Command Result Section */}{" "}
      {commandResult && (
        <div className="space-y-4">
          {" "}
          {/* Command Summary */}{" "}
          <Card className="p-4 bg-background border-l-4 border-blue-500">
            {" "}
            <div className="flex justify-between items-start mb-2">
              {" "}
              <div>
                {" "}
                <h4 className="font-semibold text-sm">
                  {" "}
                  {commandResult.command.commandText}{" "}
                </h4>{" "}
                <Badge className="mt-2 text-xs">
                  {" "}
                  Intent: {commandResult.command.parsedIntent}{" "}
                </Badge>{" "}
              </div>{" "}
            </div>{" "}
          </Card>{" "}
          {/* Execution Moves Timeline */}{" "}
          <div className="space-y-3">
            {" "}
            <h4 className="font-semibold text-sm">
              Execution Plan (3 Moves)
            </h4>{" "}
            <div className="relative">
              {" "}
              {/* Timeline line */}{" "}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-blue-300"></div>{" "}
              {commandResult.moves.map((move) => (
                <div key={move.id} className="relative pl-16 pb-4">
                  {" "}
                  {/* Timeline dot */}{" "}
                  <div className="absolute left-0 top-2 flex items-center justify-center">
                    {" "}
                    {statusIcons[move.status]}{" "}
                  </div>{" "}
                  <Card className="p-4">
                    {" "}
                    <div className="flex justify-between items-start mb-2">
                      {" "}
                      <div>
                        {" "}
                        <div className="flex items-center gap-2 mb-1">
                          {" "}
                          <span className="font-semibold text-sm">
                            {" "}
                            Step {move.sequence}: {move.action}{" "}
                          </span>{" "}
                          <Badge className={statusColors[move.status]}>
                            {" "}
                            {move.status}{" "}
                          </Badge>{" "}
                        </div>{" "}
                        <p className="text-xs text-muted-foreground">
                          {" "}
                          {move.description}{" "}
                        </p>{" "}
                      </div>{" "}
                    </div>{" "}
                    {move.status === "completed" && move.result && (
                      <div className="mt-3 p-2 bg-green-50 rounded border border-green-200">
                        {" "}
                        <p className="text-xs font-medium text-green-800 mb-1">
                          {" "}
                          Result:{" "}
                        </p>{" "}
                        <ul className="text-xs text-green-700 space-y-0.5">
                          {" "}
                          {Object.entries(move.result).map(([key, value]) => (
                            <li key={key}>
                              {" "}
                              • {key}: {JSON.stringify(value)}{" "}
                            </li>
                          ))}{" "}
                        </ul>{" "}
                      </div>
                    )}{" "}
                    {move.status === "failed" && move.error && (
                      <div className="mt-3 p-2 bg-red-50 rounded border border-red-200">
                        {" "}
                        <p className="text-xs font-medium text-red-800">
                          {" "}
                          Error: {move.error}{" "}
                        </p>{" "}
                      </div>
                    )}{" "}
                    <div className="flex gap-2 mt-3">
                      {" "}
                      {move.status === "pending" && (
                        <Button
                          size="sm"
                          onClick={() => handleExecuteMove(move.id)}
                          disabled={executingMoveId === move.id}
                        >
                          {" "}
                          {executingMoveId === move.id ? (
                            <>
                              {" "}
                              <Loader
                                size={14}
                                className="mr-1 animate-spin"
                              />{" "}
                              Executing{" "}
                            </>
                          ) : (
                            "Execute"
                          )}{" "}
                        </Button>
                      )}{" "}
                      {move.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOverrideMove(move.id)}
                        >
                          {" "}
                          Override{" "}
                        </Button>
                      )}{" "}
                    </div>{" "}
                  </Card>{" "}
                </div>
              ))}{" "}
            </div>{" "}
          </div>{" "}
          {/* Summary Stats */}{" "}
          <Card className="p-4 bg-background grid grid-cols-3 gap-4">
            {" "}
            <div className="text-center">
              {" "}
              <div className="text-2xl font-bold text-primary">
                {" "}
                {commandResult.moves.length}{" "}
              </div>{" "}
              <p className="text-xs text-muted-foreground">Total Moves</p>{" "}
            </div>{" "}
            <div className="text-center">
              {" "}
              <div className="text-2xl font-bold text-green-600">
                {" "}
                {
                  commandResult.moves.filter((m) => m.status === "completed")
                    .length
                }{" "}
              </div>{" "}
              <p className="text-xs text-muted-foreground">Completed</p>{" "}
            </div>{" "}
            <div className="text-center">
              {" "}
              <div className="text-2xl font-bold text-orange-600">
                {" "}
                {
                  commandResult.moves.filter((m) => m.status === "pending")
                    .length
                }{" "}
              </div>{" "}
              <p className="text-xs text-muted-foreground">Pending</p>{" "}
            </div>{" "}
          </Card>{" "}
        </div>
      )}{" "}
      {/* Suggestions */}{" "}
      {!commandResult && (
        <div className="grid grid-cols-2 gap-3">
          {" "}
          <Card
            className="p-3 cursor-pointer hover:bg-blue-100 transition"
            onClick={() => setCommandInput("Optimize pricing for next event")}
          >
            {" "}
            <p className="text-xs font-medium">💰 Optimize Pricing</p>{" "}
          </Card>{" "}
          <Card
            className="p-3 cursor-pointer hover:bg-blue-100 transition"
            onClick={() => setCommandInput("Find better vendors for catering")}
          >
            {" "}
            <p className="text-xs font-medium">🤝 Find Vendors</p>{" "}
          </Card>{" "}
          <Card
            className="p-3 cursor-pointer hover:bg-blue-100 transition"
            onClick={() => setCommandInput("Recommend menu items to promote")}
          >
            {" "}
            <p className="text-xs font-medium">🍽️ Menu Suggestions</p>{" "}
          </Card>{" "}
          <Card
            className="p-3 cursor-pointer hover:bg-blue-100 transition"
            onClick={() =>
              setCommandInput("Create email campaign for attendees")
            }
          >
            {" "}
            <p className="text-xs font-medium">📧 Create Campaign</p>{" "}
          </Card>{" "}
        </div>
      )}{" "}
    </div>
  );
};

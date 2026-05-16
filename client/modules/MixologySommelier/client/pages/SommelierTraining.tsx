import React, { useState, useEffect } from "react";
import { useTheme } from "../components/ThemeProvider";
import { apiService } from "../lib/api";
import {
  BookOpen,
  Eye,
  EyeOff,
  Trophy,
  Check,
  X,
  AlertCircle,
} from "lucide-react";
export const SommelierTraining: React.FC = () => {
  const { theme, isDark } = useTheme();
  const [mode, setMode] = useState<
    "flashcards" | "blind-tasting" | "leaderboard"
  >("flashcards");
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [currentFlashcard, setCurrentFlashcard] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [blindScenario, setBlindScenario] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (mode === "flashcards") {
      loadFlashcards();
    } else if (mode === "blind-tasting") {
      loadBlindTastingScenario();
    } else if (mode === "leaderboard") {
      loadLeaderboard();
    }
  }, [mode]);
  const loadFlashcards = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getTrainingFlashcards("wines");
      setFlashcards(Array.isArray(data) ? data : []);
      setCurrentFlashcard(0);
      setFlipped(false);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to load flashcards";
      console.error("Failed to load flashcards:", err);
      setError(errorMsg);
      setFlashcards([]);
    } finally {
      setLoading(false);
    }
  };
  const loadBlindTastingScenario = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getBlindTastingScenario();
      setBlindScenario(data);
    } catch (err) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : "Failed to load blind tasting scenario";
      console.error("Failed to load blind tasting scenario:", err);
      setError(errorMsg);
      setBlindScenario(null);
    } finally {
      setLoading(false);
    }
  };
  const loadLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getTrainingLeaderboard();
      setLeaderboard(Array.isArray(data) ? data : []);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to load leaderboard";
      console.error("Failed to load leaderboard:", err);
      setError(errorMsg);
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div
      style={{
        backgroundColor: theme.colors.background,
        color: theme.colors.foreground,
        minHeight: "100vh",
        padding: "2.5rem 2rem",
        background: isDark
          ? `linear-gradient(135deg, ${theme.colors.background} 0%, rgba(${parseInt(theme.colors.primary.slice(1, 3), 16)}, ${parseInt(theme.colors.primary.slice(3, 5), 16)}, ${parseInt(theme.colors.primary.slice(5, 7), 16)}, 0.03) 100%)`
          : theme.colors.background,
      }}
    >
      {" "}
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        {" "}
        {/* Header */}{" "}
        <div style={{ marginBottom: "1.75rem" }}>
          {" "}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              marginBottom: "0.5rem",
            }}
          >
            {" "}
            <div
              style={{
                background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`,
                borderRadius: "12px",
                padding: "0.75rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {" "}
              <BookOpen
                size={28}
                style={{ color: theme.colors.background }}
              />{" "}
            </div>{" "}
            <h1
              style={{
                fontSize: "2.5rem",
                fontWeight: "700",
                marginBottom: 0,
                color: theme.colors.foreground,
                letterSpacing: "-0.5px",
              }}
            >
              {" "}
              Sommelier Training{" "}
            </h1>{" "}
          </div>{" "}
          <p
            style={{
              color: theme.text.secondary,
              fontSize: "0.95rem",
              marginTop: "0.25rem",
            }}
          >
            {" "}
            Master wine knowledge with AI-generated flashcards and blind tasting
            scenarios{" "}
          </p>{" "}
        </div>{" "}
        {/* Mode Selector */}{" "}
        <div
          style={{
            display: "flex",
            gap: "1rem",
            marginBottom: "1.5rem",
            flexWrap: "wrap",
          }}
        >
          {" "}
          {(["flashcards", "blind-tasting", "leaderboard"] as const).map(
            (m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  padding: "0.75rem 1.5rem",
                  backgroundColor:
                    mode === m ? theme.colors.primary : theme.colors.card,
                  color:
                    mode === m
                      ? theme.colors.background
                      : theme.colors.foreground,
                  border: `1.5px solid ${mode === m ? theme.colors.primary : theme.colors.border}`,
                  borderRadius: "10px",
                  fontWeight: "600",
                  fontSize: "0.95rem",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                {" "}
                {m === "flashcards"
                  ? "📚 Flashcards"
                  : m === "blind-tasting"
                    ? "👃 Blind Tasting"
                    : "🏆 Leaderboard"}{" "}
              </button>
            ),
          )}{" "}
        </div>{" "}
        {/* Flashcards Mode */}{" "}
        {mode === "flashcards" && (
          <div>
            {" "}
            {error && (
              <div
                style={{
                  backgroundColor: "rgba(220, 38, 38, 0.1)",
                  border: "1px solid #DC2626",
                  borderRadius: "12px",
                  padding: "1rem",
                  marginBottom: "1.5rem",
                  display: "flex",
                  gap: "1rem",
                  alignItems: "flex-start",
                }}
              >
                {" "}
                <AlertCircle
                  size={20}
                  style={{
                    color: "#DC2626",
                    flexShrink: 0,
                    marginTop: "0.125rem",
                  }}
                />{" "}
                <div>
                  {" "}
                  <p
                    style={{
                      fontWeight: "600",
                      margin: "0 0 0.25rem 0",
                      color: "#DC2626",
                      fontSize: "0.9rem",
                    }}
                  >
                    {" "}
                    Failed to load flashcards{" "}
                  </p>{" "}
                  <p
                    style={{
                      color: theme.text.secondary,
                      margin: 0,
                      fontSize: "0.8rem",
                    }}
                  >
                    {" "}
                    {error}{" "}
                  </p>{" "}
                </div>{" "}
              </div>
            )}{" "}
            {loading ? (
              <p style={{ color: theme.text.secondary }}>
                {" "}
                Loading flashcards...{" "}
              </p>
            ) : flashcards.length > 0 ? (
              <>
                {" "}
                {/* Progress */}{" "}
                <div
                  style={{
                    marginBottom: "1.5rem",
                    padding: "0.875rem",
                    backgroundColor: theme.colors.card,
                    borderRadius: "10px",
                  }}
                >
                  {" "}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "0.5rem",
                    }}
                  >
                    {" "}
                    <p
                      style={{
                        margin: 0,
                        fontWeight: "600",
                        fontSize: "0.9rem",
                      }}
                    >
                      {" "}
                      Card {currentFlashcard + 1} of {flashcards.length}{" "}
                    </p>{" "}
                    <p
                      style={{
                        margin: 0,
                        color: theme.text.secondary,
                        fontSize: "0.8rem",
                      }}
                    >
                      {" "}
                      {Math.round(
                        ((currentFlashcard + 1) / flashcards.length) * 100,
                      )}{" "}
                      %{" "}
                    </p>{" "}
                  </div>{" "}
                  <div
                    style={{
                      height: "6px",
                      backgroundColor: theme.colors.muted,
                      borderRadius: "3px",
                      overflow: "hidden",
                    }}
                  >
                    {" "}
                    <div
                      style={{
                        height: "100%",
                        width: `${((currentFlashcard + 1) / flashcards.length) * 100}%`,
                        backgroundColor: theme.colors.primary,
                        transition: "width 0.3s",
                      }}
                    />{" "}
                  </div>{" "}
                </div>{" "}
                {/* Flashcard */}{" "}
                <div
                  onClick={() => setFlipped(!flipped)}
                  style={{
                    backgroundColor: theme.colors.card,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: "12px",
                    padding: "2rem 1.5rem",
                    minHeight: "250px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "all 0.3s",
                    marginBottom: "1.5rem",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  {" "}
                  <p
                    style={{
                      color: theme.text.secondary,
                      fontSize: "0.75rem",
                      fontWeight: "700",
                      marginBottom: "0.75rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {" "}
                    {flipped ? "Answer" : "Question"}{" "}
                  </p>{" "}
                  <h2
                    style={{
                      fontSize: flipped ? "1.25rem" : "1.75rem",
                      fontWeight: "700",
                      margin: "0 0 1rem 0",
                      color: theme.colors.foreground,
                    }}
                  >
                    {" "}
                    {flipped
                      ? flashcards[currentFlashcard]?.answer
                      : flashcards[currentFlashcard]?.question}{" "}
                  </h2>{" "}
                  <div
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {" "}
                    {flipped ? (
                      <EyeOff
                        size={14}
                        style={{ color: theme.colors.primary }}
                      />
                    ) : (
                      <Eye size={14} style={{ color: theme.colors.primary }} />
                    )}{" "}
                    <p
                      style={{
                        color: theme.colors.primary,
                        fontSize: "0.8rem",
                        margin: 0,
                        fontWeight: "600",
                      }}
                    >
                      {" "}
                      Click to {flipped ? "hide" : "reveal"}{" "}
                    </p>{" "}
                  </div>{" "}
                </div>{" "}
                {/* Navigation */}{" "}
                <div
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                    justifyContent: "center",
                  }}
                >
                  {" "}
                  <button
                    onClick={() =>
                      setCurrentFlashcard(Math.max(0, currentFlashcard - 1))
                    }
                    disabled={currentFlashcard === 0}
                    style={{
                      padding: "0.75rem 1.5rem",
                      backgroundColor: theme.colors.card,
                      color: theme.colors.foreground,
                      border: `1.5px solid ${theme.colors.border}`,
                      borderRadius: "10px",
                      fontWeight: "600",
                      cursor: currentFlashcard === 0 ? "default" : "pointer",
                      opacity: currentFlashcard === 0 ? 0.5 : 1,
                      transition: "all 0.2s",
                    }}
                  >
                    {" "}
                    ← Previous{" "}
                  </button>{" "}
                  <button
                    onClick={() =>
                      setCurrentFlashcard(
                        Math.min(flashcards.length - 1, currentFlashcard + 1),
                      )
                    }
                    disabled={currentFlashcard === flashcards.length - 1}
                    style={{
                      padding: "0.75rem 1.5rem",
                      backgroundColor: theme.colors.primary,
                      color: theme.colors.background,
                      border: "none",
                      borderRadius: "10px",
                      fontWeight: "600",
                      cursor:
                        currentFlashcard === flashcards.length - 1
                          ? "default"
                          : "pointer",
                      opacity:
                        currentFlashcard === flashcards.length - 1 ? 0.5 : 1,
                      transition: "all 0.2s",
                    }}
                  >
                    {" "}
                    Next →{" "}
                  </button>{" "}
                </div>{" "}
              </>
            ) : (
              <p style={{ color: theme.text.secondary }}>
                {" "}
                No flashcards available{" "}
              </p>
            )}{" "}
          </div>
        )}{" "}
        {/* Blind Tasting Mode */}{" "}
        {mode === "blind-tasting" && (
          <div>
            {" "}
            {error && (
              <div
                style={{
                  backgroundColor: "rgba(220, 38, 38, 0.1)",
                  border: "1px solid #DC2626",
                  borderRadius: "12px",
                  padding: "1rem",
                  marginBottom: "1.5rem",
                  display: "flex",
                  gap: "1rem",
                  alignItems: "flex-start",
                }}
              >
                {" "}
                <AlertCircle
                  size={20}
                  style={{
                    color: "#DC2626",
                    flexShrink: 0,
                    marginTop: "0.125rem",
                  }}
                />{" "}
                <div>
                  {" "}
                  <p
                    style={{
                      fontWeight: "600",
                      margin: "0 0 0.25rem 0",
                      color: "#DC2626",
                      fontSize: "0.9rem",
                    }}
                  >
                    {" "}
                    Failed to load blind tasting scenario{" "}
                  </p>{" "}
                  <p
                    style={{
                      color: theme.text.secondary,
                      margin: 0,
                      fontSize: "0.8rem",
                    }}
                  >
                    {" "}
                    {error}{" "}
                  </p>{" "}
                </div>{" "}
              </div>
            )}{" "}
            {loading ? (
              <p style={{ color: theme.text.secondary }}>Loading scenario...</p>
            ) : blindScenario ? (
              <div
                style={{
                  backgroundColor: theme.colors.card,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: "12px",
                  padding: "1.5rem",
                }}
              >
                {" "}
                <h2
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: "700",
                    marginBottom: "1rem",
                  }}
                >
                  {" "}
                  Blind Tasting Challenge{" "}
                </h2>{" "}
                <div style={{ marginBottom: "1.5rem" }}>
                  {" "}
                  <p
                    style={{
                      color: theme.text.secondary,
                      marginBottom: "0.5rem",
                      fontSize: "0.8rem",
                      fontWeight: "600",
                    }}
                  >
                    {" "}
                    SCENARIO{" "}
                  </p>{" "}
                  <p
                    style={{
                      fontSize: "0.95rem",
                      lineHeight: "1.5",
                      color: theme.colors.foreground,
                      margin: 0,
                    }}
                  >
                    {" "}
                    {blindScenario.scenario ||
                      "You are presented with a wine. Identify the region, grape variety, and vintage based on the tasting notes provided."}{" "}
                  </p>{" "}
                </div>{" "}
                <div
                  style={{
                    backgroundColor: theme.colors.muted,
                    padding: "1rem",
                    borderRadius: "8px",
                    marginBottom: "1.5rem",
                  }}
                >
                  {" "}
                  <p
                    style={{
                      color: theme.text.secondary,
                      fontSize: "0.75rem",
                      fontWeight: "700",
                      marginBottom: "0.5rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {" "}
                    Tasting Notes{" "}
                  </p>{" "}
                  <p
                    style={{ margin: 0, lineHeight: "1.5", fontSize: "0.9rem" }}
                  >
                    {" "}
                    {blindScenario.tastingNotes ||
                      "Complex aromatic profile with notes of black cherry, plum, and spice. Full-bodied with fine tannins and a long finish."}{" "}
                  </p>{" "}
                </div>{" "}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0.75rem",
                  }}
                >
                  {" "}
                  <div>
                    {" "}
                    <label
                      style={{
                        display: "block",
                        fontWeight: "600",
                        marginBottom: "0.375rem",
                        fontSize: "0.85rem",
                      }}
                    >
                      {" "}
                      Region{" "}
                    </label>{" "}
                    <input
                      type="text"
                      placeholder="e.g., Bordeaux"
                      style={{
                        width: "100%",
                        padding: "0.625rem",
                        backgroundColor: theme.colors.background,
                        color: theme.colors.foreground,
                        border: `1.5px solid ${theme.colors.border}`,
                        borderRadius: "8px",
                        fontSize: "0.85rem",
                      }}
                    />{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <label
                      style={{
                        display: "block",
                        fontWeight: "600",
                        marginBottom: "0.375rem",
                        fontSize: "0.85rem",
                      }}
                    >
                      {" "}
                      Grape Variety{" "}
                    </label>{" "}
                    <input
                      type="text"
                      placeholder="e.g., Cabernet Sauvignon"
                      style={{
                        width: "100%",
                        padding: "0.625rem",
                        backgroundColor: theme.colors.background,
                        color: theme.colors.foreground,
                        border: `1.5px solid ${theme.colors.border}`,
                        borderRadius: "8px",
                        fontSize: "0.85rem",
                      }}
                    />{" "}
                  </div>{" "}
                </div>{" "}
                <button
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    backgroundColor: theme.colors.primary,
                    color: theme.colors.background,
                    border: "none",
                    borderRadius: "10px",
                    fontWeight: "700",
                    marginTop: "1rem",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    fontSize: "0.9rem",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform =
                      "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform =
                      "translateY(0)";
                  }}
                >
                  {" "}
                  Submit Answer{" "}
                </button>{" "}
              </div>
            ) : (
              <p style={{ color: theme.text.secondary }}>
                {" "}
                No scenario available{" "}
              </p>
            )}{" "}
          </div>
        )}{" "}
        {/* Leaderboard Mode */}{" "}
        {mode === "leaderboard" && (
          <div>
            {" "}
            {error && (
              <div
                style={{
                  backgroundColor: "rgba(220, 38, 38, 0.1)",
                  border: "1px solid #DC2626",
                  borderRadius: "12px",
                  padding: "1rem",
                  marginBottom: "1.5rem",
                  display: "flex",
                  gap: "1rem",
                  alignItems: "flex-start",
                }}
              >
                {" "}
                <AlertCircle
                  size={20}
                  style={{
                    color: "#DC2626",
                    flexShrink: 0,
                    marginTop: "0.125rem",
                  }}
                />{" "}
                <div>
                  {" "}
                  <p
                    style={{
                      fontWeight: "600",
                      margin: "0 0 0.25rem 0",
                      color: "#DC2626",
                      fontSize: "0.9rem",
                    }}
                  >
                    {" "}
                    Failed to load leaderboard{" "}
                  </p>{" "}
                  <p
                    style={{
                      color: theme.text.secondary,
                      margin: 0,
                      fontSize: "0.8rem",
                    }}
                  >
                    {" "}
                    {error}{" "}
                  </p>{" "}
                </div>{" "}
              </div>
            )}{" "}
            {loading ? (
              <p style={{ color: theme.text.secondary }}>
                {" "}
                Loading leaderboard...{" "}
              </p>
            ) : (
              <div
                style={{
                  backgroundColor: theme.colors.card,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: "12px",
                  padding: "1.5rem",
                }}
              >
                {" "}
                <h2
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: "700",
                    marginBottom: "1rem",
                  }}
                >
                  {" "}
                  Training Leaderboard{" "}
                </h2>{" "}
                <div style={{ overflowX: "auto" }}>
                  {" "}
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    {" "}
                    <thead>
                      {" "}
                      <tr style={{ backgroundColor: theme.colors.muted }}>
                        {" "}
                        <th
                          style={{
                            padding: "0.75rem",
                            textAlign: "left",
                            fontWeight: "600",
                            fontSize: "0.85rem",
                          }}
                        >
                          {" "}
                          Rank{" "}
                        </th>{" "}
                        <th
                          style={{
                            padding: "0.75rem",
                            textAlign: "left",
                            fontWeight: "600",
                            fontSize: "0.85rem",
                          }}
                        >
                          {" "}
                          Sommelier{" "}
                        </th>{" "}
                        <th
                          style={{
                            padding: "0.75rem",
                            textAlign: "center",
                            fontWeight: "600",
                            fontSize: "0.85rem",
                          }}
                        >
                          {" "}
                          Points{" "}
                        </th>{" "}
                        <th
                          style={{
                            padding: "0.75rem",
                            textAlign: "center",
                            fontWeight: "600",
                            fontSize: "0.85rem",
                          }}
                        >
                          {" "}
                          Streak{" "}
                        </th>{" "}
                      </tr>{" "}
                    </thead>{" "}
                    <tbody>
                      {" "}
                      {leaderboard.map((entry, index) => (
                        <tr
                          key={index}
                          style={{
                            borderTop: `1px solid ${theme.colors.border}`,
                          }}
                        >
                          {" "}
                          <td
                            style={{
                              padding: "0.75rem",
                              fontWeight: "700",
                              color:
                                index < 3
                                  ? theme.colors.primary
                                  : theme.colors.foreground,
                              fontSize: "0.9rem",
                            }}
                          >
                            {" "}
                            {index === 0
                              ? "🥇"
                              : index === 1
                                ? "🥈"
                                : index === 2
                                  ? "🥉"
                                  : `#${index + 1}`}{" "}
                          </td>{" "}
                          <td
                            style={{ padding: "0.75rem", fontSize: "0.9rem" }}
                          >
                            {" "}
                            {entry.name || `Sommelier ${index + 1}`}{" "}
                          </td>{" "}
                          <td
                            style={{
                              padding: "0.75rem",
                              textAlign: "center",
                              fontWeight: "700",
                              fontSize: "0.9rem",
                            }}
                          >
                            {" "}
                            {entry.points ||
                              Math.floor(Math.random() * 5000) + 1000}{" "}
                          </td>{" "}
                          <td
                            style={{
                              padding: "0.75rem",
                              textAlign: "center",
                              fontSize: "0.9rem",
                            }}
                          >
                            {" "}
                            {entry.streak || Math.floor(Math.random() * 50) + 1}
                            {""} days{" "}
                          </td>{" "}
                        </tr>
                      ))}{" "}
                    </tbody>{" "}
                  </table>{" "}
                </div>{" "}
              </div>
            )}{" "}
          </div>
        )}{" "}
      </div>{" "}
    </div>
  );
};
export default SommelierTraining;

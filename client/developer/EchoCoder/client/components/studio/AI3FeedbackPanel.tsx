import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Loader2, Star } from "lucide-react";
import { getAI3AnalyticsService } from "@/services/ai3AnalyticsService";

interface AI3FeedbackPanelProps {
  sessionId: string;
  onSubmitSuccess?: () => void;
  onCancel?: () => void;
}

type RatingValue = 1 | 2 | 3 | 4 | 5 | null;

export const AI3FeedbackPanel: React.FC<AI3FeedbackPanelProps> = ({
  sessionId,
  onSubmitSuccess,
  onCancel,
}) => {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Rating states
  const [accuracyRating, setAccuracyRating] = useState<RatingValue>(null);
  const [codeQualityRating, setCodeQualityRating] = useState<RatingValue>(null);
  const [requirementsRating, setRequirementsRating] = useState<RatingValue>(null);
  const [usefulnessRating, setUsefulnessRating] = useState<RatingValue>(null);
  const [comments, setComments] = useState("");

  const analyticsService = getAI3AnalyticsService();

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate at least one rating was given
      if (
        !accuracyRating &&
        !codeQualityRating &&
        !requirementsRating &&
        !usefulnessRating
      ) {
        setError("Please provide at least one rating");
        setLoading(false);
        return;
      }

      await analyticsService.submitSessionRating(sessionId, {
        accuracy: accuracyRating || undefined,
        codeQuality: codeQualityRating || undefined,
        requirementsClarity: requirementsRating || undefined,
        usefulness: usefulnessRating || undefined,
        comments: comments || undefined,
      });

      setSubmitted(true);
      setTimeout(() => {
        onSubmitSuccess?.();
      }, 1500);
    } catch (err) {
      console.error("Failed to submit feedback:", err);
      setError("Failed to submit feedback. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const RatingStars: React.FC<{
    value: RatingValue;
    onChange: (value: RatingValue) => void;
    disabled?: boolean;
  }> = ({ value, onChange, disabled = false }) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => onChange(value === star ? null : (star as RatingValue))}
            disabled={disabled || loading}
            className="transition-colors hover:opacity-80 disabled:opacity-50"
            type="button"
          >
            <Star
              className={`h-5 w-5 ${
                value && star <= value
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground"
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  if (submitted) {
    return (
      <Card className="border-green-500/50 bg-green-50/50">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div>
              <h3 className="font-semibold text-green-900">Feedback Submitted</h3>
              <p className="text-sm text-green-700">
                Thank you! Your feedback helps improve AI³.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5" />
          Session Feedback
        </CardTitle>
        <CardDescription>
          Help us improve by rating this session and sharing your thoughts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="flex gap-2 p-3 rounded border border-destructive bg-destructive/5">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Accuracy Rating */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Did the AI understand your requirements?
          </label>
          <RatingStars value={accuracyRating} onChange={setAccuracyRating} />
          <p className="text-xs text-muted-foreground">
            {accuracyRating
              ? `${accuracyRating === 1 ? "Poorly" : accuracyRating === 5 ? "Perfectly" : "Somewhat"}`
              : "Rate the accuracy"}
          </p>
        </div>

        {/* Code Quality Rating */}
        <div className="space-y-2">
          <label className="text-sm font-medium">How was the code quality?</label>
          <RatingStars value={codeQualityRating} onChange={setCodeQualityRating} />
          <p className="text-xs text-muted-foreground">
            {codeQualityRating
              ? `${codeQualityRating === 1 ? "Poor" : codeQualityRating === 5 ? "Excellent" : "Good"}`
              : "Rate the code quality"}
          </p>
        </div>

        {/* Requirements Clarity Rating */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            How clear were the generated requirements?
          </label>
          <RatingStars value={requirementsRating} onChange={setRequirementsRating} />
          <p className="text-xs text-muted-foreground">
            {requirementsRating
              ? `${requirementsRating === 1 ? "Unclear" : requirementsRating === 5 ? "Very Clear" : "Somewhat Clear"}`
              : "Rate clarity"}
          </p>
        </div>

        {/* Usefulness Rating */}
        <div className="space-y-2">
          <label className="text-sm font-medium">How useful was this session?</label>
          <RatingStars value={usefulnessRating} onChange={setUsefulnessRating} />
          <p className="text-xs text-muted-foreground">
            {usefulnessRating
              ? `${usefulnessRating === 1 ? "Not useful" : usefulnessRating === 5 ? "Very useful" : "Somewhat useful"}`
              : "Rate usefulness"}
          </p>
        </div>

        {/* Comments */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Additional Comments (Optional)</label>
          <Textarea
            placeholder="Share any additional thoughts, suggestions, or issues you encountered..."
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            disabled={loading}
            maxLength={500}
            className="resize-none"
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            {comments.length}/500 characters
          </p>
        </div>

        {/* Summary */}
        {(accuracyRating || codeQualityRating || requirementsRating || usefulnessRating) && (
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <p className="text-sm font-medium mb-2">Your Ratings</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {accuracyRating && (
                  <Badge variant="secondary">Accuracy: {accuracyRating}/5</Badge>
                )}
                {codeQualityRating && (
                  <Badge variant="secondary">Code: {codeQualityRating}/5</Badge>
                )}
                {requirementsRating && (
                  <Badge variant="secondary">Clarity: {requirementsRating}/5</Badge>
                )}
                {usefulnessRating && (
                  <Badge variant="secondary">Usefulness: {usefulnessRating}/5</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Feedback"
            )}
          </Button>
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AI3FeedbackPanel;

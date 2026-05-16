import React, { useState, useCallback } from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Star, ThumbsUp, ThumbsDown } from "lucide-react";
interface SurveyQuestion {
  id: string;
  text: string;
  type: "rating" | "text" | "multiple-choice";
  options?: string[];
  required: boolean;
}
interface FeedbackPortalProps {
  surveyId: string;
  eventId: string;
  survey?: { title: string; questions: SurveyQuestion[] };
  onSubmitFeedback?: (answers: Record<string, string | number>) => void;
  isLoading?: boolean;
  showUpsellSection?: boolean;
  upsellOffers?: Array<{
    id: string;
    offerType: string;
    description: string;
    originalPrice: number;
    discountedPrice: number;
  }>;
}
export const FeedbackPortal: React.FC<FeedbackPortalProps> = ({
  surveyId,
  eventId,
  survey,
  onSubmitFeedback,
  isLoading = false,
  showUpsellSection = true,
  upsellOffers = [],
}) => {
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [selectedUpsell, setSelectedUpsell] = useState<string | null>(null);
  const handleRatingChange = useCallback(
    (questionId: string, rating: number) => {
      setAnswers({ ...answers, [questionId]: rating });
    },
    [answers],
  );
  const handleTextChange = useCallback(
    (questionId: string, text: string) => {
      setAnswers({ ...answers, [questionId]: text });
    },
    [answers],
  );
  const handleMultipleChoice = useCallback(
    (questionId: string, option: string) => {
      setAnswers({ ...answers, [questionId]: option });
    },
    [answers],
  );
  const handleSubmit = useCallback(() => {
    if (survey) {
      const requiredQuestions = survey.questions.filter((q) => q.required);
      const missingAnswers = requiredQuestions.filter((q) => !answers[q.id]);
      if (missingAnswers.length > 0) {
        alert("Please answer all required questions");
        return;
      }
    }
    onSubmitFeedback?.(answers);
    setSubmitted(true);
  }, [answers, survey, onSubmitFeedback]);
  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        {" "}
        <Card className="p-8 text-center">
          {" "}
          <div className="text-4xl mb-4">✓</div>{" "}
          <h2 className="text-2xl font-bold mb-2">Thank You!</h2>{" "}
          <p className="text-muted-foreground mb-6">
            {" "}
            Your feedback has been submitted successfully.{" "}
          </p>{" "}
          {upsellOffers.length > 0 && !selectedUpsell && (
            <div className="text-sm text-muted-foreground">
              {" "}
              Check out our special offers below!{" "}
            </div>
          )}{" "}
        </Card>{" "}
      </div>
    );
  }
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {" "}
      {/* Survey Section */}{" "}
      {survey && (
        <Card className="p-6">
          {" "}
          <h2 className="text-2xl font-bold mb-2">{survey.title}</h2>{" "}
          <p className="text-muted-foreground text-sm mb-6">
            {" "}
            Your feedback helps us improve. All responses are confidential.{" "}
          </p>{" "}
          <div className="space-y-6">
            {" "}
            {survey.questions.map((question) => (
              <div key={question.id} className="pb-6 border-b last:border-b-0">
                {" "}
                <label className="block font-semibold text-sm mb-3">
                  {" "}
                  {question.text}{" "}
                  {question.required && (
                    <span className="text-red-500"> *</span>
                  )}{" "}
                </label>{" "}
                {question.type === "rating" && (
                  <div className="flex gap-2">
                    {" "}
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        onClick={() => handleRatingChange(question.id, rating)}
                        className={`p-2 rounded transition ${answers[question.id] === rating ? "bg-yellow-400 text-yellow-900" : "bg-surface hover:bg-gray-300"}`}
                      >
                        {" "}
                        <Star
                          size={20}
                          fill={
                            answers[question.id] === rating
                              ? "currentColor"
                              : "none"
                          }
                        />{" "}
                      </button>
                    ))}{" "}
                  </div>
                )}{" "}
                {question.type === "text" && (
                  <textarea
                    value={(answers[question.id] as string) || ""}
                    onChange={(e) =>
                      handleTextChange(question.id, e.target.value)
                    }
                    placeholder="Enter your response"
                    className="w-full p-3 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                  />
                )}{" "}
                {question.type === "multiple-choice" && question.options && (
                  <div className="space-y-2">
                    {" "}
                    {question.options.map((option) => (
                      <label
                        key={option}
                        className="flex items-center gap-3 p-2 rounded hover:bg-surface cursor-pointer"
                      >
                        {" "}
                        <input
                          type="radio"
                          name={question.id}
                          value={option}
                          checked={answers[question.id] === option}
                          onChange={() =>
                            handleMultipleChoice(question.id, option)
                          }
                          className="w-4 h-4"
                        />{" "}
                        <span className="text-sm">{option}</span>{" "}
                      </label>
                    ))}{" "}
                  </div>
                )}{" "}
              </div>
            ))}{" "}
          </div>{" "}
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full mt-6"
          >
            {" "}
            {isLoading ? "Submitting..." : "Submit Feedback"}{" "}
          </Button>{" "}
        </Card>
      )}{" "}
      {/* Upsell Section */}{" "}
      {showUpsellSection && upsellOffers.length > 0 && (
        <div className="space-y-4">
          {" "}
          <h3 className="text-lg font-bold">Special Offers For You</h3>{" "}
          <div className="grid grid-cols-1 gap-4">
            {" "}
            {upsellOffers.map((offer) => (
              <Card
                key={offer.id}
                className={`p-4 cursor-pointer transition border-2 ${selectedUpsell === offer.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-border"}`}
                onClick={() => setSelectedUpsell(offer.id)}
              >
                {" "}
                <div className="flex justify-between items-start mb-2">
                  {" "}
                  <div>
                    {" "}
                    <h4 className="font-semibold text-sm">
                      {" "}
                      {offer.description}{" "}
                    </h4>{" "}
                    <Badge variant="secondary" className="text-xs mt-1">
                      {" "}
                      {offer.offerType}{" "}
                    </Badge>{" "}
                  </div>{" "}
                  <div className="text-right">
                    {" "}
                    <div className="text-sm line-through text-muted-foreground">
                      {" "}
                      ${offer.originalPrice.toFixed(2)}{" "}
                    </div>{" "}
                    <div className="text-lg font-bold text-green-600">
                      {" "}
                      ${offer.discountedPrice.toFixed(2)}{" "}
                    </div>{" "}
                    <div className="text-xs text-muted-foreground mt-1">
                      {" "}
                      Save{""}{" "}
                      {(
                        ((offer.originalPrice - offer.discountedPrice) /
                          offer.originalPrice) *
                        100
                      ).toFixed(0)}{" "}
                      %{" "}
                    </div>{" "}
                  </div>{" "}
                </div>{" "}
                <div className="flex gap-2">
                  {" "}
                  <Button size="sm" variant="outline">
                    {" "}
                    Learn More{" "}
                  </Button>{" "}
                  <Button size="sm" className="flex-1">
                    {" "}
                    Accept Offer{" "}
                  </Button>{" "}
                </div>{" "}
              </Card>
            ))}{" "}
          </div>{" "}
        </div>
      )}{" "}
      {/* Quick Feedback Option */}{" "}
      {!survey && (
        <Card className="p-6 text-center">
          {" "}
          <p className="text-muted-foreground mb-4">How was your event?</p>{" "}
          <div className="flex justify-center gap-4 mb-6">
            {" "}
            <button className="p-3 rounded-lg bg-red-100 hover:bg-red-200 transition">
              {" "}
              <ThumbsDown size={24} className="text-red-600" />{" "}
            </button>{" "}
            <button className="p-3 rounded-lg bg-yellow-100 hover:bg-yellow-200 transition">
              {" "}
              <Star size={24} className="text-yellow-600" />{" "}
            </button>{" "}
            <button className="p-3 rounded-lg bg-green-100 hover:bg-green-200 transition">
              {" "}
              <ThumbsUp size={24} className="text-green-600" />{" "}
            </button>{" "}
          </div>{" "}
          <Button onClick={() => setSubmitted(true)} className="w-full">
            {" "}
            Submit Feedback{" "}
          </Button>{" "}
        </Card>
      )}{" "}
    </div>
  );
};

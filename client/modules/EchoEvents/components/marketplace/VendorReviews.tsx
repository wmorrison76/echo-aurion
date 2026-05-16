import React, { useState, useEffect } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Star, ThumbsUp } from "lucide-react";
interface Review {
  id: string;
  vendorId: string;
  buyerId: string;
  rating: number;
  title: string;
  comment: string;
  verifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: Date;
}
interface VendorReviewsProps {
  vendorId: string;
  onSubmitReview?: (
    review: Omit<Review, "id" | "vendorId" | "createdAt">,
  ) => void;
}
export const VendorReviews: React.FC<VendorReviewsProps> = ({
  vendorId,
  onSubmitReview,
}) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    rating: 5,
    title: "",
    comment: "",
  });
  useEffect(() => {
    fetchReviews();
  }, [vendorId]);
  const fetchReviews = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/v1/marketplace/reviews/${vendorId}?limit=10`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      if (!response.ok) throw new Error("Failed to fetch reviews");
      const data = await response.json();
      setReviews(data.data.reviews || []);
      setAverageRating(data.data.averageRating || 0);
      setTotalReviews(data.data.totalReviews || 0);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
    }
  };
  const handleSubmit = async () => {
    if (!formData.title || !formData.comment) {
      alert("Please fill in all fields");
      return;
    }
    try {
      const response = await fetch("/api/v1/marketplace/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          vendorId,
          buyerId: "current-user-id",
          rating: formData.rating,
          title: formData.title,
          comment: formData.comment,
        }),
      });
      if (!response.ok) throw new Error("Failed to submit review");
      setFormData({ rating: 5, title: "", comment: "" });
      setShowForm(false);
      fetchReviews();
    } catch (error) {
      console.error("Error submitting review:", error);
    }
  };
  const renderStars = (
    rating: number,
    interactive = false,
    onChange?: (r: number) => void,
  ) => {
    return (
      <div className="flex gap-1">
        {" "}
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => interactive && onChange?.(star)}
            className={`${interactive ? "cursor-pointer" : "cursor-default"}`}
          >
            {" "}
            <Star
              size={16}
              fill={star <= rating ? "currentColor" : "none"}
              className={star <= rating ? "text-yellow-400" : "text-gray-300"}
            />{" "}
          </button>
        ))}{" "}
      </div>
    );
  };
  return (
    <div className="space-y-4 p-6 bg-surface">
      {" "}
      {/* Rating Summary */}{" "}
      {!loading && totalReviews > 0 && (
        <Card className="p-4">
          {" "}
          <div className="flex items-center justify-between">
            {" "}
            <div>
              {" "}
              <div className="text-3xl font-bold">
                {" "}
                {averageRating.toFixed(1)}{" "}
              </div>{" "}
              <div className="flex items-center gap-2 mt-1">
                {" "}
                {renderStars(Math.round(averageRating))}{" "}
                <span className="text-sm text-muted-foreground">
                  {" "}
                  Based on {totalReviews} reviews{" "}
                </span>{" "}
              </div>{" "}
            </div>{" "}
            <Button onClick={() => setShowForm(!showForm)}>
              Write Review
            </Button>{" "}
          </div>{" "}
        </Card>
      )}{" "}
      {/* Review Form */}{" "}
      {showForm && (
        <Card className="p-4 bg-background">
          {" "}
          <h3 className="font-semibold mb-4">Share Your Experience</h3>{" "}
          <div className="space-y-4">
            {" "}
            <div>
              {" "}
              <label className="text-sm font-medium mb-2 block">
                Rating
              </label>{" "}
              {renderStars(formData.rating, true, (r) =>
                setFormData({ ...formData, rating: r }),
              )}{" "}
            </div>{" "}
            <div>
              {" "}
              <label className="text-sm font-medium">Review Title</label>{" "}
              <Input
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Summarize your experience"
                className="mt-1"
              />{" "}
            </div>{" "}
            <div>
              {" "}
              <label className="text-sm font-medium">Your Review</label>{" "}
              <textarea
                value={formData.comment}
                onChange={(e) =>
                  setFormData({ ...formData, comment: e.target.value })
                }
                placeholder="Share details of your experience..."
                className="mt-1 w-full p-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
              />{" "}
            </div>{" "}
            <div className="flex gap-2">
              {" "}
              <Button onClick={handleSubmit}>Submit Review</Button>{" "}
              <Button variant="outline" onClick={() => setShowForm(false)}>
                {" "}
                Cancel{" "}
              </Button>{" "}
            </div>{" "}
          </div>{" "}
        </Card>
      )}{" "}
      {/* Reviews List */}{" "}
      {loading ? (
        <Card className="p-8 text-center text-gray-400">
          {" "}
          <p>Loading reviews...</p>{" "}
        </Card>
      ) : reviews.length === 0 ? (
        <Card className="p-8 text-center text-gray-400">
          {" "}
          <p>No reviews yet. Be the first to review!</p>{" "}
        </Card>
      ) : (
        <div className="space-y-3">
          {" "}
          {reviews.map((review) => (
            <Card key={review.id} className="p-4">
              {" "}
              <div className="flex justify-between items-start mb-2">
                {" "}
                <div>
                  {" "}
                  <div className="flex items-center gap-2">
                    {" "}
                    {renderStars(review.rating)}{" "}
                    {review.verifiedPurchase && (
                      <Badge variant="secondary" className="text-xs">
                        {" "}
                        Verified Purchase{" "}
                      </Badge>
                    )}{" "}
                  </div>{" "}
                  <h4 className="font-semibold mt-1">{review.title}</h4>{" "}
                </div>{" "}
              </div>{" "}
              <p className="text-sm text-foreground mb-3">{review.comment}</p>{" "}
              <div className="flex items-center justify-between">
                {" "}
                <span className="text-xs text-muted-foreground">
                  {" "}
                  {new Date(review.createdAt).toLocaleDateString()}{" "}
                </span>{" "}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs"
                  onClick={() => {}}
                >
                  {" "}
                  <ThumbsUp size={14} className="mr-1" /> Helpful (
                  {review.helpfulCount}){" "}
                </Button>{" "}
              </div>{" "}
            </Card>
          ))}{" "}
        </div>
      )}{" "}
    </div>
  );
};

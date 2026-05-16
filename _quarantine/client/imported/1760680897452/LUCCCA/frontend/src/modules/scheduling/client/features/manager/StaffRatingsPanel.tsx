import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmployeeRow, weeklyHours } from "@/lib/schedule";
import { Star, TrendingUp, User } from "lucide-react";

interface Rating {
  empId: string;
  name: string;
  date: string;
  rater: string;
  category: string;
  score: number; // 1-5
  comments?: string;
}

interface EmployeePerformance {
  empId: string;
  name: string;
  avgRating: number;
  totalRatings: number;
  ratings: Rating[];
  attendance: number; // %
  punctuality: number; // %
  reliability: "excellent" | "good" | "fair" | "poor";
}

export default function StaffRatingsPanel({ employees }: { employees: EmployeeRow[] }) {
  const [open, setOpen] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "detail" | "history">("overview");
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingCategory, setRatingCategory] = useState("overall");
  const [ratingComment, setRatingComment] = useState("");

  const performanceData: EmployeePerformance[] = useMemo(() => {
    return employees.map((emp) => {
      const ratings: Rating[] = [
        {
          empId: emp.id,
          name: emp.name,
          date: new Date().toISOString().split("T")[0],
          rater: "Manager",
          category: "punctuality",
          score: 4,
          comments: "Usually on time",
        },
        {
          empId: emp.id,
          name: emp.name,
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          rater: "Manager",
          category: "teamwork",
          score: 5,
          comments: "Great team player",
        },
      ];

      const avgRating = ratings.length > 0 ? ratings.reduce((s, r) => s + r.score, 0) / ratings.length : 0;
      const attendance = 95 + Math.random() * 5;
      const punctuality = 90 + Math.random() * 10;
      const reliability = avgRating >= 4.5 ? "excellent" : avgRating >= 4 ? "good" : avgRating >= 3 ? "fair" : "poor";

      return {
        empId: emp.id,
        name: emp.name,
        avgRating,
        totalRatings: ratings.length,
        ratings,
        attendance,
        punctuality,
        reliability,
      };
    });
  }, [employees]);

  const selectedEmployee = selectedEmpId ? performanceData.find((e) => e.empId === selectedEmpId) : null;

  const StarRating = ({ score, onChange, readOnly = false }: { score: number; onChange?: (n: number) => void; readOnly?: boolean }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={() => !readOnly && onChange?.(n)}
          disabled={readOnly}
          className={`transition-colors ${n <= score ? "text-yellow-500" : "text-gray-300"}`}
        >
          <Star className="w-4 h-4 fill-current" />
        </button>
      ))}
    </div>
  );

  const RatingCard = ({ emp }: { emp: EmployeePerformance }) => (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedEmpId(emp.empId)}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-semibold">{emp.name}</h3>
          <div className="text-sm text-muted-foreground">{emp.reliability}</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">{emp.avgRating.toFixed(1)}</div>
          <StarRating score={Math.round(emp.avgRating)} readOnly />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-muted/30 rounded p-2">
          <div className="text-muted-foreground">Attendance</div>
          <div className="font-semibold">{emp.attendance.toFixed(0)}%</div>
        </div>
        <div className="bg-muted/30 rounded p-2">
          <div className="text-muted-foreground">Punctuality</div>
          <div className="font-semibold">{emp.punctuality.toFixed(0)}%</div>
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Staff Ratings
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[96vw] max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Staff Ratings & Performance</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          {/* Tab Navigation */}
          <div className="flex gap-2 border-b">
            {(["overview", "detail", "history"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === tab
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === "overview" && "Overview"}
                {tab === "detail" && "Details"}
                {tab === "history" && "History"}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {performanceData.sort((a, b) => b.avgRating - a.avgRating).map((emp) => (
                  <RatingCard key={emp.empId} emp={emp} />
                ))}
              </div>
            </div>
          )}

          {/* Detail Tab */}
          {activeTab === "detail" && (
            <div className="grid gap-4">
              {selectedEmployee ? (
                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-semibold">{selectedEmployee.name}</h3>
                        <div className="text-sm text-muted-foreground mt-1">
                          {selectedEmployee.totalRatings} ratings • {selectedEmployee.reliability}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold">{selectedEmployee.avgRating.toFixed(1)}</div>
                        <StarRating score={Math.round(selectedEmployee.avgRating)} readOnly />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <div className="text-xs text-muted-foreground">Attendance Rate</div>
                        <div className="flex items-end gap-2 mt-1">
                          <div className="text-2xl font-bold">{selectedEmployee.attendance.toFixed(0)}%</div>
                          <div className="h-12 bg-green-200 rounded" style={{ width: `${selectedEmployee.attendance * 0.6}px` }} />
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Punctuality</div>
                        <div className="flex items-end gap-2 mt-1">
                          <div className="text-2xl font-bold">{selectedEmployee.punctuality.toFixed(0)}%</div>
                          <div className="h-12 bg-blue-200 rounded" style={{ width: `${selectedEmployee.punctuality * 0.6}px` }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Add New Rating */}
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-3">Add Rating</h3>
                    <div className="grid gap-3">
                      <div>
                        <label className="text-sm font-medium">Category</label>
                        <select
                          className="w-full border rounded px-2 py-1 text-sm"
                          value={ratingCategory}
                          onChange={(e) => setRatingCategory(e.target.value)}
                        >
                          <option value="overall">Overall Performance</option>
                          <option value="punctuality">Punctuality</option>
                          <option value="teamwork">Teamwork</option>
                          <option value="quality">Work Quality</option>
                          <option value="communication">Communication</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Rating</label>
                        <StarRating score={ratingScore} onChange={setRatingScore} />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Comments</label>
                        <textarea
                          className="w-full border rounded px-2 py-1 text-sm"
                          rows={3}
                          value={ratingComment}
                          onChange={(e) => setRatingComment(e.target.value)}
                          placeholder="Add comments (optional)"
                        />
                      </div>
                      <Button
                        onClick={() => {
                          alert(`Rating submitted for ${selectedEmployee.name}`);
                          setRatingComment("");
                          setRatingScore(5);
                        }}
                      >
                        Submit Rating
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Select an employee to view details
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === "history" && selectedEmployee && (
            <div className="space-y-2">
              {selectedEmployee.ratings.map((rating, i) => (
                <div key={i} className="border rounded p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-sm">{rating.category}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {rating.rater} • {new Date(rating.date).toLocaleDateString()}
                      </div>
                      {rating.comments && (
                        <div className="text-xs mt-2 text-foreground">{rating.comments}</div>
                      )}
                    </div>
                    <StarRating score={rating.score} readOnly />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

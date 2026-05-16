import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  Users,
  Plus,
  Filter,
  Search,
  AlertCircle,
  Calendar,
  FileText,
  UserCheck,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Types
interface Qualification {
  positionTitle: string;
  minTier?: number;
  requiredSkills: string[];
  requiredCertifications?: string[];
}
interface JobSharePost {
  id: string;
  outletId: string;
  outletName: string;
  positionTitle: string;
  department: string;
  shiftDate: string;
  shiftStartTime: string;
  shiftEndTime: string;
  reason: string;
  postedBy: string;
  postedByName: string;
  qualifications: Qualification;
  status: "open" | "filled" | "closed" | "cancelled";
  applicants: JobShareApplicant[];
  acceptedEmployee?: {
    employeeId: string;
    employeeName: string;
    acceptedAt: string;
  };
  createdAt: string;
  pafId?: string; // Generated when accepted
}
interface JobShareApplicant {
  employeeId: string;
  employeeName: string;
  currentPosition: string;
  currentTier: number;
  skills: string[];
  certifications: string[];
  qualified: boolean;
  qualificationReasons: string[];
  appliedAt: string;
  status: "pending" | "accepted" | "rejected";
}
interface EmployeeProfile {
  id: string;
  name: string;
  currentPosition: string;
  positionTier: number;
  outletId: string;
  outletName: string;
  skills: string[];
  certifications: string[];
  hourlyRate: number;
}
export default function JobSharePlatform() {
  const [posts, setPosts] = useState<JobSharePost[]>([]);
  const [activeTab, setActiveTab] = useState<
    "all" | "my-posts" | "applications"
  >("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<JobSharePost | null>(null);
  const [applicantDialogOpen, setApplicantDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterOutlet, setFilterOutlet] = useState<string>("all"); // Mock outlets - replace with actual data const outlets = useMemo(() => [ { id:"main", name:"Main Restaurant" }, { id:"bar", name:"Bar & Lounge" }, { id:"cafe", name:"Café" }, { id:"room-service", name:"Room Service" }, { id:"banquet", name:"Banquet Hall" }, ], []); // Mock current user - replace with actual auth const currentUser = { id:"user-1", name:"Manager Smith", outletId:"main", }; // Load job share posts useEffect(() => { loadJobSharePosts(); }, []); const loadJobSharePosts = async () => { try { const response = await fetch("/api/job-sharing/posts"); if (response.ok) { const data = await response.json(); setPosts(data.posts || []); } } catch (error) { console.error("Failed to load job share posts:", error); // For now, use mock data setPosts([ { id:"post-1", outletId:"main", outletName:"Main Restaurant", positionTitle:"Cook 1", department:"Kitchen", shiftDate:"2026-01-15", shiftStartTime:"14:00", shiftEndTime:"22:00", reason:"Scheduled employee called out sick", postedBy: currentUser.id, postedByName: currentUser.name, qualifications: { positionTitle:"Cook 1", minTier: 3, requiredSkills: ["Cooking","Food Prep","Grill"], requiredCertifications: ["Food Handler"], }, status:"open", applicants: [], createdAt: new Date().toISOString(), }, ]); } }; const filteredPosts = useMemo(() => { let filtered = posts; // Filter by tab // NOTE: All employees can see ALL open positions regardless of tab //"My Posts" = only posts I created (manager view) //"My Applications" = posts I've applied to //"All Posts" = ALL open positions (employee + manager view) if (activeTab ==="my-posts") { filtered = filtered.filter((p) => p.postedBy === currentUser.id); } else if (activeTab ==="applications") { filtered = filtered.filter((p) => p.applicants.some((a) => a.employeeId === currentUser.id) ); } // activeTab ==="all" shows ALL posts - no filtering needed (employees see everything) // Filter by outlet if (filterOutlet !=="all") { filtered = filtered.filter((p) => p.outletId === filterOutlet); } // Search if (searchTerm) { const term = searchTerm.toLowerCase(); filtered = filtered.filter( (p) => p.positionTitle.toLowerCase().includes(term) || p.department.toLowerCase().includes(term) || p.outletName.toLowerCase().includes(term) ); } // Sort by date (newest first) return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ); }, [posts, activeTab, filterOutlet, searchTerm, currentUser.id]); const handleCreatePost = async (postData: Partial<JobSharePost>) => { try { const response = await fetch("/api/job-sharing/posts", { method:"POST", headers: {"Content-Type":"application/json" }, body: JSON.stringify({ ...postData, postedBy: currentUser.id, postedByName: currentUser.name, status:"open", applicants: [], }), }); if (response.ok) { await loadJobSharePosts(); setCreateDialogOpen(false); } } catch (error) { console.error("Failed to create job share post:", error); } }; const handleAcceptApplicant = async (postId: string, applicantId: string) => { try { const response = await fetch(`/api/job-sharing/posts/${postId}/accept`, { method:"POST", headers: {"Content-Type":"application/json" }, body: JSON.stringify({ applicantId }), }); if (response.ok) { // This will: // 1. Generate PAF automatically // 2. Update HR system // 3. Add to schedule // 4. Update time clock await loadJobSharePosts(); setApplicantDialogOpen(false); } } catch (error) { console.error("Failed to accept applicant:", error); } }; return ( <div className="w-full h-full flex flex-col bg-background text-foreground overflow-hidden"> {/* Header */} <div className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-10"> <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 gap-3"> <div className="flex-1"> <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2"> <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-primary" /> Job Share Platform </h1> <p className="text-xs sm:text-sm text-muted-foreground mt-1"> View and apply to open positions across the resort </p> </div> {/* Only show"Post Job Share" button for managers (check permissions) */} <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}> <DialogTrigger asChild> <Button size="sm" className="w-full sm:w-auto"> <Plus className="w-4 h-4 mr-2" /> <span className="hidden sm:inline">Post Job Share</span> <span className="sm:hidden">Post Position</span> </Button> </DialogTrigger> <CreateJobShareDialog outlets={outlets} onSubmit={handleCreatePost} /> </Dialog> </div> {/* Filters */} <div className="px-4 pb-4 flex items-center gap-4"> <div className="relative flex-1 max-w-md"> <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" /> <Input placeholder="Search positions, departments..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" /> </div> <Select value={filterOutlet} onValueChange={setFilterOutlet}> <SelectTrigger className="w-[180px]"> <SelectValue placeholder="All Outlets" /> </SelectTrigger> <SelectContent> <SelectItem value="all">All Outlets</SelectItem> {outlets.map((outlet) => ( <SelectItem key={outlet.id} value={outlet.id}> {outlet.name} </SelectItem> ))} </SelectContent> </Select> </div> </div> {/* Tabs */} <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col overflow-hidden"> <div className="px-4 border-b border-border"> <TabsList className="grid w-full grid-cols-3"> <TabsTrigger value="all" className="text-xs sm:text-sm"> Open Positions ({posts.filter((p) => p.status ==="open").length}) </TabsTrigger> <TabsTrigger value="my-posts" className="text-xs sm:text-sm"> My Posts ({posts.filter((p) => p.postedBy === currentUser.id).length}) </TabsTrigger> <TabsTrigger value="applications" className="text-xs sm:text-sm"> My Applications ( {posts.filter((p) => p.applicants.some((a) => a.employeeId === currentUser.id) ).length} ) </TabsTrigger> </TabsList> </div> {/* Content */} <TabsContent value={activeTab} className="flex-1 overflow-auto m-0 p-2 sm:p-4"> {filteredPosts.length === 0 ? ( <div className="flex flex-col items-center justify-center h-full text-center px-4"> <Briefcase className="w-16 h-16 text-muted-foreground mb-4 opacity-50" /> <h3 className="text-lg font-semibold mb-2">No Open Positions</h3> <p className="text-sm text-muted-foreground mb-4"> {activeTab ==="my-posts" ?"You haven't posted any job shares yet" : activeTab ==="applications" ?"You haven't applied to any positions yet" :"No open positions match your filters. Check back soon!"} </p> {activeTab ==="my-posts" && ( <Button onClick={() => setCreateDialogOpen(true)}> <Plus className="w-4 h-4 mr-2" /> Post Your First Job Share </Button> )} </div> ) : ( <div className="grid gap-4"> {filteredPosts.map((post) => ( <JobSharePostCard key={post.id} post={post} currentUserId={currentUser.id} onViewApplicants={(post) => { setSelectedPost(post); setApplicantDialogOpen(true); }} onApply={async (postId) => { // Handle application try { await fetch(`/api/job-sharing/posts/${postId}/apply`, { method:"POST", headers: {"Content-Type":"application/json" }, body: JSON.stringify({ employeeId: currentUser.id }), }); await loadJobSharePosts(); } catch (error) { console.error("Failed to apply:", error); } }} /> ))} </div> )} </TabsContent> </Tabs> {/* View Applicants Dialog */} {selectedPost && ( <Dialog open={applicantDialogOpen} onOpenChange={setApplicantDialogOpen}> <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto"> <DialogHeader> <DialogTitle>Applicants for {selectedPost.positionTitle}</DialogTitle> <DialogDescription> {selectedPost.outletName} • {selectedPost.shiftDate} </DialogDescription> </DialogHeader> <ApplicantsList post={selectedPost} onAccept={handleAcceptApplicant} /> </DialogContent> </Dialog> )} </div> );
} // Job Share Post Card Component
function JobSharePostCard({
  post,
  currentUserId,
  onViewApplicants,
  onApply,
}: {
  post: JobSharePost;
  currentUserId: string;
  onViewApplicants: (post: JobSharePost) => void;
  onApply: (postId: string) => void;
}) {
  const isMyPost = post.postedBy === currentUserId;
  const hasApplied = post.applicants.some(
    (a) => a.employeeId === currentUserId,
  );
  const isFilled = post.status === "filled";
  const isOpen = post.status === "open";
  return (
    <Card className="hover:shadow-md transition-shadow w-full">
      {" "}
      <CardHeader className="p-3 sm:p-6">
        {" "}
        <div className="flex items-start justify-between">
          {" "}
          <div className="flex-1">
            {" "}
            <div className="flex items-center gap-3 mb-2">
              {" "}
              <CardTitle className="text-xl">
                {post.positionTitle}
              </CardTitle>{" "}
              <Badge
                variant={
                  post.status === "open"
                    ? "default"
                    : post.status === "filled"
                      ? "secondary"
                      : "outline"
                }
              >
                {" "}
                {post.status.toUpperCase()}{" "}
              </Badge>{" "}
            </div>{" "}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {" "}
              <div className="flex items-center gap-1">
                {" "}
                <MapPin className="w-4 h-4" /> {post.outletName}{" "}
              </div>{" "}
              <div className="flex items-center gap-1">
                {" "}
                <Briefcase className="w-4 h-4" /> {post.department}{" "}
              </div>{" "}
              <div className="flex items-center gap-1">
                {" "}
                <Calendar className="w-4 h-4" />{" "}
                {new Date(post.shiftDate).toLocaleDateString()}{" "}
              </div>{" "}
              <div className="flex items-center gap-1">
                {" "}
                <Clock className="w-4 h-4" /> {post.shiftStartTime} -{" "}
                {post.shiftEndTime}{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
          {post.applicants.length > 0 && (
            <div className="text-right">
              {" "}
              <div className="text-2xl font-bold text-primary">
                {" "}
                {post.applicants.length}{" "}
              </div>{" "}
              <div className="text-xs text-muted-foreground">
                Applicants
              </div>{" "}
            </div>
          )}{" "}
        </div>{" "}
      </CardHeader>{" "}
      <CardContent>
        {" "}
        <div className="mb-4">
          {" "}
          <p className="text-sm text-muted-foreground mb-2">
            {" "}
            <strong>Reason:</strong> {post.reason}{" "}
          </p>{" "}
          <div className="flex flex-wrap gap-2">
            {" "}
            <Badge variant="outline">
              {" "}
              Min Tier: {post.qualifications.minTier || "Any"}{" "}
            </Badge>{" "}
            {post.qualifications.requiredSkills.map((skill) => (
              <Badge key={skill} variant="secondary">
                {" "}
                {skill}{" "}
              </Badge>
            ))}{" "}
          </div>{" "}
        </div>{" "}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-4 border-t border-border gap-3">
          {" "}
          <div className="text-xs text-muted-foreground">
            {" "}
            Posted by {post.postedByName} •{""}{" "}
            {new Date(post.createdAt).toLocaleString()}{" "}
          </div>{" "}
          <div className="flex gap-2 w-full sm:w-auto">
            {" "}
            {isMyPost ? (
              <>
                {" "}
                {post.applicants.length > 0 && !isFilled && (
                  <Button
                    variant="outline"
                    onClick={() => onViewApplicants(post)}
                    className="flex-1 sm:flex-initial"
                    size="sm"
                  >
                    {" "}
                    <Users className="w-4 h-4 mr-2" /> View (
                    {post.applicants.length}){" "}
                  </Button>
                )}{" "}
              </>
            ) : (
              <>
                {" "}
                {!hasApplied && isOpen && (
                  <Button
                    onClick={() => onApply(post.id)}
                    className="flex-1 sm:flex-initial"
                    size="sm"
                  >
                    {" "}
                    <UserCheck className="w-4 h-4 mr-2" /> Apply Now{" "}
                  </Button>
                )}{" "}
                {hasApplied && (
                  <Badge
                    variant="secondary"
                    className="w-full sm:w-auto justify-center"
                  >
                    {" "}
                    Application Pending{" "}
                  </Badge>
                )}{" "}
                {isFilled && (
                  <Badge
                    variant="outline"
                    className="w-full sm:w-auto justify-center"
                  >
                    {" "}
                    Position Filled{" "}
                  </Badge>
                )}{" "}
              </>
            )}{" "}
          </div>{" "}
        </div>{" "}
      </CardContent>{" "}
    </Card>
  );
} // Create Job Share Dialog Component
function CreateJobShareDialog({
  outlets,
  onSubmit,
}: {
  outlets: Array<{ id: string; name: string }>;
  onSubmit: (data: Partial<JobSharePost>) => void;
}) {
  const [formData, setFormData] = useState({
    outletId: "",
    positionTitle: "",
    department: "",
    shiftDate: "",
    shiftStartTime: "",
    shiftEndTime: "",
    reason: "",
    minTier: "",
    requiredSkills: "",
    requiredCertifications: "",
  });
  const handleSubmit = () => {
    onSubmit({
      outletId: formData.outletId,
      outletName: outlets.find((o) => o.id === formData.outletId)?.name || "",
      positionTitle: formData.positionTitle,
      department: formData.department,
      shiftDate: formData.shiftDate,
      shiftStartTime: formData.shiftStartTime,
      shiftEndTime: formData.shiftEndTime,
      reason: formData.reason,
      qualifications: {
        positionTitle: formData.positionTitle,
        minTier: formData.minTier ? parseInt(formData.minTier) : undefined,
        requiredSkills: formData.requiredSkills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        requiredCertifications: formData.requiredCertifications
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      },
    });
  };
  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
      {" "}
      <DialogHeader>
        {" "}
        <DialogTitle>Post Job Share</DialogTitle>{" "}
        <DialogDescription>
          {" "}
          Create a new job share posting for an open position{" "}
        </DialogDescription>{" "}
      </DialogHeader>{" "}
      <div className="grid gap-4 py-4">
        {" "}
        <div className="grid grid-cols-2 gap-4">
          {" "}
          <div>
            {" "}
            <label className="text-sm font-medium mb-1 block">
              Outlet
            </label>{" "}
            <Select
              value={formData.outletId}
              onValueChange={(v) => setFormData({ ...formData, outletId: v })}
            >
              {" "}
              <SelectTrigger>
                {" "}
                <SelectValue placeholder="Select outlet" />{" "}
              </SelectTrigger>{" "}
              <SelectContent>
                {" "}
                {outlets.map((outlet) => (
                  <SelectItem key={outlet.id} value={outlet.id}>
                    {" "}
                    {outlet.name}{" "}
                  </SelectItem>
                ))}{" "}
              </SelectContent>{" "}
            </Select>{" "}
          </div>{" "}
          <div>
            {" "}
            <label className="text-sm font-medium mb-1 block">
              Position Title
            </label>{" "}
            <Input
              value={formData.positionTitle}
              onChange={(e) =>
                setFormData({ ...formData, positionTitle: e.target.value })
              }
              placeholder="e.g., Cook 1, Server, Host"
            />{" "}
          </div>{" "}
        </div>{" "}
        <div className="grid grid-cols-2 gap-4">
          {" "}
          <div>
            {" "}
            <label className="text-sm font-medium mb-1 block">
              Department
            </label>{" "}
            <Input
              value={formData.department}
              onChange={(e) =>
                setFormData({ ...formData, department: e.target.value })
              }
              placeholder="e.g., Kitchen, FOH"
            />{" "}
          </div>{" "}
          <div>
            {" "}
            <label className="text-sm font-medium mb-1 block">
              Shift Date
            </label>{" "}
            <Input
              type="date"
              value={formData.shiftDate}
              onChange={(e) =>
                setFormData({ ...formData, shiftDate: e.target.value })
              }
            />{" "}
          </div>{" "}
        </div>{" "}
        <div className="grid grid-cols-2 gap-4">
          {" "}
          <div>
            {" "}
            <label className="text-sm font-medium mb-1 block">
              Start Time
            </label>{" "}
            <Input
              type="time"
              value={formData.shiftStartTime}
              onChange={(e) =>
                setFormData({ ...formData, shiftStartTime: e.target.value })
              }
            />{" "}
          </div>{" "}
          <div>
            {" "}
            <label className="text-sm font-medium mb-1 block">
              End Time
            </label>{" "}
            <Input
              type="time"
              value={formData.shiftEndTime}
              onChange={(e) =>
                setFormData({ ...formData, shiftEndTime: e.target.value })
              }
            />{" "}
          </div>{" "}
        </div>{" "}
        <div>
          {" "}
          <label className="text-sm font-medium mb-1 block">Reason</label>{" "}
          <Input
            value={formData.reason}
            onChange={(e) =>
              setFormData({ ...formData, reason: e.target.value })
            }
            placeholder="e.g., Employee called out sick, High volume expected"
          />{" "}
        </div>{" "}
        <div className="border-t border-border pt-4">
          {" "}
          <h4 className="font-semibold mb-3">Qualifications</h4>{" "}
          <div className="grid grid-cols-2 gap-4">
            {" "}
            <div>
              {" "}
              <label className="text-sm font-medium mb-1 block">
                {" "}
                Minimum Position Tier (Optional){" "}
              </label>{" "}
              <Input
                type="number"
                min="1"
                max="5"
                value={formData.minTier}
                onChange={(e) =>
                  setFormData({ ...formData, minTier: e.target.value })
                }
                placeholder="e.g., 3"
              />{" "}
            </div>{" "}
            <div>
              {" "}
              <label className="text-sm font-medium mb-1 block">
                {" "}
                Required Skills (comma-separated){" "}
              </label>{" "}
              <Input
                value={formData.requiredSkills}
                onChange={(e) =>
                  setFormData({ ...formData, requiredSkills: e.target.value })
                }
                placeholder="e.g., Cooking, Food Prep, Grill"
              />{" "}
            </div>{" "}
          </div>{" "}
          <div className="mt-4">
            {" "}
            <label className="text-sm font-medium mb-1 block">
              {" "}
              Required Certifications (comma-separated, optional){" "}
            </label>{" "}
            <Input
              value={formData.requiredCertifications}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  requiredCertifications: e.target.value,
                })
              }
              placeholder="e.g., Food Handler, TIPS"
            />{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
      <DialogFooter>
        {" "}
        <Button variant="outline" onClick={() => {}}>
          {" "}
          Cancel{" "}
        </Button>{" "}
        <Button onClick={handleSubmit}>Post Job Share</Button>{" "}
      </DialogFooter>{" "}
    </DialogContent>
  );
} // Applicants List Component
function ApplicantsList({
  post,
  onAccept,
}: {
  post: JobSharePost;
  onAccept: (postId: string, applicantId: string) => void;
}) {
  return (
    <div className="space-y-4">
      {" "}
      {post.applicants.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {" "}
          No applicants yet{" "}
        </div>
      ) : (
        post.applicants.map((applicant) => (
          <Card key={applicant.employeeId}>
            {" "}
            <CardContent className="p-4">
              {" "}
              <div className="flex items-start justify-between">
                {" "}
                <div className="flex-1">
                  {" "}
                  <div className="flex items-center gap-3 mb-2">
                    {" "}
                    <h4 className="font-semibold">
                      {applicant.employeeName}
                    </h4>{" "}
                    {applicant.qualified ? (
                      <Badge className="bg-green-500">
                        {" "}
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Qualified{" "}
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        {" "}
                        <XCircle className="w-3 h-3 mr-1" /> Not Qualified{" "}
                      </Badge>
                    )}{" "}
                  </div>{" "}
                  <div className="text-sm text-muted-foreground mb-2">
                    {" "}
                    Current Position: {applicant.currentPosition} (Tier{" "}
                    {applicant.currentTier}){" "}
                  </div>{" "}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {" "}
                    {applicant.skills.map((skill) => (
                      <Badge key={skill} variant="outline" className="text-xs">
                        {" "}
                        {skill}{" "}
                      </Badge>
                    ))}{" "}
                  </div>{" "}
                  {applicant.qualificationReasons.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {" "}
                      {applicant.qualified ? (
                        <div className="text-green-600 dark:text-green-400">
                          {" "}
                          ✓ {applicant.qualificationReasons.join(",")}{" "}
                        </div>
                      ) : (
                        <div className="text-red-600 dark:text-red-400">
                          {" "}
                          ✗ {applicant.qualificationReasons.join(",")}{" "}
                        </div>
                      )}{" "}
                    </div>
                  )}{" "}
                  <div className="text-xs text-muted-foreground mt-2">
                    {" "}
                    Applied:{" "}
                    {new Date(applicant.appliedAt).toLocaleString()}{" "}
                  </div>{" "}
                </div>{" "}
                {applicant.qualified && post.status === "open" && (
                  <Button
                    onClick={() => onAccept(post.id, applicant.employeeId)}
                    className="ml-4"
                  >
                    {" "}
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Accept & Generate
                    PAF{" "}
                  </Button>
                )}{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>
        ))
      )}{" "}
    </div>
  );
}

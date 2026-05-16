import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  Calendar,
  UserCheck,
  Search,
  Filter,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Same types as JobSharePlatform
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
  qualifications: any;
  status: "open" | "filled" | "closed" | "cancelled";
  applicants: any[];
  createdAt: string;
} /** * Mobile-optimized view for employees to see and apply to open positions */
export default function JobShareMobile() {
  const [posts, setPosts] = useState<JobSharePost[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterOutlet, setFilterOutlet] = useState<string>("all");
  const [selectedPost, setSelectedPost] = useState<JobSharePost | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [loading, setLoading] = useState(true); // Mock outlets - replace with actual data const outlets = useMemo(() => [ { id:"main", name:"Main Restaurant" }, { id:"bar", name:"Bar & Lounge" }, { id:"cafe", name:"Café" }, { id:"room-service", name:"Room Service" }, { id:"banquet", name:"Banquet Hall" }, ], []); // Mock current user - replace with actual auth const currentUser = { id:"employee-1", name:"Employee Name", }; // Load only OPEN job share posts useEffect(() => { loadOpenPositions(); }, []); const loadOpenPositions = async () => { setLoading(true); try { const response = await fetch("/api/job-sharing/posts?status=open"); if (response.ok) { const data = await response.json(); setPosts(data.posts || []); } } catch (error) { console.error("Failed to load open positions:", error); } finally { setLoading(false); } }; const filteredPosts = useMemo(() => { let filtered = posts.filter((p) => p.status ==="open"); // Only show open positions // Filter by outlet if (filterOutlet !=="all") { filtered = filtered.filter((p) => p.outletId === filterOutlet); } // Search if (searchTerm) { const term = searchTerm.toLowerCase(); filtered = filtered.filter( (p) => p.positionTitle.toLowerCase().includes(term) || p.department.toLowerCase().includes(term) || p.outletName.toLowerCase().includes(term) ); } // Sort by date (newest first) return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ); }, [posts, filterOutlet, searchTerm]); const handleApply = async (postId: string) => { try { const response = await fetch(`/api/job-sharing/posts/${postId}/apply`, { method:"POST", headers: {"Content-Type":"application/json" }, body: JSON.stringify({ employeeId: currentUser.id }), }); if (response.ok) { await loadOpenPositions(); setDetailsOpen(false); // Show success message (you can add a toast here) alert("Application submitted successfully!"); } else { const error = await response.json(); alert(error.error ||"Failed to apply"); } } catch (error) { console.error("Failed to apply:", error); alert("Failed to submit application. Please try again."); } }; if (loading) { return ( <div className="flex items-center justify-center h-full"> <div className="text-center"> <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div> <p className="text-muted-foreground">Loading open positions...</p> </div> </div> ); } return ( <div className="w-full h-full flex flex-col bg-background text-foreground overflow-hidden"> {/* Mobile Header */} <div className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-10"> <div className="p-4"> <h1 className="text-xl font-bold flex items-center gap-2 mb-2"> <Briefcase className="w-5 h-5 text-primary" /> Open Positions </h1> <p className="text-xs text-muted-foreground"> View and apply to available shifts </p> </div> {/* Search and Filter */} <div className="px-4 pb-4 flex flex-col gap-3"> <div className="relative"> <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" /> <Input placeholder="Search positions, departments..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" /> </div> <Select value={filterOutlet} onValueChange={setFilterOutlet}> <SelectTrigger> <SelectValue placeholder="All Outlets" /> </SelectTrigger> <SelectContent> <SelectItem value="all">All Outlets</SelectItem> {outlets.map((outlet) => ( <SelectItem key={outlet.id} value={outlet.id}> {outlet.name} </SelectItem> ))} </SelectContent> </Select> </div> </div> {/* Positions List */} <div className="flex-1 overflow-auto p-4"> {filteredPosts.length === 0 ? ( <div className="flex flex-col items-center justify-center h-full text-center px-4"> <Briefcase className="w-16 h-16 text-muted-foreground mb-4 opacity-50" /> <h3 className="text-lg font-semibold mb-2">No Open Positions</h3> <p className="text-sm text-muted-foreground"> {searchTerm || filterOutlet !=="all" ?"No positions match your filters" :"Check back soon for new opportunities!"} </p> </div> ) : ( <div className="space-y-4"> {filteredPosts.map((post) => { const hasApplied = post.applicants.some((a) => a.employeeId === currentUser.id); return ( <Card key={post.id} className="w-full cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setSelectedPost(post); setDetailsOpen(true); }} > <CardHeader className="p-4"> <div className="flex items-start justify-between mb-2"> <CardTitle className="text-lg">{post.positionTitle}</CardTitle> <Badge variant="default">Open</Badge> </div> <div className="space-y-1.5 text-sm text-muted-foreground"> <div className="flex items-center gap-2"> <MapPin className="w-4 h-4" /> {post.outletName} </div> <div className="flex items-center gap-2"> <Briefcase className="w-4 h-4" /> {post.department} </div> <div className="flex items-center gap-2"> <Calendar className="w-4 h-4" /> {new Date(post.shiftDate).toLocaleDateString()} </div> <div className="flex items-center gap-2"> <Clock className="w-4 h-4" /> {post.shiftStartTime} - {post.shiftEndTime} </div> </div> </CardHeader> <CardContent className="p-4 pt-0"> <p className="text-sm text-muted-foreground mb-3 line-clamp-2"> {post.reason} </p> {hasApplied ? ( <Badge variant="secondary" className="w-full justify-center"> Application Submitted </Badge> ) : ( <Button className="w-full" onClick={(e) => { e.stopPropagation(); handleApply(post.id); }} > <UserCheck className="w-4 h-4 mr-2" /> Apply Now </Button> )} </CardContent> </Card> ); })} </div> )} </div> {/* Position Details Dialog */} {selectedPost && ( <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}> <DialogContent className="max-w-md max-h-[90vh] overflow-auto"> <DialogHeader> <DialogTitle className="text-xl">{selectedPost.positionTitle}</DialogTitle> </DialogHeader> <div className="space-y-4"> <div className="space-y-2 text-sm"> <div className="flex items-center gap-2"> <MapPin className="w-4 h-4 text-muted-foreground" /> <span className="font-medium">Outlet:</span> <span>{selectedPost.outletName}</span> </div> <div className="flex items-center gap-2"> <Briefcase className="w-4 h-4 text-muted-foreground" /> <span className="font-medium">Department:</span> <span>{selectedPost.department}</span> </div> <div className="flex items-center gap-2"> <Calendar className="w-4 h-4 text-muted-foreground" /> <span className="font-medium">Date:</span> <span>{new Date(selectedPost.shiftDate).toLocaleDateString()}</span> </div> <div className="flex items-center gap-2"> <Clock className="w-4 h-4 text-muted-foreground" /> <span className="font-medium">Time:</span> <span>{selectedPost.shiftStartTime} - {selectedPost.shiftEndTime}</span> </div> </div> <div> <h4 className="font-semibold mb-2">Reason</h4> <p className="text-sm text-muted-foreground">{selectedPost.reason}</p> </div> {selectedPost.qualifications && ( <div> <h4 className="font-semibold mb-2">Requirements</h4> <div className="space-y-2"> {selectedPost.qualifications.requiredSkills?.length > 0 && ( <div> <span className="text-xs text-muted-foreground">Skills:</span> <div className="flex flex-wrap gap-2 mt-1"> {selectedPost.qualifications.requiredSkills.map((skill: string) => ( <Badge key={skill} variant="outline" className="text-xs"> {skill} </Badge> ))} </div> </div> )} {selectedPost.qualifications.minTier && ( <div> <span className="text-xs text-muted-foreground"> Minimum Position Tier: {selectedPost.qualifications.minTier} </span> </div> )} </div> </div> )} <div className="pt-4 border-t"> {selectedPost.applicants.some((a) => a.employeeId === currentUser.id) ? ( <Badge variant="secondary" className="w-full justify-center py-2"> Application Submitted </Badge> ) : ( <Button className="w-full" onClick={() => handleApply(selectedPost.id)} > <UserCheck className="w-4 h-4 mr-2" /> Apply to This Position </Button> )} </div> <div className="text-xs text-muted-foreground text-center pt-2"> Posted by {selectedPost.postedByName} </div> </div> </DialogContent> </Dialog> )} </div> );
}

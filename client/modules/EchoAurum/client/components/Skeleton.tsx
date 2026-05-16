import { cn } from "@/lib/utils";
interface SkeletonProps {
  className?: string;
}
export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn("bg-muted rounded-md animate-pulse", className)} />;
}
export function SkeletonText() {
  return <Skeleton className="h-4 w-full" />;
}
export function SkeletonTitle() {
  return <Skeleton className="h-8 w-3/4" />;
}
export function SkeletonCard() {
  return (
    <div className="border border-border rounded-lg p-4 space-y-3">
      {" "}
      <Skeleton className="h-6 w-2/3" /> <Skeleton className="h-4 w-full" />{" "}
      <Skeleton className="h-4 w-full" />{" "}
      <Skeleton className="h-4 w-1/2" />{" "}
    </div>
  );
}
export function SkeletonTable() {
  return (
    <div className="space-y-3">
      {" "}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="grid grid-cols-4 gap-4">
          {" "}
          <Skeleton className="h-10" /> <Skeleton className="h-10" />{" "}
          <Skeleton className="h-10" /> <Skeleton className="h-10" />{" "}
        </div>
      ))}{" "}
    </div>
  );
}
export function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {" "}
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}{" "}
    </div>
  );
}

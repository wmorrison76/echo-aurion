import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("glass-panel p-6", className)}>
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-4 w-[250px]" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[80%]" />
          <Skeleton className="h-4 w-[60%]" />
        </div>
        <div className="flex space-x-2">
          <Skeleton className="h-8 w-[100px]" />
          <Skeleton className="h-8 w-[80px]" />
        </div>
      </div>
    </div>
  )
}

function SkeletonTable({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("glass-panel", className)}>
      <div className="p-4 border-b border-border/50">
        <div className="flex space-x-4">
          <Skeleton className="h-4 w-[150px]" />
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-4 w-[120px]" />
          <Skeleton className="h-4 w-[80px]" />
        </div>
      </div>
      <div className="p-4 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex space-x-4 items-center">
            <Skeleton className="h-3 w-[150px]" />
            <Skeleton className="h-3 w-[100px]" />
            <Skeleton className="h-3 w-[120px]" />
            <Skeleton className="h-3 w-[80px]" />
            <Skeleton className="h-6 w-[60px]" />
          </div>
        ))}
      </div>
    </div>
  )
}

function SkeletonList({ items = 3, className }: { items?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="glass-panel p-4">
          <div className="flex items-start space-x-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-4 w-[60px]" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-[80%]" />
              <div className="flex space-x-2 pt-2">
                <Skeleton className="h-6 w-[80px]" />
                <Skeleton className="h-6 w-[60px]" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function SkeletonStats({ cols = 4, className }: { cols?: number; className?: string }) {
  return (
    <div className={cn(`grid grid-cols-1 md:grid-cols-${cols} gap-4`, className)}>
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className="glass-panel p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-3 w-[100px]" />
              <Skeleton className="h-6 w-[60px]" />
              <Skeleton className="h-2 w-[80px]" />
            </div>
            <Skeleton className="h-6 w-6" />
          </div>
        </div>
      ))}
    </div>
  )
}

function SkeletonForm({ fields = 5, className }: { fields?: number; className?: string }) {
  return (
    <div className={cn("glass-panel p-6 space-y-4", className)}>
      <div className="space-y-2">
        <Skeleton className="h-6 w-[200px]" />
        <Skeleton className="h-3 w-[300px]" />
      </div>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-[120px]" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <div className="flex space-x-2 pt-4">
        <Skeleton className="h-10 w-[100px]" />
        <Skeleton className="h-10 w-[80px]" />
      </div>
    </div>
  )
}

function SkeletonChart({ className }: { className?: string }) {
  return (
    <div className={cn("glass-panel p-6", className)}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-[200px]" />
          <Skeleton className="h-8 w-[100px]" />
        </div>
        <div className="h-64 flex items-end space-x-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton 
              key={i} 
              className="flex-1" 
              style={{ height: `${Math.random() * 200 + 20}px` }}
            />
          ))}
        </div>
        <div className="flex justify-center space-x-4">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-3 w-[60px]" />
          </div>
          <div className="flex items-center space-x-2">
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-3 w-[80px]" />
          </div>
        </div>
      </div>
    </div>
  )
}

function SkeletonAvatar({ className }: { className?: string }) {
  return <Skeleton className={cn("h-10 w-10 rounded-full", className)} />
}

function SkeletonButton({ className }: { className?: string }) {
  return <Skeleton className={cn("h-10 w-[100px] rounded-md", className)} />
}

function SkeletonBadge({ className }: { className?: string }) {
  return <Skeleton className={cn("h-5 w-[60px] rounded-full", className)} />
}

export {
  Skeleton,
  SkeletonCard,
  SkeletonTable,
  SkeletonList,
  SkeletonStats,
  SkeletonForm,
  SkeletonChart,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonBadge,
}

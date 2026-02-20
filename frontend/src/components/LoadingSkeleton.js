import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingSkeleton() {
  return (
    <div data-testid="loading-skeleton" className="min-h-screen bg-[#09090b]">
      {/* Header skeleton */}
      <div className="border-b border-zinc-800/80 py-5 px-4 md:px-8">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-24 bg-zinc-800" />
            <Skeleton className="h-4 w-40 bg-zinc-800" />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-20 bg-zinc-800" />
            <Skeleton className="h-8 w-24 bg-zinc-800" />
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 md:px-8 mt-8">
        {/* Country filter skeleton */}
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-28 shrink-0 bg-zinc-800" />
          ))}
        </div>

        <div className="mt-8 flex flex-col lg:flex-row gap-8">
          {/* Main content skeleton */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-zinc-900/60 border border-zinc-800 rounded-sm p-4 space-y-3">
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-12 bg-zinc-800" />
                  <Skeleton className="h-5 w-16 bg-zinc-800" />
                </div>
                <Skeleton className="h-5 w-full bg-zinc-800" />
                <Skeleton className="h-5 w-3/4 bg-zinc-800" />
                <Skeleton className="h-3 w-full bg-zinc-800" />
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-16 bg-zinc-800" />
                  <Skeleton className="h-3 w-12 bg-zinc-800" />
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar skeleton */}
          <div className="w-full lg:w-80 space-y-6">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-sm p-5 space-y-4">
              <Skeleton className="h-5 w-32 bg-zinc-800" />
              <Skeleton className="h-3 w-full bg-zinc-800" />
              <Skeleton className="h-3 w-full bg-zinc-800" />
              <Skeleton className="h-3 w-full bg-zinc-800" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

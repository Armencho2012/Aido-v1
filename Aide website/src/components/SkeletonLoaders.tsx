import { Card } from '@/components/ui/card';

/**
 * Skeleton loader components for various content types
 * Provides smooth loading states while data is being fetched
 */

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <Card className={`p-6 space-y-4 ${className}`}>
      <div className="space-y-2">
        <div className="h-6 bg-muted rounded-lg w-3/4 animate-pulse" />
        <div className="h-4 bg-muted rounded-lg w-full animate-pulse" />
        <div className="h-4 bg-muted rounded-lg w-5/6 animate-pulse" />
      </div>
      <div className="space-y-2 pt-4">
        <div className="h-4 bg-muted rounded-lg w-full animate-pulse" />
        <div className="h-4 bg-muted rounded-lg w-4/5 animate-pulse" />
      </div>
    </Card>
  );
}

export function SkeletonAnalysis() {
  return (
    <div className="space-y-6 animate-in fade-in-50">
      {/* Summary Section */}
      <div className="space-y-3">
        <div className="h-7 bg-muted rounded-lg w-1/3 animate-pulse" />
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded-lg w-full animate-pulse" />
          <div className="h-4 bg-muted rounded-lg w-full animate-pulse" />
          <div className="h-4 bg-muted rounded-lg w-3/4 animate-pulse" />
        </div>
      </div>

      {/* Key Terms Section */}
      <div className="space-y-3">
        <div className="h-7 bg-muted rounded-lg w-1/3 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-3 border rounded-lg space-y-2">
              <div className="h-5 bg-muted rounded w-2/3 animate-pulse" />
              <div className="h-4 bg-muted rounded w-full animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Quiz Section */}
      <div className="space-y-3">
        <div className="h-7 bg-muted rounded-lg w-1/3 animate-pulse" />
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="p-4 border rounded-lg space-y-3">
              <div className="h-5 bg-muted rounded w-3/4 animate-pulse" />
              <div className="space-y-2">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="h-4 bg-muted rounded w-full animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Knowledge Map Section */}
      <div className="space-y-3">
        <div className="h-7 bg-muted rounded-lg w-1/3 animate-pulse" />
        <div className="h-64 bg-muted rounded-lg w-full animate-pulse" />
      </div>
    </div>
  );
}

export function SkeletonPodcast() {
  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-full bg-muted animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-5 bg-muted rounded-lg w-1/3 animate-pulse" />
          <div className="h-4 bg-muted rounded-lg w-1/2 animate-pulse" />
        </div>
      </div>
    </Card>
  );
}

export function SkeletonQuiz() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="p-6 space-y-4">
          <div className="space-y-2">
            <div className="h-6 bg-muted rounded-lg w-3/4 animate-pulse" />
            <div className="h-4 bg-muted rounded-lg w-1/2 animate-pulse" />
          </div>
          <div className="space-y-2">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="h-10 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

export function SkeletonFlashcards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Card
          key={i}
          className="h-40 bg-gradient-to-br from-muted/50 to-muted/30 rounded-lg animate-pulse"
        />
      ))}
    </div>
  );
}

export function SkeletonLibrary() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <Card key={i} className="p-4 space-y-3">
          <div className="flex gap-4">
            <div className="h-20 w-20 bg-muted rounded-lg animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-muted rounded-lg w-2/3 animate-pulse" />
              <div className="h-4 bg-muted rounded-lg w-full animate-pulse" />
              <div className="h-4 bg-muted rounded-lg w-3/4 animate-pulse" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function SkeletonHeader() {
  return (
    <div className="space-y-4 pb-4 border-b">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          <div className="h-8 bg-muted rounded-lg w-1/3 animate-pulse" />
          <div className="h-4 bg-muted rounded-lg w-2/5 animate-pulse" />
        </div>
        <div className="h-10 w-10 bg-muted rounded-lg animate-pulse" />
      </div>
    </div>
  );
}

export function SkeletonUsageMeter() {
  return (
    <Card className="p-6 space-y-4">
      <div className="h-5 bg-muted rounded-lg w-1/3 animate-pulse" />
      <div className="flex justify-between">
        <div className="h-10 bg-muted rounded-lg w-20 animate-pulse" />
        <div className="h-10 bg-muted rounded-lg w-24 animate-pulse" />
      </div>
    </Card>
  );
}

/**
 * Composable skeleton loading screen for Dashboard
 */
export function SkeletonDashboard() {
  return (
    <div className="space-y-6 pb-20">
      <SkeletonHeader />
      <SkeletonUsageMeter />
      <div className="grid gap-6">
        {[1, 2].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}

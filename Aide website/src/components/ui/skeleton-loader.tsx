import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const LibraryCardSkeleton = () => (
  <Card className="overflow-hidden h-full flex flex-col">
    <div className="p-3 sm:p-4 flex-1 flex flex-col">
      <div className="flex justify-between items-start mb-2 gap-2">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full mb-1" />
      <Skeleton className="h-4 w-4/5 mb-1" />
      <Skeleton className="h-4 w-3/5 mb-4" />
      <div className="flex items-center justify-between mt-auto pt-2 border-t">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded" />
      </div>
    </div>
  </Card>
);

export const LibrarySkeleton = () => (
  <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
    <div className="container max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-6 sm:mb-8">
        <div className="flex items-center gap-2 sm:gap-4">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-8 w-32" />
        </div>
      </div>
      <Skeleton className="h-10 w-full max-w-md mb-4 sm:mb-6" />
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <LibraryCardSkeleton key={i} />
        ))}
      </div>
    </div>
  </div>
);

export const ContentDetailSkeleton = () => (
  <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
    <div className="container max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      
      <Card className="mb-6 sm:mb-8">
        <CardHeader className="pb-3 sm:pb-4">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
            <Skeleton className="h-10 flex-1 min-w-[120px]" />
            <Skeleton className="h-10 flex-1 min-w-[120px]" />
            <Skeleton className="h-10 flex-1 min-w-[120px]" />
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4 sm:mb-6">
        <CardHeader className="pb-3 sm:pb-4">
          <Skeleton className="h-6 w-28" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4 sm:mb-6">
        <CardHeader className="pb-3 sm:pb-4">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  </div>
);

export const ChatSkeleton = () => (
  <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
    <div className="h-screen flex flex-col">
      <div className="flex flex-col gap-3 px-3 sm:px-4 py-3 sm:py-4 border-b border-border">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col p-2 sm:p-4">
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-2 sm:p-4 pt-0">
              <div className="flex-1 space-y-4 mb-4">
                <div className="flex gap-3">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <Skeleton className="h-20 w-3/4 rounded-lg" />
                </div>
                <div className="flex gap-3 justify-end">
                  <Skeleton className="h-12 w-1/2 rounded-lg" />
                  <Skeleton className="w-8 h-8 rounded-full" />
                </div>
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-14 flex-1" />
                <Skeleton className="h-14 w-14" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  </div>
);

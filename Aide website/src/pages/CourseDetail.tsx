import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, GraduationCap, BookOpen, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useContent } from '@/hooks/useContent';
import { ContentDetailSkeleton } from '@/components/ui/skeleton-loader';

const CourseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { content, isLoading, isAuthChecked } = useContent({ id });

  if (!isAuthChecked || isLoading) {
    return <ContentDetailSkeleton />;
  }

  if (!content) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-muted-foreground mb-4 text-sm md:text-base">Course not found</p>
          <Button asChild size="sm">
            <Link to="/library">Back to Library</Link>
          </Button>
        </div>
      </div>
    );
  }

  const courseData = content.course_data || content.analysis_data?.course_data || {};
  const modules =
    courseData.modules || courseData.weeks || courseData.lessons || courseData.units || [];
  const overview =
    courseData.overview || courseData.description || courseData.summary || content.original_text;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="container max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <Button variant="ghost" asChild size="sm" className="w-fit">
              <Link to="/library">
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="text-sm">Back to Library</span>
              </Link>
            </Button>
            <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent truncate max-w-[280px] sm:max-w-none">
              {content.title || 'Course'}
            </h1>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to={`/library/${id}`}>
              <BookOpen className="h-4 w-4 mr-2" />
              Back to Analysis
            </Link>
          </Button>
        </div>

        <Card className="mb-6 border-primary/20 shadow-lg bg-gradient-to-br from-card to-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Course Command Center
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-muted/40">
                <p className="text-xs text-muted-foreground">Readiness</p>
                <p className="text-xl font-semibold">Coming soon</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/40">
                <p className="text-xs text-muted-foreground">Next Sprint</p>
                <p className="text-xl font-semibold">Auto-generated</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/40">
                <p className="text-xs text-muted-foreground">Focus Mode</p>
                <p className="text-xl font-semibold">Adaptive</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 border-accent/20 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-accent text-base sm:text-lg flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Course Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                {overview || 'We are preparing your course overview. Check back soon.'}
              </p>
            </CardContent>
          </Card>
          <Card className="border-primary/20 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-primary text-base sm:text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link to={`/library/${id}/quiz`}>Launch Pro Quiz</Link>
              </Button>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link to={`/library/${id}/flashcards`}>Flashcards Sprint</Link>
              </Button>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link to={`/library/${id}/chat`}>Socratic Tutor</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6 border-secondary/20 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-secondary-foreground text-base sm:text-lg">Syllabus</CardTitle>
          </CardHeader>
          <CardContent>
            {Array.isArray(modules) && modules.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {modules.map((module: any, index: number) => (
                  <div key={index} className="p-4 rounded-xl bg-muted/40">
                    <p className="text-xs text-muted-foreground">Module {index + 1}</p>
                    <p className="font-semibold">{module?.title || module?.name || module?.topic || `Week ${index + 1}`}</p>
                    {module?.summary && (
                      <p className="text-sm text-muted-foreground mt-1">{module.summary}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm sm:text-base text-muted-foreground">
                Course modules are being generated. You can keep studying while we build the full plan.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CourseDetail;

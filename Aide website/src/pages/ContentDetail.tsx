import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, FileText, Layers, Bot, Download, Map, BookOpen, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useContent } from '@/hooks/useContent';
import { ContentDetailSkeleton } from '@/components/ui/skeleton-loader';
import { KnowledgeMap } from '@/components/KnowledgeMap';
import { MissingAssetsBar } from '@/components/MissingAssetsBar';
import { PodcastPlayer } from '@/components/PodcastPlayer';
import { supabase } from '@/integrations/supabase/client';
import { invokeAnalyzeText } from '@/lib/analyzeText';
import jsPDF from 'jspdf';

type Language = 'en' | 'ru' | 'hy' | 'ko';

interface LessonSection {
  title: string;
  summary: string;
}

const uiLabels = {
  en: {
    backToLibrary: 'Back to Library',
    summary: 'Key Summary',
    sections: 'Lesson Sections',
    terms: 'Key Terms',
    studyTools: 'Study Tools',
    quiz: 'Quiz',
    flashcards: 'Flashcards',
    chat: 'Ask AI',
    neuralMap: 'Neural Map',
    exportPdf: 'Export PDF',
    exporting: 'Exporting...',
    notFound: 'Content not found',
    commandCenter: 'Command Center',
    podcast: 'Podcast',
    startCourse: 'Start Course',
    overview: 'Overview',
    coursePreview: 'Course Preview',
    viewCourse: 'Show more',
    coursePreviewEmpty: 'Your course is ready. Jump in for the full experience.'
  },
  ru: {
    backToLibrary: 'Назад в библиотеку',
    summary: 'Ключевое Резюме',
    sections: 'Разделы урока',
    terms: 'Ключевые Термины',
    studyTools: 'Инструменты обучения',
    quiz: 'Тест',
    flashcards: 'Карточки',
    chat: 'Спросить ИИ',
    neuralMap: 'Нейронная карта',
    exportPdf: 'Экспорт PDF',
    exporting: 'Экспортируем...',
    notFound: 'Контент не найден',
    commandCenter: 'Центр управления',
    podcast: 'Подкаст',
    startCourse: 'Начать курс',
    overview: 'Обзор',
    coursePreview: 'Курс',
    viewCourse: 'Показать больше',
    coursePreviewEmpty: 'Ваш курс готов. Откройте полный опыт обучения.'
  },
  hy: {
    backToLibrary: 'Վերադառնալ գրադարան',
    summary: 'Կարևոր ամփոփում',
    sections: 'Դասի բաժիններ',
    terms: 'Հիմնական տերմիններ',
    studyTools: 'Ուսումնական գործիքներ',
    quiz: 'Թեստ',
    flashcards: 'Քարտեր',
    chat: 'Հարցրեք ԱԲ-ին',
    neuralMap: 'Նեյրոնային քարտեզ',
    exportPdf: 'Արտահանել PDF',
    exporting: 'Արտահանվում է...',
    notFound: 'Բովանդակությունը չի գտնվել',
    commandCenter: 'Հրամանների կենտրոն',
    podcast: 'Պոդկաստ',
    startCourse: 'Սկսել դասընթացը',
    overview: 'Ընդամեն',
    coursePreview: 'Դասընթացի նախադիտում',
    viewCourse: 'Տեսնել ավելին',
    coursePreviewEmpty: 'Ձեր դասընթացը պատրաստ է։ Մուտք գործեք ամբողջ փորձառության համար։'
  },
  ko: {
    backToLibrary: '라이브러리로 돌아가기',
    summary: '주요 요약',
    sections: '수업 구성',
    terms: '주요 용어',
    studyTools: '학습 도구',
    quiz: '퀴즈',
    flashcards: '플래시카드',
    chat: 'AI에게 질문',
    neuralMap: '신경망 맵',
    exportPdf: 'PDF 내보내기',
    exporting: '내보내는 중...',
    notFound: '콘텐츠를 찾을 수 없습니다',
    commandCenter: '명령 센터',
    podcast: '팟캐스트',
    startCourse: '코스 시작',
    overview: '개요',
    coursePreview: '코스 미리보기',
    viewCourse: '더 보기',
    coursePreviewEmpty: '코스가 준비되었습니다. 전체 경험을 확인하세요.'
  }
};

const ContentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { content, isLoading, isAuthChecked, refetch } = useContent({ id });
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isGeneratingPodcast, setIsGeneratingPodcast] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleGeneratePodcast = async () => {
    if (!content) return;
    
    setIsGeneratingPodcast(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-podcast', {
        body: {
          prompt: content.original_text,
          language: content.language || 'en',
          contentId: content.id
        }
      });

      if (error) throw error;

      if (data?.podcast_url) {
        // Update local content with podcast URL
        await supabase
          .from('user_content')
          .update({
            podcast_url: data.podcast_url,
            generation_status: {
              ...content.generation_status,
              podcast: true
            }
          })
          .eq('id', content.id);
        
        refetch();
        
        toast({
          title: 'Podcast Generated',
          description: 'Your AI podcast is ready to play!'
        });
      }
    } catch (error) {
      console.error('Podcast generation error:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate podcast.',
        variant: 'destructive'
      });
    } finally {
      setIsGeneratingPodcast(false);
    }
  };

  const handleRegenerateMissing = async (missingAssets: string[]) => {
    if (!content) return;
    
    setIsRegenerating(true);
    try {
      // Handle podcast separately since it uses a different endpoint
      const hasPodcast = missingAssets.includes('podcast');
      const otherAssets = missingAssets.filter(a => a !== 'podcast');
      
      // Generate podcast separately if needed
      if (hasPodcast) {
        handleGeneratePodcast();
      }
      
      // Only call analyze-text if there are other assets to generate
      if (otherAssets.length > 0) {
        const generationOptions = {
          quiz: otherAssets.includes('quiz'),
          flashcards: otherAssets.includes('flashcards'),
          map: otherAssets.includes('map'),
          course: otherAssets.includes('course'),
          podcast: false // Handle podcast separately
        };

        const data = await invokeAnalyzeText({
          text: content.original_text,
          language: content.language || 'en',
          generationOptions
        });

        const existingAnalysis = content.analysis_data || {};

        const mergeQuizQuestions = (existing: any[] = [], incoming: any[] = []) => {
          const seen = new Set(
            existing
              .map(q => (q?.question || '').trim().toLowerCase())
              .filter(Boolean)
          );
          return [
            ...existing,
            ...incoming.filter(q => {
              const key = (q?.question || '').trim().toLowerCase();
              if (!key) return false;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            })
          ];
        };

        const mergeFlashcards = (existing: any[] = [], incoming: any[] = []) => {
          const seen = new Set(
            existing
              .map(fc => `${(fc?.front || '').trim().toLowerCase()}::${(fc?.back || '').trim().toLowerCase()}`)
              .filter(Boolean)
          );
          return [
            ...existing,
            ...incoming.filter(fc => {
              const front = (fc?.front || '').trim().toLowerCase();
              const back = (fc?.back || '').trim().toLowerCase();
              if (!front && !back) return false;
              const key = `${front}::${back}`;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            })
          ];
        };

        const mergeKnowledgeMap = (
          existing: { nodes?: any[]; edges?: any[] } = {},
          incoming: { nodes?: any[]; edges?: any[] } = {}
        ) => {
          const mergedNodes = [...(existing.nodes || [])];
          const mergedEdges = [...(existing.edges || [])];

          const nodeIds = new Set(
            mergedNodes.map((n) => (n?.id || n?.label || '').toString())
          );
          (incoming.nodes || []).forEach((node) => {
            const key = (node?.id || node?.label || '').toString();
            if (!key) return;
            if (nodeIds.has(key)) return;
            nodeIds.add(key);
            mergedNodes.push(node);
          });

          const edgeKeys = new Set(
            mergedEdges.map((e) =>
              [e?.id, e?.source, e?.target, e?.label].filter(Boolean).join('::')
            )
          );
          (incoming.edges || []).forEach((edge) => {
            const key = [edge?.id, edge?.source, edge?.target, edge?.label]
              .filter(Boolean)
              .join('::');
            if (!key) return;
            if (edgeKeys.has(key)) return;
            edgeKeys.add(key);
            mergedEdges.push(edge);
          });

          return {
            ...existing,
            nodes: mergedNodes,
            edges: mergedEdges
          };
        };

        const hasNewQuiz = generationOptions.quiz && Array.isArray(data.quiz_questions) && data.quiz_questions.length > 0;
        const hasNewFlashcards = generationOptions.flashcards && Array.isArray(data.flashcards) && data.flashcards.length > 0;
        const hasNewMap =
          generationOptions.map &&
          data.knowledge_map &&
          Array.isArray(data.knowledge_map.nodes) &&
          data.knowledge_map.nodes.length > 0;

        const updatedAnalysisData = {
          ...existingAnalysis,
          ...(hasNewQuiz && {
            quiz_questions: mergeQuizQuestions(existingAnalysis.quiz_questions, data.quiz_questions)
          }),
          ...(hasNewFlashcards && {
            flashcards: mergeFlashcards(existingAnalysis.flashcards, data.flashcards)
          }),
          ...(hasNewMap && {
            knowledge_map: mergeKnowledgeMap(existingAnalysis.knowledge_map, data.knowledge_map)
          })
        };

        const updatedGenerationStatus = {
          ...content.generation_status,
          quiz: generationOptions.quiz
            ? (hasNewQuiz || content.generation_status?.quiz)
            : content.generation_status?.quiz,
          flashcards: generationOptions.flashcards
            ? (hasNewFlashcards || content.generation_status?.flashcards)
            : content.generation_status?.flashcards,
          map: generationOptions.map
            ? (hasNewMap || content.generation_status?.map)
            : content.generation_status?.map,
          course: generationOptions.course
            ? true
            : content.generation_status?.course
        };

        await supabase
          .from('user_content')
          .update({
            analysis_data: updatedAnalysisData,
            generation_status: updatedGenerationStatus
          })
          .eq('id', content.id);

        refetch();
        
        toast({
          title: 'Assets Generated',
          description: 'Missing content has been generated successfully.'
        });
      }
    } catch (error) {
      console.error('Regeneration error:', error);
      
      // Handle authentication errors
      if (error instanceof Error && (error.message.includes('Invalid') || error.message.includes('token') || error.message.includes('Refresh Token'))) {
        await supabase.auth.signOut().catch(() => {});
        window.location.href = '/auth';
        return;
      }
      
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate missing assets.',
        variant: 'destructive'
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleExportPdf = async () => {
    if (!content || !content.analysis_data) return;

    setExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const maxWidth = pageWidth - 2 * margin;
      let y = 20;

      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      const title = content.title || 'Analysis';
      doc.text(title, margin, y);
      y += 15;

      if (content.analysis_data.three_bullet_summary) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Key Summary', margin, y);
        y += 8;

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        content.analysis_data.three_bullet_summary.forEach((point: string) => {
          const lines = doc.splitTextToSize(`• ${point}`, maxWidth);
          if (y + lines.length * 6 > 280) {
            doc.addPage();
            y = 20;
          }
          doc.text(lines, margin, y);
          y += lines.length * 6 + 3;
        });
        y += 10;
      }

      if (content.analysis_data.key_terms && content.analysis_data.key_terms.length > 0) {
        if (y > 250) {
          doc.addPage();
          y = 20;
        }
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Key Terms', margin, y);
        y += 8;

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        const termsText = content.analysis_data.key_terms.map((t: any) =>
          typeof t === 'string' ? t : t.term
        ).join(', ');
        const termsLines = doc.splitTextToSize(termsText, maxWidth);
        doc.text(termsLines, margin, y);
        y += termsLines.length * 6 + 10;
      }

      if (content.analysis_data.lesson_sections && content.analysis_data.lesson_sections.length > 0) {
        if (y > 250) {
          doc.addPage();
          y = 20;
        }
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Lesson Sections', margin, y);
        y += 10;

        content.analysis_data.lesson_sections.forEach((section: LessonSection) => {
          if (y > 250) {
            doc.addPage();
            y = 20;
          }
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          const sectionTitleLines = doc.splitTextToSize(section.title, maxWidth);
          doc.text(sectionTitleLines, margin, y);
          y += sectionTitleLines.length * 6 + 3;

          doc.setFontSize(11);
          doc.setFont('helvetica', 'normal');
          const summaryLines = doc.splitTextToSize(section.summary, maxWidth);
          if (y + summaryLines.length * 6 > 280) {
            doc.addPage();
            y = 20;
          }
          doc.text(summaryLines, margin, y);
          y += summaryLines.length * 6 + 8;
        });
      }

      if (content.analysis_data.quiz_questions && content.analysis_data.quiz_questions.length > 0) {
        doc.addPage();
        y = 20;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Quiz Questions', margin, y);
        y += 10;

        content.analysis_data.quiz_questions.forEach((q: any, idx: number) => {
          if (y > 240) {
            doc.addPage();
            y = 20;
          }
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          const questionLines = doc.splitTextToSize(`${idx + 1}. ${q.question}`, maxWidth);
          doc.text(questionLines, margin, y);
          y += questionLines.length * 6 + 3;

          doc.setFont('helvetica', 'normal');
          q.options.forEach((opt: string, optIdx: number) => {
            const prefix = optIdx === q.correct_answer_index ? '✓ ' : '  ';
            const optLines = doc.splitTextToSize(`${prefix}${String.fromCharCode(65 + optIdx)}. ${opt}`, maxWidth - 5);
            doc.text(optLines, margin + 5, y);
            y += optLines.length * 5 + 2;
          });
          y += 5;
        });
      }

      if (content.analysis_data.flashcards && content.analysis_data.flashcards.length > 0) {
        doc.addPage();
        y = 20;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Flashcards', margin, y);
        y += 10;

        content.analysis_data.flashcards.forEach((card: any, idx: number) => {
          if (y > 250) {
            doc.addPage();
            y = 20;
          }
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          const frontLines = doc.splitTextToSize(`${idx + 1}. ${card.front}`, maxWidth);
          doc.text(frontLines, margin, y);
          y += frontLines.length * 6 + 2;

          doc.setFont('helvetica', 'normal');
          const backLines = doc.splitTextToSize(`→ ${card.back}`, maxWidth);
          doc.text(backLines, margin + 5, y);
          y += backLines.length * 6 + 8;
        });
      }

      doc.save(`${content.title || 'analysis'}.pdf`);
      toast({
        title: 'Success',
        description: 'PDF exported successfully'
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: 'Error',
        description: 'Failed to export PDF',
        variant: 'destructive'
      });
    } finally {
      setExporting(false);
    }
  };

  // Show skeleton while loading OR while auth is not yet checked
  if (!isAuthChecked || isLoading) {
    return <ContentDetailSkeleton />;
  }

  if (!content) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-muted-foreground mb-4 text-sm md:text-base">Content not found</p>
          <Button asChild size="sm">
            <Link to="/library">Back to Library</Link>
          </Button>
        </div>
      </div>
    );
  }

  const language = (content.language as Language) || 'en';
  const labels = uiLabels[language];
  const analysisData = content.analysis_data;
  const courseData = content.course_data || analysisData?.course_data;
  const previewItems: string[] = (
    courseData?.modules ||
    courseData?.weeks ||
    courseData?.lessons ||
    courseData?.units ||
    []
  )
    .map((item: any) => item?.title || item?.name || item?.topic)
    .filter(Boolean)
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="container max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <Button variant="ghost" asChild size="sm" className="w-fit">
              <Link to="/library">
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="text-sm">{labels.backToLibrary}</span>
              </Link>
            </Button>
            <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent truncate max-w-[280px] sm:max-w-none">
              {content.title || 'Untitled'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleExportPdf} disabled={exporting} variant="outline" size="sm" className="w-fit">
              {exporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              <span className="text-sm">{exporting ? labels.exporting : labels.exportPdf}</span>
            </Button>
          </div>
        </div>

        {/* Command Center - Study Tools Grid (2x2 on mobile, 4 on desktop) */}
        <Card className="mb-6 border-primary/20 shadow-lg bg-gradient-to-br from-card to-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {labels.commandCenter}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Button
                onClick={() => setActiveTab('map')}
                variant={activeTab === 'map' ? 'default' : 'outline'}
                className="h-20 sm:h-24 flex flex-col items-center justify-center gap-2 text-sm"
              >
                <Map className="h-6 w-6 sm:h-8 sm:w-8" />
                <span>{labels.neuralMap}</span>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-20 sm:h-24 flex flex-col items-center justify-center gap-2 text-sm"
              >
                <Link to={`/library/${id}/chat`}>
                  <Bot className="h-6 w-6 sm:h-8 sm:w-8" />
                  <span>{labels.chat}</span>
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-20 sm:h-24 flex flex-col items-center justify-center gap-2 text-sm"
              >
                <Link to={`/library/${id}/flashcards`}>
                  <Layers className="h-6 w-6 sm:h-8 sm:w-8" />
                  <span>{labels.flashcards}</span>
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-20 sm:h-24 flex flex-col items-center justify-center gap-2 text-sm"
              >
                <Link to={`/library/${id}/quiz`}>
                  <FileText className="h-6 w-6 sm:h-8 sm:w-8" />
                  <span>{labels.quiz}</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Missing Assets Bar */}
        <MissingAssetsBar
          generationStatus={content.generation_status}
          podcastUrl={content.podcast_url}
          onRegenerate={handleRegenerateMissing}
          isRegenerating={isRegenerating}
        />

        {/* Tabbed Content Area */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start mb-4 bg-card/50 p-1">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">{labels.overview}</span>
            </TabsTrigger>
            <TabsTrigger value="podcast" className="flex items-center gap-2">
              <Mic className="h-4 w-4" />
              <span className="hidden sm:inline">{labels.podcast}</span>
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center gap-2">
              <Map className="h-4 w-4" />
              <span className="hidden sm:inline">{labels.neuralMap}</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {(courseData || content.generation_status?.course) && (
              <Card className="border-accent/20 shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-accent text-base sm:text-lg">{labels.coursePreview}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {previewItems.length > 0 ? (
                    <ul className="space-y-2 text-sm sm:text-base text-muted-foreground">
                      {previewItems.map((item, index) => (
                        <li key={index} className="flex gap-2">
                          <span className="text-accent font-bold">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm sm:text-base text-muted-foreground">
                      {labels.coursePreviewEmpty}
                    </p>
                  )}
                  <Button asChild variant="outline" size="sm" className="w-fit">
                    <Link to={`/library/course/${id}`}>{labels.viewCourse}</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
            {analysisData?.three_bullet_summary && (
              <Card className="border-primary/20 shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-primary text-base sm:text-lg">{labels.summary}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysisData.three_bullet_summary.map((point: string, index: number) => (
                      <li key={index} className="flex gap-2 text-sm sm:text-base">
                        <span className="text-primary font-bold">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {analysisData?.lesson_sections && analysisData.lesson_sections.length > 0 && (
              <Card className="border-secondary/20 shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-secondary-foreground text-base sm:text-lg">{labels.sections}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {analysisData.lesson_sections.map((section: LessonSection, index: number) => (
                    <div key={index} className="space-y-1">
                      <p className="font-semibold text-base sm:text-lg text-primary">{section.title}</p>
                      <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">{section.summary}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

          </TabsContent>

          {/* Podcast Tab */}
          <TabsContent value="podcast" className="space-y-4">
            <PodcastPlayer
              podcastUrl={content.podcast_url}
              language={language}
              onGenerate={handleGeneratePodcast}
              isGenerating={isGeneratingPodcast}
            />
          </TabsContent>

          {/* Neural Map Tab - Dedicated Full Space */}
          <TabsContent value="map" className="mt-0">
            <Card className="border-primary/20 shadow-lg overflow-hidden">
              <CardHeader className="pb-2 bg-gradient-to-r from-primary/5 to-accent/5">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Map className="h-5 w-5 text-primary" />
                  {labels.neuralMap}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[440px] sm:h-[620px] md:h-[720px] touch-pan-x touch-pan-y">
                  <KnowledgeMap
                    data={analysisData?.knowledge_map}
                    analysisId={content?.id}
                    sourceText={content?.original_text}
                    onNodeClick={(label, description) => {
                      toast({
                        title: label,
                        description: description || 'No additional details'
                      });
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ContentDetail;

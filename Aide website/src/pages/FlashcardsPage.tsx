import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, RotateCcw, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useContent } from '@/hooks/useContent';
import { ContentDetailSkeleton } from '@/components/ui/skeleton-loader';

type Language = 'en' | 'ru' | 'hy' | 'ko';

interface Flashcard {
  front: string;
  back: string;
}

const uiLabels = {
  en: {
    title: 'Flashcards',
    flip: 'Click to flip',
    card: 'Card',
    of: 'of',
    restart: 'Restart',
    noCards: 'No flashcards available',
    backToContent: 'Back to Content'
  },
  ru: {
    title: 'Карточки',
    flip: 'Нажмите, чтобы перевернуть',
    card: 'Карточка',
    of: 'из',
    restart: 'Начать заново',
    noCards: 'Карточки недоступны',
    backToContent: 'Назад к контенту'
  },
  hy: {
    title: 'Քարտեր',
    flip: 'Սեղմեք՝ շրջելու համար',
    card: 'Քարտ',
    of: '/',
    restart: 'Վերսկսել',
    noCards: 'Քարտեր չկան',
    backToContent: 'Վերադառնալ բովանդակությանը'
  },
  ko: {
    title: '플래시카드',
    flip: '클릭하여 뒤집기',
    card: '카드',
    of: '/',
    restart: '다시 시작',
    noCards: '플래시카드가 없습니다',
    backToContent: '콘텐츠로 돌아가기'
  }
};

const FlashcardsPage = () => {
  const { id } = useParams<{ id: string }>();
  const { content, isLoading, isAuthChecked } = useContent({ id });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const flashcards: Flashcard[] = useMemo(() => {
    return (content?.analysis_data?.flashcards || []).filter((card: Flashcard) => card.front && card.back);
  }, [content]);

  const currentCard = flashcards[currentIndex];

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex(prev => (prev === 0 ? flashcards.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex(prev => (prev === flashcards.length - 1 ? 0 : prev + 1));
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="container max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Button variant="ghost" asChild size="sm" className="w-fit">
            <Link to={`/library/${id}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span className="text-sm">{labels.backToContent}</span>
            </Link>
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent flex items-center gap-2">
            <Layers className="h-5 w-5 sm:h-6 sm:w-6" />
            {labels.title}
          </h1>
        </div>

        {flashcards.length === 0 ? (
          <Card className="p-6 sm:p-8 text-center">
            <p className="text-muted-foreground text-sm md:text-base">{labels.noCards}</p>
          </Card>
        ) : (
          <Card className="border-primary/20 shadow-md">
            <CardHeader className="pb-2 sm:pb-4">
              <CardTitle className="text-primary flex items-center justify-between text-base sm:text-lg">
                <span className="flex items-center gap-2">
                  <Layers className="h-4 w-4 sm:h-5 sm:w-5" />
                  {labels.title}
                </span>
                <span className="text-xs sm:text-sm font-normal text-muted-foreground">
                  {labels.card} {currentIndex + 1} {labels.of} {flashcards.length}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              <div
                className="relative cursor-pointer perspective-1000"
                onClick={() => setIsFlipped(!isFlipped)}
              >
                <div
                  className={`relative w-full min-h-[280px] sm:min-h-[350px] transition-transform duration-500 transform-style-preserve-3d ${isFlipped ? 'rotate-y-180' : ''
                    }`}
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  }}
                >
                  <div
                    className="absolute inset-0 backface-hidden bg-gradient-to-br from-primary/5 to-accent/5 border-2 border-primary/20 rounded-xl p-4 sm:p-8 flex flex-col items-center justify-center"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <p className="text-lg sm:text-xl font-medium text-center">{currentCard?.front}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-4 sm:mt-6">{labels.flip}</p>
                  </div>

                  <div
                    className="absolute inset-0 backface-hidden bg-gradient-to-br from-accent/5 to-primary/5 border-2 border-accent/20 rounded-xl p-4 sm:p-8 flex flex-col items-center justify-center"
                    style={{
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)'
                    }}
                  >
                    <p className="text-lg sm:text-xl text-center">{currentCard?.back}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-4 sm:mt-6">{labels.flip}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Button variant="outline" size="default" onClick={handlePrev} className="h-10 w-10 sm:h-12 sm:w-auto sm:px-4">
                  <ChevronLeft className="h-5 w-5" />
                </Button>

                <Button variant="ghost" size="default" onClick={handleRestart} className="text-sm sm:text-base">
                  <RotateCcw className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">{labels.restart}</span>
                </Button>

                <Button variant="outline" size="default" onClick={handleNext} className="h-10 w-10 sm:h-12 sm:w-auto sm:px-4">
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>

              <div className="flex justify-center gap-1.5 sm:gap-2 flex-wrap">
                {flashcards.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => { setCurrentIndex(index); setIsFlipped(false); }}
                    className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-colors ${index === currentIndex ? 'bg-primary' : 'bg-muted-foreground/30'
                      }`}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default FlashcardsPage;
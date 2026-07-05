import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, RotateCcw, Layers } from 'lucide-react';

type Language = 'en' | 'ru' | 'hy' | 'ko';

interface Flashcard {
  front: string;
  back: string;
}

interface FlashcardsProps {
  flashcards: Flashcard[];
  language: Language;
}

const uiLabels = {
  en: {
    title: 'Flashcards',
    flip: 'Click to flip',
    card: 'Card',
    of: 'of',
    restart: 'Restart',
    noCards: 'No flashcards available',
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    confidence: 'Confidence Level'
  },
  ru: {
    title: 'Карточки',
    flip: 'Нажмите, чтобы перевернуть',
    card: 'Карточка',
    of: 'из',
    restart: 'Начать заново',
    noCards: 'Карточки недоступны',
    easy: 'Легко',
    medium: 'Средне',
    hard: 'Тяжело',
    confidence: 'Уровень уверенности'
  },
  hy: {
    title: 'Քարտեր',
    flip: 'Սեղմեք շրջելու համար',
    card: 'Քարտ',
    of: '/',
    restart: 'Վերագործարկել',
    noCards: 'Քարտեր հասանելի չեն',
    easy: 'Հեշտ',
    medium: 'Միջին',
    hard: 'Դժվար',
    confidence: 'Վստահության մակարդակ'
  },
  ko: {
    title: '플래시카드',
    flip: '클릭하여 뒤집기',
    card: '카드',
    of: '/',
    restart: '다시 시작',
    noCards: '플래시카드가 없습니다',
    easy: '쉬움',
    medium: '보통',
    hard: '어려움',
    confidence: '자신감 수준'
  }
};

export const Flashcards = ({ flashcards, language }: FlashcardsProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [confidence, setConfidence] = useState<Record<number, number>>({});
  const labels = uiLabels[language] || uiLabels.en;

  const validFlashcards = useMemo(() => {
    return flashcards.filter(card => card.front && card.back);
  }, [flashcards]);

  if (validFlashcards.length === 0) {
    return (
      <Card className="border-primary/20 shadow-md">
        <CardHeader>
          <CardTitle className="text-primary flex items-center gap-2">
            <Layers className="h-5 w-5" />
            {labels.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">{labels.noCards}</p>
        </CardContent>
      </Card>
    );
  }

  const currentCard = validFlashcards[currentIndex];

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex(prev => (prev === 0 ? validFlashcards.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex(prev => (prev === validFlashcards.length - 1 ? 0 : prev + 1));
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handleConfidenceChange = (val: number) => {
    setConfidence(prev => ({ ...prev, [currentIndex]: val }));
  };

  return (
    <Card className="border-primary/20 shadow-md">
      <CardHeader>
        <CardTitle className="text-primary flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            {labels.title}
          </span>
          <span className="text-sm font-normal text-muted-foreground">
            {labels.card} {currentIndex + 1} {labels.of} {validFlashcards.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className="relative cursor-pointer perspective-1000"
          onClick={() => setIsFlipped(!isFlipped)}
        >
          <div
            className={`relative w-full min-h-[350px] transition-all duration-500 transform-style-3d`}
            style={{
              transformStyle: 'preserve-3d',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            }}
          >
            {/* Front */}
            <div
              className="absolute inset-0 backface-hidden bg-gradient-to-br from-primary/5 to-accent/5 border-2 border-primary/20 rounded-xl p-6 flex flex-col items-center justify-center shadow-inner"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <p className="text-lg font-medium text-center">{currentCard.front}</p>
              <p className="text-xs text-muted-foreground mt-8 opacity-60">{labels.flip}</p>
            </div>

            {/* Back */}
            <div
              className="absolute inset-0 backface-hidden bg-gradient-to-br from-accent/5 to-primary/5 border-2 border-accent/20 rounded-xl p-6 flex flex-col items-center justify-center shadow-inner"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)'
              }}
            >
              <p className="text-lg text-center mb-auto pt-8">{currentCard.back}</p>

              <div className="w-full max-w-[240px] space-y-3 mt-auto pb-4" onClick={(e) => e.stopPropagation()}>
                <p className="text-[10px] text-center text-muted-foreground font-bold uppercase tracking-widest">{labels.confidence}</p>
                <div className="flex justify-between text-[10px] text-muted-foreground px-1 font-medium">
                  <span className="text-red-500">{labels.hard}</span>
                  <span className="text-amber-500">{labels.medium}</span>
                  <span className="text-green-500">{labels.easy}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="1"
                  value={confidence[currentIndex] || 2}
                  onChange={(e) => handleConfidenceChange(parseInt(e.target.value))}
                  className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
              <p className="text-xs text-muted-foreground mb-4 opacity-60">{labels.flip}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" size="icon" onClick={(e) => { e.stopPropagation(); handlePrev(); }}>
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleRestart(); }}>
            <RotateCcw className="h-4 w-4 mr-2" />
            {labels.restart}
          </Button>

          <Button variant="outline" size="icon" onClick={(e) => { e.stopPropagation(); handleNext(); }}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex justify-center gap-1.5 flex-wrap">
          {validFlashcards.map((_, index) => (
            <button
              key={index}
              onClick={(e) => { e.stopPropagation(); setCurrentIndex(index); setIsFlipped(false); }}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${index === currentIndex ? 'bg-primary w-4' : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

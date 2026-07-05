import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface GenerationStatus {
  quiz?: boolean;
  flashcards?: boolean;
  map?: boolean;
  course?: boolean;
  podcast?: boolean;
}

interface MissingAssetsBarProps {
  generationStatus: GenerationStatus | null;
  podcastUrl?: string | null;
  onRegenerate: (assets: string[]) => void;
  isRegenerating?: boolean;
  language?: 'en' | 'ru' | 'hy' | 'ko';
}

type Language = 'en' | 'ru' | 'hy' | 'ko';

const labels = {
  en: {
    missingAssets: 'Missing Assets',
    generating: 'Generating...',
    generateMissing: 'Generate Missing',
    quiz: 'Quiz',
    flashcards: 'Flashcards',
    map: 'Knowledge Map',
    course: 'Course',
    podcast: 'Podcast'
  },
  ru: {
    missingAssets: 'Отсутствующие активы',
    generating: 'Создание...',
    generateMissing: 'Создать отсутствующие',
    quiz: 'Тест',
    flashcards: 'Карточки',
    map: 'Карта знаний',
    course: 'Курс',
    podcast: 'Подкаст'
  },
  hy: {
    missingAssets: 'Բացակա ակտիվներ',
    generating: 'Ստեղծվում է...',
    generateMissing: 'Ստեղծել բացակա',
    quiz: 'Թեստ',
    flashcards: 'Քարտեր',
    map: 'Գիտելիքների քարտեզ',
    course: 'Դասընթաց',
    podcast: 'Պոդկաստ'
  },
  ko: {
    missingAssets: '누락된 자산',
    generating: '생성 중...',
    generateMissing: '누락된 항목 생성',
    quiz: '퀴즈',
    flashcards: '플래시카드',
    map: '지식 지도',
    course: '코스',
    podcast: '팟캐스트'
  }
};

export const MissingAssetsBar = ({ 
  generationStatus, 
  podcastUrl,
  onRegenerate, 
  isRegenerating = false,
  language = 'en'
}: MissingAssetsBarProps) => {
  if (!generationStatus) return null;

  const missingAssets: string[] = [];
  
  if (generationStatus.quiz === false) missingAssets.push('quiz');
  if (generationStatus.flashcards === false) missingAssets.push('flashcards');
  if (generationStatus.map === false) missingAssets.push('map');
  if (generationStatus.course === false) missingAssets.push('course');
  // Check both generation_status AND actual podcast_url presence
  if (generationStatus.podcast === false || (!podcastUrl && generationStatus.podcast !== true)) {
    missingAssets.push('podcast');
  }

  if (missingAssets.length === 0) return null;

  const l = labels[language as Language] || labels.en;

  const assetLabels: Record<string, string> = {
    quiz: l.quiz,
    flashcards: l.flashcards,
    map: l.map,
    course: l.course,
    podcast: l.podcast
  };

  return (
    <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 sm:p-4 mb-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5 sm:mt-0" />
          <div>
            <p className="text-sm font-medium text-warning">
              {l.missingAssets}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {missingAssets.map(asset => (
                <Badge 
                  key={asset} 
                  variant="outline" 
                  className="text-xs border-warning/50 text-warning"
                >
                  {assetLabels[asset] || asset}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        <Button
          onClick={() => onRegenerate(missingAssets)}
          disabled={isRegenerating}
          size="sm"
          variant="outline"
          className="border-warning/50 text-warning hover:bg-warning/10"
        >
          {isRegenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {l.generating}
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              {l.generateMissing}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Pause, Play, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Language } from '@/types';

interface EnhancedPodcastPlayerProps {
  isPlaying: boolean;
  isGenerating: boolean;
  error: string | null;
  onPlaybackToggle: () => void;
  onDismissError: () => void;
  language: Language;
}

const labels = {
  en: {
    generatingPodcast: 'Generating Podcast...',
    estimatedTime: 'This may take up to 60 seconds',
    generatedPodcast: 'Generated Podcast',
    clickPlay: 'Click play to listen',
    generationFailed: 'Generation Failed',
    dismiss: 'Dismiss',
  },
  ru: {
    generatingPodcast: 'Создание подкаста...',
    estimatedTime: 'Это может занять до 60 секунд',
    generatedPodcast: 'Сгенерированный подкаст',
    clickPlay: 'Нажмите для воспроизведения',
    generationFailed: 'Ошибка создания',
    dismiss: 'Закрыть',
  },
  hy: {
    generatingPodcast: 'Պոդկաստ ստեղծվում է...',
    estimatedTime: 'Սա կարող է տևել մինչև 60 վայրկյան',
    generatedPodcast: 'Ստեղծված Պոդկաստ',
    clickPlay: 'Սեղմեք լսելու համար',
    generationFailed: 'Ստեղծումը ձախողվեց',
    dismiss: 'Փակել',
  },
  ko: {
    generatingPodcast: '팟캐스트 생성 중...',
    estimatedTime: '최대 60초 소요',
    generatedPodcast: '생성된 팟캐스트',
    clickPlay: '재생하려면 클릭',
    generationFailed: '생성 실패',
    dismiss: '닫기',
  },
};

export const EnhancedPodcastPlayer = ({
  isPlaying,
  isGenerating,
  error,
  onPlaybackToggle,
  onDismissError,
  language,
}: EnhancedPodcastPlayerProps) => {
  const l = labels[language] || labels.en;

  if (error) {
    return (
      <Card className="p-6 mb-6 border-destructive/50 bg-destructive/5 animate-in fade-in slide-in-from-top-4 duration-300">
        <div className="flex items-center gap-4">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-destructive">{l.generationFailed}</h3>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <Button
            onClick={onDismissError}
            variant="outline"
            size="sm"
            className="ml-auto"
          >
            {l.dismiss}
          </Button>
        </div>
      </Card>
    );
  }

  if (isGenerating) {
    return (
      <Card className="p-6 mb-6 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20 animate-in fade-in slide-in-from-top-4 duration-300">
        <div className="flex items-center gap-4">
          <div className="relative h-14 w-14 flex-shrink-0">
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-full opacity-20 animate-pulse" />
            <div className="absolute inset-1 bg-gradient-to-r from-primary to-accent rounded-full opacity-30 animate-pulse" style={{ animationDelay: '0.1s' }} />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary border-r-accent animate-spin" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-base">{l.generatingPodcast}</h3>
            <p className="text-sm text-muted-foreground">{l.estimatedTime}</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 mb-6 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20 hover:border-primary/40 transition-all duration-300 animate-in fade-in slide-in-from-top-4">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={onPlaybackToggle}
          className={cn(
            'h-14 w-14 rounded-full transition-all duration-300',
            isPlaying && 'bg-primary/20 border-primary/50'
          )}
        >
          <div className="relative">
            {isPlaying ? (
              <Pause className="h-6 w-6 animate-in fade-in-50 duration-200" />
            ) : (
              <Play className="h-6 w-6 ml-0.5 animate-in fade-in-50 duration-200" />
            )}
          </div>
        </Button>
        <div className="flex-1">
          <h3 className="font-semibold text-base">{l.generatedPodcast}</h3>
          <p className="text-sm text-muted-foreground">{l.clickPlay}</p>
        </div>
      </div>
    </Card>
  );
};

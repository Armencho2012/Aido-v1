import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, Volume2, VolumeX, Loader2, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';

type Language = 'en' | 'ru' | 'hy' | 'ko';

interface PodcastPlayerProps {
  podcastUrl: string | null;
  language: Language;
  onGenerate?: () => void;
  isGenerating?: boolean;
}

const labels = {
  en: {
    podcast: 'Podcast',
    generatedPodcast: 'Generated Podcast',
    clickPlay: 'Click play to listen to your AI-generated podcast',
    download: 'Download',
    generate: 'Generate Podcast',
    generating: 'Generating...',
    noPodcast: 'No podcast generated yet',
    generateDescription: 'Generate an AI podcast based on your content'
  },
  ru: {
    podcast: 'Подкаст',
    generatedPodcast: 'Сгенерированный подкаст',
    clickPlay: 'Нажмите воспроизведение, чтобы прослушать ваш AI-подкаст',
    download: 'Скачать',
    generate: 'Создать подкаст',
    generating: 'Создание...',
    noPodcast: 'Подкаст ещё не создан',
    generateDescription: 'Создайте AI-подкаст на основе вашего контента'
  },
  hy: {
    podcast: 'Պոդկաստ',
    generatedPodcast: 'Ստեղծված Պոդկաստ',
    clickPlay: 'Սեղմեք վերարտադրել ձեր ԱԲ-ի կողմից ստեղծված պոդկաստ լսելու համար',
    download: 'Ներբեռնել',
    generate: 'Ստեղծել պոդկաստ',
    generating: 'Ստեղծվում է...',
    noPodcast: 'Պոդկաստ դեռ չի ստեղծվել',
    generateDescription: 'Ստեղծեք ԱԲ պոդկաստ ձեր բովանդակության հիման վրա'
  },
  ko: {
    podcast: '팟캐스트',
    generatedPodcast: '생성된 팟캐스트',
    clickPlay: 'AI가 생성한 팟캐스트를 들으려면 재생을 클릭하세요',
    download: '다운로드',
    generate: '팟캐스트 생성',
    generating: '생성 중...',
    noPodcast: '아직 생성된 팟캐스트가 없습니다',
    generateDescription: '콘텐츠를 기반으로 AI 팟캐스트를 생성하세요'
  }
};

export const PodcastPlayer = ({ podcastUrl, language, onGenerate, isGenerating }: PodcastPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  const l = labels[language] || labels.en;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [podcastUrl]);

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const handleDownload = async () => {
    if (!podcastUrl) return;

    try {
      const response = await fetch(podcastUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'podcast.wav';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'Podcast downloaded successfully'
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: 'Error',
        description: 'Failed to download podcast',
        variant: 'destructive'
      });
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // No podcast URL - show generate button
  if (!podcastUrl) {
    return (
      <Card className="border-primary/20 shadow-md bg-gradient-to-br from-card to-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-primary flex items-center gap-2 text-base sm:text-lg">
            <Mic className="h-5 w-5" />
            {l.podcast}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
            <div className="p-4 rounded-full bg-primary/10">
              <Mic className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">{l.noPodcast}</p>
              <p className="text-sm text-muted-foreground mt-1">{l.generateDescription}</p>
            </div>
            {onGenerate && (
              <Button 
                onClick={onGenerate} 
                disabled={isGenerating}
                className="mt-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {l.generating}
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4 mr-2" />
                    {l.generate}
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 shadow-lg bg-gradient-to-r from-primary/10 to-accent/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-primary flex items-center gap-2 text-base sm:text-lg">
          <Mic className="h-5 w-5" />
          {l.generatedPodcast}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Player Controls */}
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={togglePlayback}
              className="h-14 w-14 rounded-full bg-primary/10 hover:bg-primary/20 border-primary/30"
            >
              {isPlaying ? (
                <Pause className="h-6 w-6 text-primary" />
              ) : (
                <Play className="h-6 w-6 text-primary ml-1" />
              )}
            </Button>

            <div className="flex-1 space-y-1">
              <p className="text-sm text-muted-foreground">{l.clickPlay}</p>
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={1}
                onValueChange={handleSeek}
                className="cursor-pointer"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="hidden sm:flex"
            >
              {isMuted ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="hidden sm:flex"
            >
              <Download className="h-4 w-4 mr-2" />
              {l.download}
            </Button>
          </div>

          {/* Mobile Download Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="w-full sm:hidden"
          >
            <Download className="h-4 w-4 mr-2" />
            {l.download}
          </Button>

          <audio ref={audioRef} src={podcastUrl} className="hidden" />
        </div>
      </CardContent>
    </Card>
  );
};

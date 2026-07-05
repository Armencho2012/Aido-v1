import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Settings, LogOut, BookOpen, CreditCard, User as UserIcon, Lock, Pause, Play } from "lucide-react";
import { SettingsModal } from "@/components/SettingsModal";
import { AnalysisOutput } from "@/components/AnalysisOutput";
import { UpgradeModal } from "@/components/UpgradeModal";
import { BottomInputBar } from "@/components/BottomInputBar";
import { ActionMode, MediaFile, GenerationOptions } from "@/components/BottomInputBar/types";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/useSettings";
import { useAuth } from "@/hooks/useAuth";
import { usePodcast } from "@/hooks/usePodcast";
import { useUsageLimit } from "@/hooks/useUsageLimit";
import { supabase } from "@/integrations/supabase/client";
import { invokeAnalyzeText } from "@/lib/analyzeText";

const uiLabels = {
  en: {
    title: 'Aide',
    subtitle: 'Structured AI Study Engine',
    placeholder: 'Paste your text here to analyze...',
    analyze: 'Analyze Text',
    usage: 'Analyses Left Today:',
    analyzing: 'Analyzing...',
    signOut: 'Sign Out',
    errorNoInput: 'Please enter text or attach a file to analyze',
    freeTierUsage: 'Free Tier Usage',
    remainingAnalyses: 'free analyses remaining today',
    limitReached: "You've reached your daily limit",
    dailyLimitReached: 'Daily Limit Reached',
    upgradeDesc: 'You\'ve used all free analyses for today. Upgrade to Pro for unlimited access!',
    upgradeToPro: 'Upgrade to Pro',
    attach: 'Attach PDF/Image',
    fileAttached: 'File Attached',
    courseMode: 'Course Mode',
    upgradeToContinue: 'Upgrade to Continue',
    library: 'Library',
    upgrade: 'Upgrade',
    profile: 'Profile',
    of: 'of'
  },
  ru: {
    title: 'Aide',
    subtitle: 'Структурированный ИИ-движок для обучения',
    placeholder: 'Вставьте текст для анализа...',
    analyze: 'Анализировать текст',
    usage: 'Анализов осталось сегодня:',
    analyzing: 'Анализируем...',
    signOut: 'Выйти',
    errorNoInput: 'Введите текст или прикрепите файл для анализа',
    freeTierUsage: 'Использование бесплатного тарифа',
    remainingAnalyses: 'бесплатных анализов осталось сегодня',
    limitReached: 'Вы достигли дневного лимита',
    dailyLimitReached: 'Дневной лимит исчерпан',
    upgradeDesc: 'Вы использовали все бесплатные анализы на сегодня. Обновитесь до Pro для неограниченного доступа!',
    upgradeToPro: 'Обновить до Pro',
    attach: 'Прикрепить PDF/Изображение',
    fileAttached: 'Файл прикреплен',
    courseMode: 'Курсовой режим',
    upgradeToContinue: 'Обновитесь для продолжения',
    library: 'Библиотека',
    upgrade: 'Обновить',
    profile: 'Профиль',
    of: 'из'
  },
  hy: {
    title: 'Aide',
    subtitle: 'Կառուցվածքային ԱԲ Ուսումնական Շարժիչ',
    placeholder: 'Տեքստը տեղադրեք այստեղ վերլուծության համար...',
    analyze: 'Վերլուծել տեքստը',
    usage: 'Մնացել է վերլուծություն այսօր:',
    analyzing: 'Վերլուծում...',
    signOut: 'Դուրս գալ',
    errorNoInput: 'Խնդրում ենք մուտքագրել տեքստ կամ կցել ֆայլ վերլուծության համար',
    freeTierUsage: 'Անվճար տարբերակի օգտագործում',
    remainingAnalyses: 'անվճար վերլուծություն է մնացել այսօր',
    limitReached: 'Դուք հասել եք ձեր օրական սահմանաչափին',
    dailyLimitReached: 'Օրական սահմանաչափը լրացել է',
    upgradeDesc: 'Դուք օգտագործել եք բոլոր անվճար վերլուծությունները այսօր: Թարմացրեք Pro-ի անսահմանափակ հասանելիության համար:',
    upgradeToPro: 'Թարմացնել Pro',
    attach: 'Կցել PDF/Պատկեր',
    fileAttached: 'Ֆայլը կցված է',
    courseMode: 'Դասընթացի ռեժիմ',
    upgradeToContinue: 'Թարմացրեք շարունակելու համար',
    library: 'Գրադարան',
    upgrade: 'Թարմացնել',
    profile: 'Պրոֆիլ',
    of: '/'
  },
  ko: {
    title: 'Aide',
    subtitle: 'AI 기반 학습 엔진',
    placeholder: '분석할 텍스트를 여기에 붙여넣으세요...',
    analyze: '텍스트 분석',
    usage: '오늘 남은 분석:',
    analyzing: '분석 중...',
    signOut: '로그아웃',
    errorNoInput: '분석할 텍스트를 입력하거나 파일을 첨부하세요',
    freeTierUsage: '무료 요금제 사용량',
    remainingAnalyses: '회의 무료 분석이 남았습니다',
    limitReached: '일일 한도에 도달했습니다',
    dailyLimitReached: '일일 한도 도달',
    upgradeDesc: '오늘의 무료 분석을 모두 사용했습니다. 무제한 액세스를 위해 Pro로 업그레이드하세요!',
    upgradeToPro: 'Pro로 업그레이드',
    attach: 'PDF/이미지 첨부',
    fileAttached: '파일 첨부됨',
    courseMode: '코스 모드',
    upgradeToContinue: '계속하려면 업그레이드',
    library: '라이브러리',
    upgrade: '업그레이드',
    profile: '프로필',
    of: '/'
  }
};


const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Use custom hooks for cleaner state management
  const { user, isAuthChecked } = useAuth();
  const { language, theme, setLanguage, setTheme, isLoaded: settingsLoaded } = useSettings();
  const { usageCount, dailyLimit, userPlan, isLocked, refreshUsage } = useUsageLimit();
  const { podcastAudio, isPlaying, isGenerating: podcastGenerating, error: podcastError, audioRef, generatePodcast, togglePlayback, clearError: clearPodcastError, clearAudio } = usePodcast();

  // Local UI state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSessionLocked, setIsSessionLocked] = useState(false);
  const [isInputOpen, setIsInputOpen] = useState(true);

  const labels = uiLabels[language];

  // Show upgrade modal when limit is reached 
  useEffect(() => {
    if (isLocked && userPlan === 'free') {
      setShowUpgradeModal(true);
    }
  }, [isLocked, userPlan]);

  // Refresh usage on mount and after auth change
  useEffect(() => {
    if (user?.id && isAuthChecked) {
      refreshUsage(user.id);
    }
  }, [user?.id, isAuthChecked, refreshUsage]);

  // Check for success parameter from Gumroad redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('status') === 'success') {
      toast({
        title: "Success!",
        description: "Your subscription is now active. Refreshing your account...",
      });
      if (user?.id) {
        refreshUsage(user.id);
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [user?.id, toast, refreshUsage]);

  // Redirect if not authenticated
  useEffect(() => {
    if (isAuthChecked && !user) {
      navigate("/auth");
    }
  }, [isAuthChecked, user, navigate]);

  const handleDraftStart = useCallback(() => {
    if (!isSessionLocked) return;
    setAnalysisData(null);
    setAnalysisId(null);
    setIsSessionLocked(false);
  }, [isSessionLocked]);



  const handleSubmit = async (text: string, mode: ActionMode, media?: MediaFile[] | null, generationOptions?: GenerationOptions) => {
    // Prevent race conditions
    if (isProcessing) {
      toast({ description: language === 'en' ? 'Please wait for current request to complete' : '请等待当前请求完成', variant: 'default' });
      return;
    }

    if (!user) {
      toast({ title: "Error", description: "Please sign in", variant: "destructive" });
      return;
    }

    const trimmedText = text.trim();

    if (!trimmedText && (!media || media.length === 0)) {
      toast({ title: 'Error', description: labels.errorNoInput, variant: 'destructive' });
      return;
    }

    if (mode === 'chat' && !trimmedText) {
      toast({ title: 'Error', description: 'Please enter a message to start chat', variant: 'destructive' });
      return;
    }

    if (mode !== 'chat' && usageCount <= 0 && userPlan !== 'class') {
      toast({
        title: `${labels.limitReached}`,
        description: `You have reached your daily limit of ${dailyLimit} analyses`,
        variant: 'destructive'
      });
      return;
    }

    const isAnalysisMode = mode === 'analyze' || mode === 'course';

    if (isAnalysisMode) {
      setIsSessionLocked(true);
      setAnalysisData(null);
      setAnalysisId(null);
    }

    setIsProcessing(true);
    clearAudio();

    try {
      if (mode === 'podcast') {
        await generatePodcast(text, language);
        toast({ title: 'Podcast Ready!', description: 'Your audio podcast is ready to play' });
        if (user?.id) {
          await refreshUsage(user.id);
        }

      } else if (mode === 'chat') {
        const { data: savedChat, error: saveError } = await (supabase as any)
          .from('user_content')
          .insert({
            user_id: user.id,
            original_text: trimmedText,
            analysis_data: {
              session_type: 'general_chat',
              created_from: 'dashboard'
            },
            language,
            title: trimmedText.substring(0, 50) + (trimmedText.length > 50 ? '...' : ''),
            content_type: 'chat',
            generation_status: {
              quiz: false,
              flashcards: false,
              map: false,
              course: false,
              podcast: false
            }
          })
          .select('id')
          .single();

        if (saveError || !savedChat?.id) {
          throw new Error(saveError?.message || 'Failed to start chat session');
        }

        toast({ title: 'Chat Mode', description: 'Opening chat...' });
        navigate(`/library/${savedChat.id}/chat`, {
          state: { initialMessage: trimmedText }
        });

      } else {
        // Handle analyze and course modes
        const mediaPayload = media && media.length > 0 ? { data: media[0].data, mimeType: media[0].mimeType } : null;

        const data = await invokeAnalyzeText({
          text,
          media: mediaPayload,
          language,
          isCourse: mode === 'course',
          generationOptions: generationOptions || { quiz: true, flashcards: true, map: true, course: mode === 'course', podcast: false }
        });

        setAnalysisData(data);

        // Refresh usage count
        if (user?.id) {
          await refreshUsage(user.id);
        }

        // Save to archive
        if (user?.id) {
          try {
            const { data: savedContent, error: saveError } = await (supabase as any)
              .from('user_content')
              .insert({
                user_id: user.id,
                original_text: text,
                analysis_data: data,
                language,
                title: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
                content_type: 'analyse',
                generation_status: generationOptions || { quiz: true, flashcards: true, map: true, course: mode === 'course', podcast: false }
              })
              .select('id')
              .single();
            if (saveError) {
              console.error('Error saving to archive:', saveError);
            } else if (savedContent?.id) {
              setAnalysisId(savedContent.id);
            }
          } catch (saveError) {
            console.error('Error saving to archive:', saveError);
          }
        }

        toast({ title: 'Great job!', description: "You're mastering this subject. Keep it up!" });
        setIsInputOpen(false);
      }
    } catch (error) {
      console.error('Processing error:', error);
      if (isAnalysisMode) {
        setIsSessionLocked(false);
      }
      
      // Handle authentication errors
      if (error instanceof Error && (error.message.includes('Invalid') || error.message.includes('token') || error.message.includes('Refresh Token'))) {
        // Sign out user and redirect to login
        await supabase.auth.signOut().catch(() => {});
        navigate('/auth');
        toast({
          title: 'Session Expired',
          description: 'Please log in again to continue.',
          variant: 'destructive'
        });
        return;
      }
      
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to process request',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };


  return (
    <div
      className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20"
      style={{ paddingBottom: `calc(${isInputOpen ? '32vh' : '18vh'} + env(safe-area-inset-bottom, 24px))` }}
    >
      <div className="container max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8 animate-in fade-in-50 slide-in-from-top-4">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {labels.title}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">{labels.subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Button variant="ghost" asChild size="sm" className="text-xs sm:text-sm">
              <Link to="/library">
                <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">{labels.library}</span>
              </Link>
            </Button>
            <Button variant="ghost" asChild size="sm" className="text-xs sm:text-sm">
              <Link to="/billing">
                <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">{labels.upgrade}</span>
              </Link>
            </Button>
            <Button variant="ghost" asChild size="sm" className="text-xs sm:text-sm">
              <Link to="/settings">
                <UserIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">{labels.profile}</span>
              </Link>
            </Button>
            <Card className="px-2 sm:px-4 py-1.5 sm:py-2 shadow-sm">
              <p className="text-xs sm:text-sm text-muted-foreground">{labels.usage}</p>
              <p className={`text-lg sm:text-2xl font-bold ${usageCount === 0 && userPlan === 'free' ? 'text-destructive' : 'text-primary'}`}>
                {userPlan === 'class' ? '∞' : `${usageCount}/${dailyLimit}`}
              </p>
            </Card>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              className="shadow-sm"
            >
              <Settings className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate("/auth");
              }}
              className="text-xs sm:text-sm"
            >
              <LogOut className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">{labels.signOut}</span>
            </Button>
          </div>
        </header>

        {/* Usage Meter - Prominent Display */}
        <Card className="p-4 sm:p-6 mb-4 sm:mb-6 bg-gradient-to-r from-primary/10 to-accent/10 border-2 border-primary/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div>
              <h3 className="text-base sm:text-lg font-semibold mb-1">
                {userPlan === 'free' ? labels.freeTierUsage : userPlan === 'pro' ? 'Pro Plan' : 'Class Plan'}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {userPlan === 'class'
                  ? 'Unlimited analyses'
                  : usageCount > 0
                    ? `${usageCount} ${labels.of} ${dailyLimit} ${labels.remainingAnalyses}`
                    : labels.limitReached}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <div className={`text-2xl sm:text-4xl font-bold ${usageCount === 0 && userPlan === 'free' ? 'text-destructive' : 'text-primary'}`}>
                {userPlan === 'class' ? (
                  <span className="flex items-center gap-1">
                    <span>∞</span>
                    <span className="text-xs text-muted-foreground">unlimited</span>
                  </span>
                ) : (
                  `${usageCount}/${dailyLimit}`
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Locked State - Conversion CTA */}
        {isLocked && (
          <Card className="p-8 mb-8 bg-gradient-to-br from-destructive/10 to-destructive/5 border-2 border-destructive/20">
            <div className="text-center space-y-4">
              <Lock className="h-16 w-16 mx-auto text-destructive" />
              <h2 className="text-2xl font-bold">{labels.dailyLimitReached}</h2>
              <p className="text-muted-foreground">
                {labels.upgradeDesc}
              </p>
              <Button asChild size="lg" className="bg-gradient-to-r from-primary to-accent">
                <Link to="/billing">
                  <CreditCard className="mr-2 h-5 w-5" />
                  {labels.upgradeToPro}
                </Link>
              </Button>
            </div>
          </Card>
        )}

        {/* Podcast Generation Loading State */}
        {podcastGenerating && (
          <Card className="p-6 mb-6 animate-pulse bg-primary/5">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-primary/20" />
              <div className="flex-1">
                <h3 className="font-semibold">
                  {language === 'en' ? 'Generating Podcast...' : language === 'ru' ? 'Создание подкаста...' : language === 'hy' ? 'Պոդկաստ ստեղծվում է...' : '팟캐스트 생성 중...'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {language === 'en' ? 'This may take up to 60 seconds' : language === 'ru' ? 'Это может занять до 60 секунд' : language === 'hy' ? 'Սա կարող է տևել մինչև 60 վայրկյան' : '최대 60초 소요'}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Podcast Generation Error State */}
        {podcastError && (
          <Card className="p-6 mb-6 border-destructive bg-destructive/5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-destructive">Generation Failed</h3>
                <p className="text-sm text-muted-foreground">{podcastError}</p>
              </div>
              <Button onClick={clearPodcastError} variant="outline" size="sm">
                Dismiss
              </Button>
            </div>
          </Card>
        )}

        {/* Podcast Audio Player */}
        {podcastAudio && (
          <Card className="p-6 mb-6 bg-gradient-to-r from-primary/10 to-accent/10 border-2 border-primary/20 animate-in fade-in-50">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={togglePlayback}
                className="h-14 w-14 rounded-full transition-transform hover:scale-110"
              >
                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
              </Button>
              <div className="flex-1">
                <h3 className="font-semibold">Generated Podcast</h3>
                <p className="text-sm text-muted-foreground">Click play to listen</p>
              </div>
              <audio
                ref={audioRef}
                src={podcastAudio}
                className="hidden"
              />
            </div>
          </Card>
        )}

        {/* Output Area */}
        {analysisData && (
          <AnalysisOutput data={analysisData} language={language} preview analysisId={analysisId} previewLimit={5} />
        )}

        {/* Settings Modal */}
        <SettingsModal
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          language={language}
          onLanguageChange={setLanguage}
          theme={theme}
          onThemeChange={setTheme}
        />

        {/* Premium Upgrade Modal */}
        <UpgradeModal
          open={showUpgradeModal}
          onOpenChange={setShowUpgradeModal}
          language={language}
        />
      </div>

      {/* Bottom Input Bar */}
      <BottomInputBar
        language={language}
        onSubmit={handleSubmit}
        isProcessing={isProcessing}
        isLocked={isLocked}
        isSessionLocked={isSessionLocked}
        onDraftStart={handleDraftStart}
        userPlan={userPlan}
        isOpen={isInputOpen}
        onToggle={() => setIsInputOpen(prev => !prev)}
      />
    </div>
  );
};

export default Dashboard;

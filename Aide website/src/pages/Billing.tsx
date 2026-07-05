import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Check, Infinity, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/useSettings";
import type { User } from "@supabase/supabase-js";

type Language = 'en' | 'ru' | 'hy' | 'ko';
const DEFAULT_GUMROAD_PRO_FULL_URL = 'https://myaide.gumroad.com/l/sceqs';
const DEFAULT_GUMROAD_CLASS_FULL_URL = 'https://myaide.gumroad.com/l/xtldur';

const uiLabels = {
  en: {
    backToDashboard: 'Back to Dashboard',
    choosePlan: 'Choose Your Plan',
    upgradeDescription: 'Upgrade to unlock unlimited AI-powered analysis',
    free: 'Free',
    forever: 'Forever',
    pro: 'Pro',
    perMonth: 'Per month',
    recommended: 'Recommended',
    currentPlan: 'Current Plan',
    selectFree: 'Select Free',
    upgradeToPro: 'Upgrade to Pro',
    processing: 'Processing...',
    featureComparison: 'Feature Comparison',
    feature: 'Feature',
    dailyAnalyses: 'Daily Analyses',
    contentArchive: 'Content Archive',
    prioritySupport: 'Priority Support',
    advancedFeatures: 'Advanced Features',
    unlimited: 'Unlimited',
    success: 'Success!',
    successDescription: 'Your subscription is now active. Please refresh to see your Pro status.',
    features: {
      free: [
        "1 analysis per day",
        "Basic AI analysis",
        "Content archive",
        "Basic support"
      ],
      pro: [
        "50 analyses per month",
        "Advanced AI analysis",
        "Priority processing",
        "Unlimited content archive",
        "Priority support",
        "Early access to new features"
      ]
    }
  },
  ru: {
    backToDashboard: 'Назад к панели управления',
    choosePlan: 'Выберите план',
    upgradeDescription: 'Обновитесь, чтобы разблокировать неограниченный анализ на основе ИИ',
    free: 'Бесплатно',
    forever: 'Навсегда',
    pro: 'Про',
    perMonth: 'В месяц',
    recommended: 'Рекомендуется',
    currentPlan: 'Текущий план',
    selectFree: 'Выбрать бесплатный',
    upgradeToPro: 'Обновить до Pro',
    processing: 'Обработка...',
    featureComparison: 'Сравнение функций',
    feature: 'Функция',
    dailyAnalyses: 'Ежедневные анализы',
    contentArchive: 'Архив контента',
    prioritySupport: 'Приоритетная поддержка',
    advancedFeatures: 'Продвинутые функции',
    unlimited: 'Неограниченно',
    success: 'Успех!',
    successDescription: 'Ваша подписка теперь активна. Пожалуйста, обновите страницу, чтобы увидеть статус Pro.',
    features: {
      free: [
        "1 анализ в день",
        "Базовый анализ ИИ",
        "Архив контента",
        "Базовая поддержка"
      ],
      pro: [
        "Неограниченные анализы",
        "Продвинутый анализ ИИ",
        "Приоритетная обработка",
        "Неограниченный архив контента",
        "Приоритетная поддержка",
        "Ранний доступ к новым функциям"
      ]
    }
  },
  hy: {
    backToDashboard: 'Հետ դեպի վահանակ',
    choosePlan: 'Ընտրեք ձեր պլանը',
    upgradeDescription: 'Թարմացրեք՝ անսահմանափակ AI-ով ուժեղացված վերլուծություն բացելու համար',
    free: 'Անվճար',
    forever: 'Հավերժ',
    pro: 'Pro',
    perMonth: 'Ամսական',
    recommended: 'Առաջարկվում է',
    currentPlan: 'Ընթացիկ պլան',
    selectFree: 'Ընտրել անվճար',
    upgradeToPro: 'Թարմացնել Pro',
    processing: 'Մշակվում է...',
    featureComparison: 'Հնարավորությունների համեմատություն',
    feature: 'Հնարավորություն',
    dailyAnalyses: 'Օրական վերլուծություններ',
    contentArchive: 'Բովանդակության արխիվ',
    prioritySupport: 'Առաջնահերթ աջակցություն',
    advancedFeatures: 'Ընդլայնված հնարավորություններ',
    unlimited: 'Անսահմանափակ',
    success: 'Հաջողություն:',
    successDescription: 'Ձեր բաժանորդագրությունը այժմ ակտիվ է: Խնդրում ենք թարմացնել՝ Pro կարգավիճակը տեսնելու համար:',
    features: {
      free: [
        "1 վերլուծություն օրական",
        "Հիմնական AI վերլուծություն",
        "Բովանդակության արխիվ",
        "Հիմնական աջակցություն"
      ],
      pro: [
        "Անսահմանափակ վերլուծություններ",
        "Ընդլայնված AI վերլուծություն",
        "Առաջնահերթ մշակում",
        "Անսահմանափակ բովանդակության արխիվ",
        "Առաջնահերթ աջակցություն",
        "Նոր հնարավորությունների վաղ մուտք"
      ]
    }
  },
  ko: {
    backToDashboard: '대시보드로 돌아가기',
    choosePlan: '플랜 선택',
    upgradeDescription: '무제한 AI 기반 분석을 잠금 해제하려면 업그레이드하세요',
    free: '무료',
    forever: '영구',
    pro: '프로',
    perMonth: '월',
    recommended: '추천',
    currentPlan: '현재 플랜',
    selectFree: '무료 선택',
    upgradeToPro: '프로로 업그레이드',
    processing: '처리 중...',
    featureComparison: '기능 비교',
    feature: '기능',
    dailyAnalyses: '일일 분석',
    contentArchive: '콘텐츠 아카이브',
    prioritySupport: '우선 지원',
    advancedFeatures: '고급 기능',
    unlimited: '무제한',
    success: '성공!',
    successDescription: '구독이 활성화되었습니다. Pro 상태를 보려면 새로고침하세요.',
    features: {
      free: [
        "일 1회 분석",
        "기본 AI 분석",
        "콘텐츠 아카이브",
        "기본 지원"
      ],
      pro: [
        "무제한 분석",
        "고급 AI 분석",
        "우선 처리",
        "무제한 콘텐츠 아카이브",
        "우선 지원",
        "새 기능 조기 액세스"
      ]
    }
  }
};

const Billing = () => {
  const [user, setUser] = useState<User | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<'free' | 'pro' | 'class'>('free');
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language } = useSettings();
  const labels = uiLabels[language];

  // Fix FOUC - ensure component is mounted before rendering
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Check for success redirect from Gumroad
  useEffect(() => {
    if (searchParams.get('status') === 'success') {
      toast({
        title: labels.success,
        description: labels.successDescription,
      });
      // Refresh subscription status
      if (user) {
        fetchSubscriptionStatus();
      }
    }
  }, [searchParams, user, toast, labels]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchSubscriptionStatus();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        if (session.user) fetchSubscriptionStatus();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchSubscriptionStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await (supabase as any)
        .from('subscriptions')
        .select('status, plan_type, expires_at')
        .eq('user_id', user.id)
        .single() as { data: { status: string; plan_type: string; expires_at: string | null } | null; error: any };

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching subscription:', error);
        return;
      }

      if (data) {
        const isActive = data.status === 'active' &&
          ['pro', 'class'].includes(data.plan_type) &&
          (!data.expires_at || new Date(data.expires_at) > new Date());
        
        if (isActive) {
          setSubscriptionStatus(data.plan_type as 'pro' | 'class');
        } else {
          setSubscriptionStatus('free');
        }
      } else {
        setSubscriptionStatus('free');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const openCheckout = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const getDirectGumroadUrl = (plan: 'pro' | 'class') => {
    if (plan === 'pro') {
      return (
        import.meta.env.VITE_GUMROAD_PRO_FULL_URL ||
        import.meta.env.VITE_GUMROAD_PRO_URL ||
        DEFAULT_GUMROAD_PRO_FULL_URL
      );
    }

    return (
      import.meta.env.VITE_GUMROAD_CLASS_FULL_URL ||
      import.meta.env.VITE_GUMROAD_CLASS_URL ||
      DEFAULT_GUMROAD_CLASS_FULL_URL
    );
  };

  const handleUpgrade = async (plan: 'pro' | 'class') => {
    if (!user) return;

    setLoading(true);

    try {
      const directUrl = getDirectGumroadUrl(plan);
      if (directUrl && typeof directUrl === 'string') {
        openCheckout(directUrl);
        return;
      }

      const { data, error } = await supabase.functions.invoke('gumroad-checkout', {
        body: { plan }
      });

      const resolvedUrl = data?.product_url || data?.checkout_url;

      if (!error && resolvedUrl) {
        openCheckout(resolvedUrl);
        return;
      }

      throw new Error(
        error?.message ||
        'Gumroad URL is not configured. Set Gumroad URLs or edge-function secrets.'
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to start checkout';
      toast({
        title: 'Checkout Error',
        description: message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProUpgrade = () => handleUpgrade('pro');
  const handleClassUpgrade = () => handleUpgrade('class');

  // Show loading skeleton to prevent FOUC - ensure styles are applied
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20" style={{ visibility: 'visible' }}>
        <div className="container max-w-5xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-10 bg-muted rounded w-32"></div>
            <div className="h-16 bg-muted rounded"></div>
            <div className="grid md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-96 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="container max-w-5xl mx-auto px-4 py-8">
        <Button variant="ghost" asChild className="mb-8">
          <Link to="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {labels.backToDashboard}
          </Link>
        </Button>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-4">
            {labels.choosePlan}
          </h1>
          <p className="text-muted-foreground text-lg">
            {labels.upgradeDescription}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Free Tier */}
          <Card className={`p-6 ${subscriptionStatus === 'free' ? 'border-2 border-primary' : ''}`}>
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold mb-2">{labels.free}</h3>
              <div className="text-4xl font-bold mb-1">$0</div>
              <p className="text-sm text-muted-foreground">{labels.forever}</p>
            </div>
            <ul className="space-y-3 mb-6">
              {labels.features.free.map((feature, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-primary flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Button
              variant={subscriptionStatus === 'free' ? 'default' : 'outline'}
              className="w-full"
              disabled={subscriptionStatus === 'free'}
            >
              {subscriptionStatus === 'free' ? labels.currentPlan : labels.selectFree}
            </Button>
          </Card>

          {/* Pro Tier */}
          <Card className={`p-6 relative ${subscriptionStatus === 'pro' ? 'border-2 border-primary' : 'border-2 border-accent'}`}>
            {subscriptionStatus !== 'pro' && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                <span className="bg-gradient-to-r from-primary to-accent text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold shadow-md">
                  Special Offer for You
                </span>
              </div>
            )}
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold mb-2">{labels.pro}</h3>
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-2xl line-through text-muted-foreground">$24.99</span>
                <div className="text-4xl font-bold">$15.99</div>
              </div>
              <p className="text-sm text-muted-foreground">{labels.perMonth}</p>
            </div>
            <ul className="space-y-3 mb-6">
              {labels.features.pro.map((feature, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-accent flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Button
              className={`w-full ${subscriptionStatus === 'pro' ? '' : 'bg-gradient-to-r from-primary to-accent'}`}
              disabled={subscriptionStatus === 'pro' || loading}
              onClick={handleProUpgrade}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {labels.processing}
                </>
              ) : subscriptionStatus === 'pro' ? (
                labels.currentPlan
              ) : (
                labels.upgradeToPro
              )}
            </Button>
          </Card>

          {/* Class Tier (Unlimited) */}
          <Card className={`p-6 relative ${subscriptionStatus === 'class' ? 'border-2 border-primary' : 'border-2 border-primary/30'}`}>
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold mb-2">Class</h3>
              <div className="text-4xl font-bold mb-1">$99.67</div>
              <p className="text-sm text-muted-foreground">{labels.perMonth}</p>
            </div>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-2">
                <Check className="h-5 w-5 text-primary flex-shrink-0" />
                <span>Unlimited analyses</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-5 w-5 text-primary flex-shrink-0" />
                <span>All Pro features</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-5 w-5 text-primary flex-shrink-0" />
                <span>Priority processing</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-5 w-5 text-primary flex-shrink-0" />
                <span>Unlimited content archive</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-5 w-5 text-primary flex-shrink-0" />
                <span>Priority support</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-5 w-5 text-primary flex-shrink-0" />
                <span>Early access to new features</span>
              </li>
            </ul>
            <Button
              variant={subscriptionStatus === 'class' ? 'default' : 'outline'}
              className="w-full"
              disabled={subscriptionStatus === 'class' || loading}
              onClick={handleClassUpgrade}
            >
              {subscriptionStatus === 'class' ? labels.currentPlan : 'Upgrade to Class'}
            </Button>
          </Card>
        </div>

        {/* Feature Comparison */}
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4">{labels.featureComparison}</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">{labels.feature}</th>
                  <th className="text-center p-2">{labels.free}</th>
                  <th className="text-center p-2">{labels.pro}</th>
                  <th className="text-center p-2">Class</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-2">{labels.dailyAnalyses}</td>
                  <td className="text-center p-2">1</td>
                  <td className="text-center p-2">50/month</td>
                  <td className="text-center p-2">
                    <Infinity className="h-4 w-4 inline text-accent" />
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-2">{labels.contentArchive}</td>
                  <td className="text-center p-2">✓</td>
                  <td className="text-center p-2">✓ {labels.unlimited}</td>
                  <td className="text-center p-2">✓ {labels.unlimited}</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2">{labels.prioritySupport}</td>
                  <td className="text-center p-2">✗</td>
                  <td className="text-center p-2">✓</td>
                  <td className="text-center p-2">✓</td>
                </tr>
                <tr>
                  <td className="p-2">{labels.advancedFeatures}</td>
                  <td className="text-center p-2">✗</td>
                  <td className="text-center p-2">✓</td>
                  <td className="text-center p-2">✓</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Billing;



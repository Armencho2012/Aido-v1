import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, User, Mail, Calendar, Key, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/useSettings";
import { useUsageLimit } from "@/hooks/useUsageLimit";
import type { User as SupabaseUser } from "@supabase/supabase-js";

type Language = 'en' | 'ru' | 'hy' | 'ko';

const uiLabels = {
  en: {
    backToDashboard: 'Back to Dashboard',
    title: 'Profile & Preferences',
    description: 'Manage your account settings and preferences',
    accountInformation: 'Account Information',
    fullName: 'Full Name',
    email: 'Email',
    accountCreated: 'Account Created',
    userId: 'User ID (for support)',
    userIdHelp: 'Share this ID with support if you need help',
    copied: 'Copied!',
    copiedDescription: 'User ID copied to clipboard',
    subscriptionStatus: 'Subscription Status',
    currentPlan: 'Current Plan',
    freeTier: 'Free Tier',
    proPlan: 'Pro Plan',
    classPlan: 'Class Plan',
    loading: 'Loading...',
    upgradeToPro: 'Upgrade to Pro',
    security: 'Security',
    passwordChange: 'To change your password, please sign out and use the "Forgot Password" option on the login page.',
    signOut: 'Sign Out'
  },
  ru: {
    backToDashboard: 'Назад к панели управления',
    title: 'Профиль и настройки',
    description: 'Управляйте настройками и предпочтениями вашей учетной записи',
    accountInformation: 'Информация об учетной записи',
    fullName: 'Полное имя',
    email: 'Электронная почта',
    accountCreated: 'Аккаунт создан',
    userId: 'ID пользователя (для поддержки)',
    userIdHelp: 'Поделитесь этим ID со службой поддержки, если вам нужна помощь',
    copied: 'Скопировано!',
    copiedDescription: 'ID пользователя скопирован в буфер обмена',
    subscriptionStatus: 'Статус подписки',
    currentPlan: 'Текущий план',
    freeTier: 'Бесплатный тариф',
    proPlan: 'Тариф Pro',
    classPlan: 'Тариф Class',
    loading: 'Загрузка...',
    upgradeToPro: 'Обновить до Pro',
    security: 'Безопасность',
    passwordChange: 'Чтобы изменить пароль, выйдите из системы и используйте опцию "Забыли пароль" на странице входа.',
    signOut: 'Выйти'
  },
  hy: {
    backToDashboard: 'Հետ դեպի վահանակ',
    title: 'Պրոֆիլ և նախապատվություններ',
    description: 'Կառավարեք ձեր հաշվի կարգավորումները և նախապատվությունները',
    accountInformation: 'Հաշվի տեղեկություն',
    fullName: 'Ամբողջական անուն',
    email: 'Էլ. փոստ',
    accountCreated: 'Հաշիվը ստեղծվել է',
    userId: 'Օգտագործողի ID (աջակցության համար)',
    userIdHelp: 'Կիսվեք այս ID-ով աջակցության հետ, եթե օգնության կարիք ունեք',
    copied: 'Պատճենված է:',
    copiedDescription: 'Օգտագործողի ID-ն պատճենվել է',
    subscriptionStatus: 'Բաժանորդագրության կարգավիճակ',
    currentPlan: 'Ընթացիկ պլան',
    freeTier: 'Անվճար տարբերակ',
    proPlan: 'Pro պլան',
    classPlan: 'Class պլան',
    loading: 'Բեռնվում է...',
    upgradeToPro: 'Թարմացնել Pro',
    security: 'Անվտանգություն',
    passwordChange: 'Գաղտնաբառը փոխելու համար դուրս եկեք և օգտագործեք "Մոռացել եմ գաղտնաբառը" տարբերակը մուտքի էջում:',
    signOut: 'Դուրս գալ'
  },
  ko: {
    backToDashboard: '대시보드로 돌아가기',
    title: '프로필 및 기본 설정',
    description: '계정 설정 및 기본 설정 관리',
    accountInformation: '계정 정보',
    fullName: '전체 이름',
    email: '이메일',
    accountCreated: '계정 생성일',
    userId: '사용자 ID (지원용)',
    userIdHelp: '도움이 필요하면 이 ID를 지원팀과 공유하세요',
    copied: '복사됨!',
    copiedDescription: '사용자 ID가 클립보드에 복사되었습니다',
    subscriptionStatus: '구독 상태',
    currentPlan: '현재 플랜',
    freeTier: '무료 요금제',
    proPlan: '프로 요금제',
    classPlan: '클래스 요금제',
    loading: '로딩 중...',
    upgradeToPro: '프로로 업그레이드',
    security: '보안',
    passwordChange: '비밀번호를 변경하려면 로그아웃하고 로그인 페이지의 "비밀번호 찾기" 옵션을 사용하세요.',
    signOut: '로그아웃'
  }
};

const Settings = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const { language } = useSettings();
  const { userPlan, isLoading: planLoading, refreshUsage } = useUsageLimit();
  const navigate = useNavigate();
  const { toast } = useToast();
  const labels = uiLabels[language];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchProfile(session.user.id);
        refreshUsage(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchProfile(session.user.id);
        refreshUsage(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setProfile(data);
    } catch (error: any) {
      console.error('Error fetching profile:', error);
    }
  };

  const copyUserId = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id);
      setCopied(true);
      toast({
        title: labels.copied,
        description: labels.copiedDescription
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="container max-w-3xl mx-auto px-4 py-8">
        <Button variant="ghost" asChild className="mb-8">
          <Link to="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {labels.backToDashboard}
          </Link>
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            {labels.title}
          </h1>
          <p className="text-muted-foreground">{labels.description}</p>
        </div>

        {/* Account Information */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <User className="h-5 w-5" />
            {labels.accountInformation}
          </h2>
          <div className="space-y-4">
            <div>
              <Label>{labels.fullName}</Label>
              <Input
                value={profile?.full_name || user.user_metadata?.full_name || ''}
                disabled
                className="mt-1"
              />
            </div>
            <div>
              <Label className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {labels.email}
              </Label>
              <Input
                value={user.email || ''}
                disabled
                className="mt-1"
              />
            </div>
            <div>
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {labels.accountCreated}
              </Label>
              <Input
                value={new Date(user.created_at).toLocaleDateString()}
                disabled
                className="mt-1"
              />
            </div>
            <div>
              <Label className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                {labels.userId}
              </Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={user.id}
                  disabled
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyUserId}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {labels.userIdHelp}
              </p>
            </div>
          </div>
        </Card>

        {/* Subscription Status */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">{labels.subscriptionStatus}</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{labels.currentPlan}</p>
              <p className="text-sm text-muted-foreground">
                {planLoading
                  ? labels.loading
                  : userPlan === 'pro'
                    ? labels.proPlan
                    : userPlan === 'class'
                      ? labels.classPlan
                      : labels.freeTier}
              </p>
            </div>
            {userPlan === 'free' && (
              <Button asChild>
                <Link to="/billing">{labels.upgradeToPro}</Link>
              </Button>
            )}
          </div>
        </Card>

        {/* Security */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">{labels.security}</h2>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {labels.passwordChange}
            </p>
            <Button variant="outline" onClick={() => {
              supabase.auth.signOut();
              navigate("/auth");
            }}>
              {labels.signOut}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Settings;


import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, Sparkles, Brain, MessageSquare, Mic } from "lucide-react";
import { z } from "zod";
import { useSettings } from "@/hooks/useSettings";

type Language = 'en' | 'ru' | 'hy' | 'ko';

const uiLabels = {
  en: {
    backToHome: 'Back to Home',
    signInTitle: 'Sign in to start learning',
    signIn: 'Sign In',
    signUp: 'Sign Up',
    email: 'Email',
    password: 'Password',
    fullName: 'Full Name',
    forgotPassword: 'Forgot password?',
    createAccount: 'Create Account',
    startFree: 'Start with 1 free analysis per day!',
    emailRequired: 'Email is required',
    emailPlaceholder: 'your@email.com',
    passwordPlaceholder: '••••••••',
    namePlaceholder: 'John Doe',
    loadingSignIn: 'Signing in...',
    loadingSignUp: 'Creating account...',
    mustBeAtLeast8: 'Must be at least 8 characters',
    validationError: 'Validation Error',
    success: 'Success!',
    accountCreated: 'Account created successfully.',
    checkEmail: 'Check your email',
    confirmationSent: 'We\'ve sent you a confirmation email.',
    resetLinkSent: 'We\'ve sent you a password reset link. Please check your inbox.',
    welcomeBack: 'Welcome back!',
    signedIn: 'Successfully signed in',
    emailRequiredDesc: 'Please enter your email address first',
    error: 'Error',
    signInError: 'Sign In Error',
    signupError: 'Signup Error'
  },
  ru: {
    backToHome: 'На главную',
    signInTitle: 'Войдите, чтобы начать обучение',
    signIn: 'Войти',
    signUp: 'Регистрация',
    email: 'Электронная почта',
    password: 'Пароль',
    fullName: 'Полное имя',
    forgotPassword: 'Забыли пароль?',
    createAccount: 'Создать аккаунт',
    startFree: 'Начните с 1 бесплатного анализа в день!',
    emailRequired: 'Электронная почта обязательна',
    emailPlaceholder: 'vash@email.com',
    passwordPlaceholder: '••••••••',
    namePlaceholder: 'Иван Иванов',
    loadingSignIn: 'Вход...',
    loadingSignUp: 'Создание аккаунта...',
    mustBeAtLeast8: 'Должно быть не менее 8 символов',
    validationError: 'Ошибка валидации',
    success: 'Успешно!',
    accountCreated: 'Аккаунт успешно создан.',
    checkEmail: 'Проверьте вашу почту',
    confirmationSent: 'Мы отправили вам письмо с подтверждением.',
    resetLinkSent: 'Мы отправили ссылку для сброса пароля. Проверьте почту.',
    welcomeBack: 'С возвращением!',
    signedIn: 'Успешный вход',
    emailRequiredDesc: 'Пожалуйста, сначала введите ваш email',
    error: 'Ошибка',
    signInError: 'Ошибка входа',
    signupError: 'Ошибка регистрации'
  },
  hy: {
    backToHome: 'Վերադառնալ գլխավոր էջ',
    signInTitle: 'Մուտք գործեք սովորելու համար',
    signIn: 'Մուտք',
    signUp: 'Գրանցվել',
    email: 'Էլ. փոստ',
    password: 'Գաղտնաբառ',
    fullName: 'Ամբողջական անուն',
    forgotPassword: 'Մոռացե՞լ եք գաղտնաբառը',
    createAccount: 'Ստեղծել հաշիվ',
    startFree: 'Սկսեք օրական 1 անվճար վերլուծությամբ:',
    emailRequired: 'Էլ. փոստը պարտադիր է',
    emailPlaceholder: 'dzer@email.com',
    passwordPlaceholder: '••••••••',
    namePlaceholder: 'անուն ազգանուն',
    loadingSignIn: 'Մուտք...',
    loadingSignUp: 'Հաշվի ստեղծում...',
    mustBeAtLeast8: 'Պետք է լինի առնվազն 8 նիշ',
    validationError: 'Վավերացման սխալ',
    success: 'Հաջողություն:',
    accountCreated: 'Հաշիվը հաջողությամբ ստեղծվել է:',
    checkEmail: 'Ստուգեք ձեր էլ. փոստը',
    confirmationSent: 'Մենք ուղարկել ենք ձեզ հաստատման նամակ:',
    resetLinkSent: 'Ուղարկել ենք գաղտնաբառի վերականգնման հղում: Ստուգեք էլ. փոստը:',
    welcomeBack: 'Բարի վերադարձ:',
    signedIn: 'Մուտքը հաջողված է',
    emailRequiredDesc: 'Խնդրում ենք նախ մուտքագրել ձեր էլ. փոստի հասցեն',
    error: 'Սխալ',
    signInError: 'Մուտքի սխալ',
    signupError: 'Գրանցման սխալ'
  },
  ko: {
    backToHome: '홈으로 돌아가기',
    signInTitle: '학습을 시작하려면 로그인하세요',
    signIn: '로그인',
    signUp: '회원가입',
    email: '이메일',
    password: '비밀번호',
    fullName: '전체 이름',
    forgotPassword: '비밀번호를 잊으셨나요?',
    createAccount: '계정 생성',
    startFree: '하루 1회 무료 분석으로 시작하세요!',
    emailRequired: '이메일은 필수입니다',
    emailPlaceholder: 'your@email.com',
    passwordPlaceholder: '••••••••',
    namePlaceholder: '홍길동',
    loadingSignIn: '로그인 중...',
    loadingSignUp: '계정 생성 중...',
    mustBeAtLeast8: '최소 8자 이상이어야 합니다',
    validationError: '유효성 검사 오류',
    success: '성공!',
    accountCreated: '계정이 성공적으로 생성되었습니다.',
    checkEmail: '이메일을 확인하세요',
    confirmationSent: '확인 이메일을 보냈습니다.',
    resetLinkSent: '비밀번호 재설정 링크를 보냈습니다. 받은 편지함을 확인하세요.',
    welcomeBack: '환영합니다!',
    signedIn: '성공적으로 로그인되었습니다',
    emailRequiredDesc: '먼저 이메일 주소를 입력해 주세요',
    error: '오류',
    signInError: '로그인 오류',
    signupError: '회원가입 오류'
  }
};

// Validation schemas
const signUpSchema = z.object({
  email: z.string()
    .min(1, "Email is required")
    .email("Invalid email format")
    .max(255, "Email too long"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password too long"),
  fullName: z.string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name too long")
    .regex(/^[a-zA-Z\s'-]+$/, "Name contains invalid characters")
});

const signInSchema = z.object({
  email: z.string()
    .min(1, "Email is required")
    .email("Invalid email format"),
  password: z.string()
    .min(1, "Password is required")
});

const Auth = () => {
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("signin");
  const navigate = useNavigate();
  const { language } = useSettings();
  const labels = uiLabels[language as Language] || uiLabels.en;
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate with zod schema
    const validation = signUpSchema.safeParse({
      email: signUpEmail.trim(),
      password: signUpPassword,
      fullName: fullName.trim()
    });

    if (!validation.success) {
      toast({
        title: "Validation Error",
        description: validation.error.errors[0].message,
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: validation.data.email,
        password: validation.data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: { full_name: validation.data.fullName }
        }
      });

      if (error) throw error;

      if (data.user && data.session) {
        // Create profile
        await supabase.from('profiles').upsert({
          user_id: data.user.id,
          email: validation.data.email,
          full_name: validation.data.fullName
        }, { onConflict: 'user_id' });

        toast({
          title: labels.success,
          description: labels.accountCreated
        });
        navigate("/dashboard");
      } else if (data.user) {
        toast({
          title: labels.checkEmail,
          description: labels.confirmationSent
        });
        setSignUpEmail("");
        setSignUpPassword("");
        setFullName("");
      }
    } catch (error: unknown) {
      toast({
        title: labels.signupError,
        description: error instanceof Error ? error.message : "Failed to create account",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate with zod schema
    const validation = signInSchema.safeParse({
      email: signInEmail.trim(),
      password: signInPassword
    });

    if (!validation.success) {
      toast({
        title: "Validation Error",
        description: validation.error.errors[0].message,
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: validation.data.email,
        password: validation.data.password
      });

      if (error) throw error;

      toast({
        title: labels.welcomeBack,
        description: labels.signedIn
      });
      navigate("/dashboard");
    } catch (error: unknown) {
      let errorMessage = "Invalid email or password";
      if (error instanceof Error && error.message.includes("Email not confirmed")) {
        errorMessage = "Please confirm your email before signing in";
      }
      toast({
        title: labels.signInError,
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(130deg,#d8ecff_0%,#eff6ff_48%,#f7f2db_100%)] dark:bg-[radial-gradient(circle_at_80%_20%,rgba(56,189,248,0.24),transparent_42%),radial-gradient(circle_at_15%_12%,rgba(59,130,246,0.24),transparent_38%),linear-gradient(145deg,#041024_0%,#081c3f_58%,#0d2a59_100%)]">
      <div className="pointer-events-none absolute inset-0 opacity-45 [background-image:linear-gradient(to_right,rgba(15,23,42,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.07)_1px,transparent_1px)] [background-size:70px_70px] dark:opacity-55 dark:[background-image:linear-gradient(to_right,rgba(191,219,254,0.15)_1px,transparent_1px),linear-gradient(to_bottom,rgba(191,219,254,0.15)_1px,transparent_1px)]" />
      <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-cyan-300/24 blur-3xl dark:bg-cyan-400/18" />
      <div className="pointer-events-none absolute -right-20 bottom-10 h-72 w-72 rounded-full bg-blue-300/22 blur-3xl dark:bg-blue-400/18" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5">
          <Button
            variant="ghost"
            asChild
            className="rounded-full border border-slate-300/80 bg-white/70 text-slate-700 hover:bg-white/90 dark:border-white/15 dark:bg-slate-900/60 dark:text-zinc-100 dark:hover:bg-slate-900/85"
          >
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {labels.backToHome}
            </Link>
          </Button>
        </div>

        <div className="grid flex-1 items-stretch gap-6 pb-8 lg:grid-cols-12">
          <section className="relative overflow-hidden rounded-[2rem] border border-slate-200/90 bg-white/65 p-6 shadow-[0_22px_70px_rgba(59,130,246,0.14)] backdrop-blur-2xl sm:p-8 dark:border-white/12 dark:bg-slate-950/62 dark:shadow-[0_22px_70px_rgba(2,6,23,0.55)] lg:col-span-5 xl:col-span-6">
            <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-cyan-300/20 blur-3xl dark:bg-cyan-300/22" />
            <div className="pointer-events-none absolute -bottom-16 -left-12 h-48 w-48 rounded-full bg-blue-300/22 blur-3xl dark:bg-blue-500/20" />

            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/70 bg-white/70 px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:border-cyan-300/35 dark:bg-slate-900/80 dark:text-cyan-50">
                <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-cyan-200" />
                Aide
              </div>

              <h1 className="mt-5 max-w-[15ch] text-3xl font-black leading-[1.02] tracking-tight text-slate-900 sm:text-4xl dark:text-slate-50">
                {labels.signInTitle}
              </h1>
              <p className="mt-3 max-w-[44ch] text-sm leading-relaxed text-slate-600 sm:text-base dark:text-blue-100/88">
                {labels.startFree}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300/85 bg-white/72 px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-blue-200/25 dark:bg-slate-900/72 dark:text-blue-50/95">
                  <Brain className="h-3.5 w-3.5 text-blue-500 dark:text-cyan-300" />
                  Neural Maps
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300/85 bg-white/72 px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-blue-200/25 dark:bg-slate-900/72 dark:text-blue-50/95">
                  <MessageSquare className="h-3.5 w-3.5 text-blue-500 dark:text-cyan-300" />
                  AI Tutor
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300/85 bg-white/72 px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-blue-200/25 dark:bg-slate-900/72 dark:text-blue-50/95">
                  <Mic className="h-3.5 w-3.5 text-blue-500 dark:text-cyan-300" />
                  Study Podcasts
                </span>
              </div>

              <div className="mt-8 flex justify-center lg:mt-10">
                <img
                  src="/aide-mascot.svg"
                  alt="Aide mascot"
                  className="w-full max-w-[18rem] drop-shadow-[0_22px_36px_rgba(15,23,42,0.22)] dark:drop-shadow-[0_24px_44px_rgba(2,6,23,0.7)] sm:max-w-[21rem]"
                />
              </div>
            </div>
          </section>

          <section className="lg:col-span-7 xl:col-span-6">
            <Card className="relative h-full overflow-hidden rounded-[2rem] border border-slate-200/90 bg-white/74 p-6 shadow-[0_22px_70px_rgba(59,130,246,0.14)] backdrop-blur-2xl sm:p-8 dark:border-white/14 dark:bg-slate-950/68 dark:shadow-[0_22px_70px_rgba(2,6,23,0.58)]">
              <div className="pointer-events-none absolute -top-14 right-[-4rem] h-40 w-40 rounded-full bg-cyan-300/18 blur-3xl dark:bg-cyan-300/20" />
              <div className="relative">
                <div className="mb-6 text-center">
                  <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Aide</h2>
                  <p className="mt-2 text-sm text-slate-600 dark:text-blue-100/82">{labels.signInTitle}</p>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="mb-6 grid h-11 w-full grid-cols-2 rounded-full border border-slate-300/80 bg-white/75 p-1 dark:border-white/15 dark:bg-slate-900/70">
                    <TabsTrigger
                      value="signin"
                      className="rounded-full text-slate-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white dark:text-zinc-300 dark:data-[state=active]:bg-cyan-300 dark:data-[state=active]:text-slate-950"
                    >
                      {labels.signIn}
                    </TabsTrigger>
                    <TabsTrigger
                      value="signup"
                      className="rounded-full text-slate-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white dark:text-zinc-300 dark:data-[state=active]:bg-cyan-300 dark:data-[state=active]:text-slate-950"
                    >
                      {labels.signUp}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="signin">
                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signin-email" className="text-slate-700 dark:text-blue-100/90">{labels.email}</Label>
                        <Input
                          id="signin-email"
                          type="email"
                          placeholder={labels.emailPlaceholder}
                          value={signInEmail}
                          onChange={(e) => setSignInEmail(e.target.value)}
                          required
                          disabled={loading}
                          maxLength={255}
                          className="h-11 rounded-xl border-slate-300/85 bg-white/85 text-slate-800 placeholder:text-slate-400 focus-visible:ring-blue-500 dark:border-white/16 dark:bg-slate-900/76 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus-visible:ring-cyan-300"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="signin-password" className="text-slate-700 dark:text-blue-100/90">{labels.password}</Label>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!signInEmail.trim()) {
                                toast({
                                  title: labels.emailRequired,
                                  description: labels.emailRequiredDesc,
                                  variant: "destructive"
                                });
                                return;
                              }
                              setLoading(true);
                              try {
                                const { error } = await supabase.auth.resetPasswordForEmail(signInEmail.trim(), {
                                  redirectTo: `${window.location.origin}/auth?reset=true`
                                });
                                if (error) throw error;
                                toast({
                                  title: labels.checkEmail,
                                  description: labels.resetLinkSent
                                });
                              } catch (error: unknown) {
                                toast({
                                  title: labels.error,
                                  description: error instanceof Error ? error.message : "Failed to send reset email",
                                  variant: "destructive"
                                });
                              } finally {
                                setLoading(false);
                              }
                            }}
                            className="text-xs font-medium text-blue-600 transition-colors hover:text-blue-500 dark:text-cyan-300 dark:hover:text-cyan-200"
                            disabled={loading}
                          >
                            {labels.forgotPassword}
                          </button>
                        </div>
                        <Input
                          id="signin-password"
                          type="password"
                          placeholder={labels.passwordPlaceholder}
                          value={signInPassword}
                          onChange={(e) => setSignInPassword(e.target.value)}
                          required
                          disabled={loading}
                          maxLength={72}
                          className="h-11 rounded-xl border-slate-300/85 bg-white/85 text-slate-800 placeholder:text-slate-400 focus-visible:ring-blue-500 dark:border-white/16 dark:bg-slate-900/76 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus-visible:ring-cyan-300"
                        />
                      </div>
                      <Button
                        type="submit"
                        className="h-11 w-full rounded-xl bg-blue-600 text-white transition-all hover:bg-blue-500 dark:bg-cyan-300 dark:text-slate-950 dark:hover:bg-cyan-200"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {labels.loadingSignIn}
                          </>
                        ) : labels.signIn}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup">
                    <form onSubmit={handleSignUp} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-name" className="text-slate-700 dark:text-blue-100/90">{labels.fullName}</Label>
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder={labels.namePlaceholder}
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          required
                          disabled={loading}
                          maxLength={100}
                          className="h-11 rounded-xl border-slate-300/85 bg-white/85 text-slate-800 placeholder:text-slate-400 focus-visible:ring-blue-500 dark:border-white/16 dark:bg-slate-900/76 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus-visible:ring-cyan-300"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-email" className="text-slate-700 dark:text-blue-100/90">{labels.email}</Label>
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder={labels.emailPlaceholder}
                          value={signUpEmail}
                          onChange={(e) => setSignUpEmail(e.target.value)}
                          required
                          disabled={loading}
                          maxLength={255}
                          className="h-11 rounded-xl border-slate-300/85 bg-white/85 text-slate-800 placeholder:text-slate-400 focus-visible:ring-blue-500 dark:border-white/16 dark:bg-slate-900/76 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus-visible:ring-cyan-300"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password" className="text-slate-700 dark:text-blue-100/90">{labels.password}</Label>
                        <Input
                          id="signup-password"
                          type="password"
                          placeholder={labels.passwordPlaceholder}
                          value={signUpPassword}
                          onChange={(e) => setSignUpPassword(e.target.value)}
                          required
                          disabled={loading}
                          maxLength={72}
                          className="h-11 rounded-xl border-slate-300/85 bg-white/85 text-slate-800 placeholder:text-slate-400 focus-visible:ring-blue-500 dark:border-white/16 dark:bg-slate-900/76 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus-visible:ring-cyan-300"
                        />
                        <p className="text-xs text-slate-500 dark:text-zinc-400">
                          {labels.mustBeAtLeast8}
                        </p>
                      </div>
                      <Button
                        type="submit"
                        className="h-11 w-full rounded-xl bg-blue-600 text-white transition-all hover:bg-blue-500 dark:bg-cyan-300 dark:text-slate-950 dark:hover:bg-cyan-200"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {labels.loadingSignUp}
                          </>
                        ) : labels.createAccount}
                      </Button>
                      <p className="text-center text-xs text-slate-500 dark:text-zinc-400">
                        {labels.startFree}
                      </p>
                    </form>
                  </TabsContent>
                </Tabs>
              </div>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Auth;

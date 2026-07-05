import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ArrowLeft, Lightbulb, MessageSquare, Sparkles, Target, BookOpen, Mail } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';

type Language = 'en' | 'ru' | 'hy' | 'ko';

const uiLabels = {
  en: {
    title: 'Help & Guide',
    subtitle: 'Master the art of effective prompting with Aide',
    backToDashboard: 'Back to Dashboard',
    backToHome: 'Back to Home',
    effectivePrompting: {
      title: 'Effective Prompting for MyAide',
      description: 'Learn how to get the best results from our AI analysis engine'
    },
    tips: [
      {
        title: 'Be Specific About Your Goals',
        content: 'Instead of pasting raw text, tell us what you want to learn. For example: "I want to understand the key concepts in this biology chapter" or "Help me prepare for an exam on this material."'
      },
      {
        title: 'Provide Context',
        content: 'Include information about your knowledge level. Are you a beginner, intermediate, or advanced learner? This helps the AI tailor explanations to your level.'
      },
      {
        title: 'Use Clean Text',
        content: 'Remove unnecessary formatting, headers, footers, and page numbers before pasting. Clean text produces better analysis results.'
      },
      {
        title: 'Break Down Large Content',
        content: 'For very long documents, consider breaking them into logical sections and analyzing them separately. This produces more focused and detailed results.'
      },
      {
        title: 'Specify Your Language',
        content: 'If you want the analysis in a specific language, make sure to set your preferred language in settings. The AI will respond in that language.'
      },
      {
        title: 'Review and Iterate',
        content: 'After getting results, use the Chat feature to ask follow-up questions. The AI remembers the context and can provide deeper explanations.'
      }
    ],
    modes: {
      title: 'Understanding the Different Modes',
      analyze: {
        title: 'Analyze Mode',
        description: 'Full pedagogical analysis with summaries, key points, vocabulary, flashcards, and quiz questions. Best for comprehensive study sessions.'
      },
      plan: {
        title: 'Plan Mode',
        description: 'Generates a structured 7-day learning schedule based on your content. Perfect for exam preparation or systematic learning.'
      },
      chat: {
        title: 'Chat Mode',
        description: 'Interactive Q&A about any topic. Great for quick questions and exploring concepts in depth.'
      },
      ask: {
        title: 'Ask Me Mode',
        description: 'Socratic method - the AI asks YOU questions to test your understanding. Excellent for active recall practice.'
      }
    },
    contact: {
      title: 'Need More Help?',
      description: 'Contact us at:',
      email: 'myaide.study@gmail.com'
    }
  },
  ru: {
    title: 'Помощь и руководство',
    subtitle: 'Освойте искусство эффективного использования Aide',
    backToDashboard: 'Назад к панели',
    backToHome: 'На главную',
    effectivePrompting: {
      title: 'Эффективное использование MyAide',
      description: 'Узнайте, как получить лучшие результаты от нашего ИИ-анализатора'
    },
    tips: [
      {
        title: 'Будьте конкретны в своих целях',
        content: 'Вместо простого вставления текста, скажите, что вы хотите узнать. Например: "Я хочу понять ключевые концепции в этой главе по биологии" или "Помогите мне подготовиться к экзамену по этому материалу."'
      },
      {
        title: 'Предоставьте контекст',
        content: 'Укажите ваш уровень знаний. Вы начинающий, средний или продвинутый ученик? Это поможет ИИ адаптировать объяснения под ваш уровень.'
      },
      {
        title: 'Используйте чистый текст',
        content: 'Удалите ненужное форматирование, заголовки, нижние колонтитулы и номера страниц перед вставкой. Чистый текст дает лучшие результаты анализа.'
      },
      {
        title: 'Разбивайте большой контент',
        content: 'Для очень длинных документов рассмотрите возможность разбиения их на логические разделы и анализа по отдельности. Это дает более сфокусированные и детальные результаты.'
      },
      {
        title: 'Укажите свой язык',
        content: 'Если вы хотите получить анализ на определенном языке, установите предпочтительный язык в настройках. ИИ будет отвечать на этом языке.'
      },
      {
        title: 'Просматривайте и уточняйте',
        content: 'После получения результатов используйте функцию чата для дополнительных вопросов. ИИ помнит контекст и может давать более глубокие объяснения.'
      }
    ],
    modes: {
      title: 'Понимание различных режимов',
      analyze: {
        title: 'Режим анализа',
        description: 'Полный педагогический анализ с резюме, ключевыми моментами, словарём, карточками и вопросами викторины. Лучше всего для комплексных учебных сессий.'
      },
      plan: {
        title: 'Режим плана',
        description: 'Создает структурированный 7-дневный план обучения на основе вашего контента. Идеально для подготовки к экзаменам или систематического обучения.'
      },
      chat: {
        title: 'Режим чата',
        description: 'Интерактивные вопросы и ответы на любую тему. Отлично для быстрых вопросов и глубокого изучения концепций.'
      },
      ask: {
        title: 'Режим "Спроси меня"',
        description: 'Сократический метод - ИИ задает ВАМ вопросы для проверки понимания. Отлично для практики активного вспоминания.'
      }
    },
    contact: {
      title: 'Нужна дополнительная помощь?',
      description: 'Свяжитесь с нами:',
      email: 'myaide.study@gmail.com'
    }
  },
  hy: {
    title: 'Օգնություն և ուղեցույց',
    subtitle: 'Տիրապետեք Aide-ի հետ արդյունավետ հուշումների արվեստին',
    backToDashboard: 'Վերադառնալ կառավարման վահանակ',
    backToHome: 'Վերադառնալ գլխավոր էջ',
    effectivePrompting: {
      title: 'Արդյունավետ հուշումներ MyAide-ի համար',
      description: 'Իմացեք, թե ինչպես ստանալ լավագույն արդյունքները մեր AI վերլուծության շարժիչից'
    },
    tips: [
      {
        title: 'Եղեք հստակ ձեր նպատակների հարցում',
        content: 'Սովորական տեքստ տեղադրելու փոխարեն, ասեք ԱԲ֊ին, թե ինչ եք ուզում սովորել: Օրինակ՝ «Ես ուզում եմ հասկանալ այս կենսաբանության գլխի հիմնական հասկացությունները» կամ «Օգնիր ինձ պատրաստվել քննությանը այս նյութով»:'
      },
      {
        title: 'Տրամադրեք համատեքստ',
        content: 'Ներառեք տեղեկություններ ձեր գիտելիքների մակարդակի մասին: Դուք սկսնա՞կ եք, միջի՞ն, թե՞ առաջադեմ սովորող: Սա օգնում է AI-ին հարմարեցնել բացատրությունները ձեր մակարդակին:'
      },
      {
        title: 'Օգտագործեք մաքուր տեքստ',
        content: 'Տեղադրելուց առաջ հեռացրեք ավելորդ ֆորմատավորումը, վերնագրերը և էջի համարները: Մաքուր տեքստը ավելի լավ վերլուծության արդյունքներ է տալիս:'
      },
      {
        title: 'Բաժանեք մեծ բովանդակությունը',
        content: 'Շատ երկար փաստաթղթերի համար մտածեք դրանք տրամաբանական բաժինների բաժանելու և առանձին վերլուծելու մասին: Սա տալիս է ավելի կենտրոնացված և մանրամասն արդյունքներ:'
      },
      {
        title: 'Նշեք ձեր լեզուն',
        content: 'Եթե ցանկանում եք վերլուծությունը կոնկրետ լեզվով, համոզվեք, որ կարգավորումներում սահմանել եք ձեր նախընտրած լեզուն: AI-ն կպատասխանի այդ լեզվով:'
      },
      {
        title: 'Վերանայեք և կրկնեք',
        content: 'Արդյունքները ստանալուց հետո օգտագործեք Զրուցարան գործառույթը՝ լրացուցիչ հարցեր տալու համար: AI-ն հիշում է համատեքստը և կարող է ավելի խորը բացատրություններ տալ:'
      }
    ],
    modes: {
      title: 'Հասկանալով տարբեր ռեժիմները',
      analyze: {
        title: 'Վերլուծության ռեժիմ',
        description: 'Լիարժեք մանկավարժական վերլուծություն՝ ամփոփագրերով, հիմնական կետերով, բառապաշարով, ֆլեշ քարտերով և հարցաշարի հարցերով: Լավագույնն է համապարփակ ուսումնական պարապմունքների համար:'
      },
      plan: {
        title: 'Պլանի ռեժիմ',
        description: 'Ստեղծում է կառուցվածքային 7-օրյա ուսումնական ժամանակացույց՝ հիմնված ձեր բովանդակության վրա: Կատարյալ է քննությունների նախապատրաստման կամ համակարգված ուսուցման համար:'
      },
      chat: {
        title: 'Զրուցարանի ռեժիմ',
        description: 'Ինտերակտիվ Հ&Պ ցանկացած թեմայի վերաբերյալ: Հիանալի է արագ հարցերի և հասկացությունների խորը ուսումնասիրության համար:'
      },
      ask: {
        title: '«Հարցրու ինձ» ռեժիմ',
        description: 'Սոկրատեսյան մեթոդ - AI-ն հարցեր է տալիս ՁԵԶ՝ ստուգելու ձեր հասկացողությունը: Գերազանց է ակտիվ վերհիշման պրակտիկայի համար:'
      }
    },
    contact: {
      title: 'Լրացուցիչ օգնության կարիք ունե՞ք:',
      description: 'Կապվեք մեզ հետ՝',
      email: 'myaide.study@gmail.com'
    }
  },
  ko: {
    title: '도움말 및 가이드',
    subtitle: 'Aide를 효과적으로 사용하는 기술을 마스터하세요',
    backToDashboard: '대시보드로 돌아가기',
    backToHome: '홈으로',
    effectivePrompting: {
      title: 'MyAide의 효과적인 사용법',
      description: 'AI 분석 엔진에서 최상의 결과를 얻는 방법을 알아보세요'
    },
    tips: [
      {
        title: '목표를 구체적으로 설정하세요',
        content: '텍스트를 그냥 붙여넣지 말고 무엇을 배우고 싶은지 말씀해 주세요. 예: "이 생물학 장의 핵심 개념을 이해하고 싶습니다" 또는 "이 자료로 시험 준비를 도와주세요."'
      },
      {
        title: '맥락을 제공하세요',
        content: '자신의 지식 수준에 대한 정보를 포함하세요. 초급, 중급, 고급 학습자인가요? 이를 통해 AI가 수준에 맞게 설명을 조정할 수 있습니다.'
      },
      {
        title: '깨끗한 텍스트를 사용하세요',
        content: '붙여넣기 전에 불필요한 형식, 머리글, 바닥글, 페이지 번호를 제거하세요. 깨끗한 텍스트가 더 좋은 분석 결과를 만듭니다.'
      },
      {
        title: '큰 콘텐츠를 분할하세요',
        content: '매우 긴 문서의 경우 논리적 섹션으로 나누어 별도로 분석하는 것이 좋습니다. 더 집중적이고 상세한 결과를 얻을 수 있습니다.'
      },
      {
        title: '언어를 지정하세요',
        content: '특정 언어로 분석을 원하시면 설정에서 선호하는 언어를 설정하세요. AI가 해당 언어로 응답합니다.'
      },
      {
        title: '검토하고 반복하세요',
        content: '결과를 받은 후 채팅 기능을 사용하여 후속 질문을 하세요. AI는 맥락을 기억하고 더 깊은 설명을 제공할 수 있습니다.'
      }
    ],
    modes: {
      title: '다양한 모드 이해하기',
      analyze: {
        title: '분석 모드',
        description: '요약, 핵심 포인트, 어휘, 플래시카드, 퀴즈 질문이 포함된 전체 교육 분석. 종합적인 학습 세션에 가장 적합합니다.'
      },
      plan: {
        title: '계획 모드',
        description: '콘텐츠를 기반으로 구조화된 7일 학습 일정을 생성합니다. 시험 준비나 체계적인 학습에 완벽합니다.'
      },
      chat: {
        title: '채팅 모드',
        description: '모든 주제에 대한 대화형 Q&A. 빠른 질문과 개념 심층 탐구에 적합합니다.'
      },
      ask: {
        title: '질문 모드',
        description: '소크라테스 방법 - AI가 당신에게 질문하여 이해도를 테스트합니다. 능동적 회상 연습에 탁월합니다.'
      }
    },
    contact: {
      title: '더 많은 도움이 필요하신가요?',
      description: '연락처:',
      email: 'myaide.study@gmail.com'
    }
  }
};

const Help = () => {
  const { language } = useSettings();
  const labels = uiLabels[language];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex gap-2">
            <Button variant="ghost" asChild size="sm">
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {labels.backToHome}
              </Link>
            </Button>
            <Button variant="ghost" asChild size="sm">
              <Link to="/dashboard">
                <BookOpen className="h-4 w-4 mr-2" />
                {labels.backToDashboard}
              </Link>
            </Button>
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {labels.title}
            </h1>
            <p className="text-muted-foreground mt-2">{labels.subtitle}</p>
          </div>
        </div>

        {/* Effective Prompting Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-accent" />
              {labels.effectivePrompting.title}
            </CardTitle>
            <p className="text-muted-foreground">{labels.effectivePrompting.description}</p>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {labels.tips.map((tip, index) => (
                <AccordionItem key={index} value={`tip-${index}`}>
                  <AccordionTrigger className="text-left">
                    <span className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center flex-shrink-0">
                        {index + 1}
                      </span>
                      {tip.title}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pl-8">
                    {tip.content}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Modes Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              {labels.modes.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {Object.entries(labels.modes)
              .filter(([key]) => key !== 'title')
              .map(([key, mode]) => (
                <div key={key} className="p-4 rounded-lg bg-muted/50 border">
                  <h4 className="font-semibold flex items-center gap-2 mb-2">
                    {key === 'analyze' && <Sparkles className="h-4 w-4 text-primary" />}
                    {key === 'plan' && <BookOpen className="h-4 w-4 text-accent" />}
                    {key === 'chat' && <MessageSquare className="h-4 w-4 text-primary" />}
                    {key === 'ask' && <Target className="h-4 w-4 text-accent" />}
                    {(mode as any).title}
                  </h4>
                  <p className="text-sm text-muted-foreground">{(mode as any).description}</p>
                </div>
              ))}
          </CardContent>
        </Card>

        {/* Contact Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-accent" />
              {labels.contact.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-2">{labels.contact.description}</p>
            <a
              href={`mailto:${labels.contact.email}`}
              className="text-primary hover:underline font-medium"
            >
              {labels.contact.email}
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Help;
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSettings } from '@/hooks/useSettings';
import type { Language } from '@/lib/settings';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  robots?: string;
}

type LocalizedSEO = {
  title: string;
  description: string;
  keywords: string;
};

const localeMap: Record<Language, string> = {
  en: 'en_US',
  ru: 'ru_RU',
  hy: 'hy_AM',
  ko: 'ko_KR',
};

const landingSeoByLanguage: Record<Language, LocalizedSEO> = {
  en: {
    title: 'Aide | Turn Notes into Quizzes, Flashcards, Maps, and Podcasts',
    description:
      'Aide transforms notes, PDFs, and images into AI study workflows: summaries, quizzes, flashcards, neural maps, tutor chat, course plans, and podcasts.',
    keywords:
      'AI study assistant, quiz generator, flashcards generator, neural map, tutor chat, podcast generator, PDF study tool, multilingual learning',
  },
  ru: {
    title: 'Aide | Превращайте конспекты в тесты, карты и подкасты',
    description:
      'Aide превращает заметки, PDF и изображения в AI-обучение: конспекты, тесты, карточки, нейрокарты, чат-тьютор, планы курса и подкасты.',
    keywords:
      'AI помощник для учебы, генератор тестов, карточки, нейрокарта, чат тьютор, учебный подкаст, PDF обучение',
  },
  hy: {
    title: 'Aide | Նշումները վերածեք թեստերի, քարտեզների և պոդկաստների',
    description:
      'Aide-ը փոխակերպում է նշումները, PDF-երը և պատկերները AI ուսուցման հոսքերի՝ ամփոփումներ, թեստեր, քարտեր, նեյրոնային քարտեզներ, AI զրույց և պոդկաստ:',
    keywords:
      'AI ուսումնական օգնական, թեստ գեներատոր, քարտեր, նեյրոնային քարտեզ, AI զրույց, պոդկաստ, PDF ուսուցում',
  },
  ko: {
    title: 'Aide | 노트를 퀴즈, 맵, 팟캐스트로 전환',
    description:
      'Aide는 노트, PDF, 이미지를 요약, 퀴즈, 플래시카드, 신경망 맵, 튜터 채팅, 코스 플랜, 팟캐스트로 변환합니다.',
    keywords:
      'AI 학습 도우미, 퀴즈 생성기, 플래시카드, 신경망 맵, 튜터 채팅, 학습 팟캐스트, PDF 학습',
  },
};

const defaultSEO = {
  title: 'Aide | Turn Notes into Quizzes, Flashcards, Maps, and Podcasts',
  description:
    'Aide transforms notes, PDFs, and images into AI study materials: summaries, quizzes, flashcards, knowledge maps, tutor chat, course plans, and podcasts.',
  keywords:
    'AI study assistant, quiz generator, flashcards generator, knowledge map, AI tutor chat, study podcast generator, PDF study tool, multilingual learning',
  image: 'https://myaide.vercel.app/placeholder.svg',
  robots: 'index, follow',
};

const pageSEO: Record<string, SEOProps> = {
  '/': {
    robots: 'index, follow',
  },
  '/help': {
    title: 'Aide Help | Prompting Guide and Study Tips',
    description:
      'Learn how to write better prompts, choose the right mode, and get stronger AI study results with Aide.',
    keywords: 'Aide help, prompting guide, study prompts, AI study tips',
    robots: 'index, follow',
  },
  '/auth': {
    title: 'Sign In | Aide',
    description: 'Sign in to Aide to start generating quizzes, flashcards, maps, and podcasts from your study material.',
    keywords: 'Aide login, sign in, AI study account',
    robots: 'noindex, nofollow',
  },
  '/dashboard': {
    title: 'Dashboard | Aide',
    description: 'Analyze text, files, and voice input to generate AI study tools in your Aide dashboard.',
    keywords: 'AI study dashboard, learning workflow',
    robots: 'noindex, nofollow',
  },
  '/library': {
    title: 'Library | Aide',
    description: 'Access your saved analyses, chats, courses, podcasts, quizzes, and flashcards in one library.',
    keywords: 'study library, learning archive, AI generated study content',
    robots: 'noindex, nofollow',
  },
  '/billing': {
    title: 'Plans & Billing | Aide',
    description: 'Compare Free, Pro, and Class plans for Aide and upgrade your daily study generation limits.',
    keywords: 'Aide pricing, Pro plan, class plan, study subscription',
    robots: 'noindex, nofollow',
  },
  '/settings': {
    title: 'Settings | Aide',
    description: 'Manage language, theme, account preferences, and profile details in Aide.',
    keywords: 'account settings, profile preferences',
    robots: 'noindex, nofollow',
  },
};

const appFeatureList = [
  'Text, PDF, and image analysis',
  'Voice dictation input',
  'Quiz and flashcard generation with quantity controls',
  'Streaming AI tutor chat with context memory',
  'Interactive neural maps with radial and force layouts',
  'Gap scanning with ghost-node suggestions',
  'Course outlines and 7-day study plans',
  'AI podcast generation with playback and download',
  'Knowledge map image export and markdown outline export',
  'PDF export for summaries, terms, quiz, and flashcards',
  'Library search, filters, and missing-asset regeneration',
  'Multilingual interface: English, Russian, Armenian, Korean',
];

const buildLandingUrl = (origin: string, language: Language): string => {
  if (language === 'en') {
    return `${origin}/`;
  }
  return `${origin}/?lang=${language}`;
};

export const SEO = ({ title, description, keywords, image, robots }: SEOProps) => {
  const location = useLocation();
  const pathname = location.pathname;
  const { language } = useSettings();

  const resolvePageSEO = (): SEOProps => {
    if (pageSEO[pathname]) return pageSEO[pathname];
    if (pathname.startsWith('/library/course/')) {
      return {
        title: 'Course View | Aide',
        description: 'Review your generated course structure, modules, and guided study actions in Aide.',
        keywords: 'AI course planner, study syllabus generator',
        robots: 'noindex, nofollow',
      };
    }
    if (pathname.startsWith('/library/') && pathname.endsWith('/quiz')) {
      return {
        title: 'Practice Quiz | Aide',
        description: 'Practice AI-generated quiz questions with explanations based on your uploaded content.',
        keywords: 'practice quiz, AI quiz generator',
        robots: 'noindex, nofollow',
      };
    }
    if (pathname.startsWith('/library/') && pathname.endsWith('/flashcards')) {
      return {
        title: 'Flashcards | Aide',
        description: 'Study with AI-generated flashcards from your notes, PDFs, and course material.',
        keywords: 'AI flashcards, study flashcards',
        robots: 'noindex, nofollow',
      };
    }
    if (pathname.startsWith('/library/') && pathname.endsWith('/chat')) {
      return {
        title: 'AI Tutor Chat | Aide',
        description: 'Ask follow-up questions and learn with context-aware AI tutor chat.',
        keywords: 'AI tutor chat, study Q&A',
        robots: 'noindex, nofollow',
      };
    }
    if (pathname.startsWith('/library/')) {
      return {
        title: 'Study Content | Aide',
        description: 'View your AI-generated summary, key terms, map, quiz, flashcards, and podcast.',
        keywords: 'study content, AI analysis',
        robots: 'noindex, nofollow',
      };
    }
    return {};
  };

  const isLanding = pathname === '/';
  const localizedLandingSEO = landingSeoByLanguage[language] || landingSeoByLanguage.en;
  const pageData = resolvePageSEO();

  const finalTitle = title || pageData.title || (isLanding ? localizedLandingSEO.title : defaultSEO.title);
  const finalDescription = description || pageData.description || (isLanding ? localizedLandingSEO.description : defaultSEO.description);
  const finalKeywords = keywords || pageData.keywords || (isLanding ? localizedLandingSEO.keywords : defaultSEO.keywords);
  const finalImage = image || pageData.image || defaultSEO.image;
  const finalRobots = robots || pageData.robots || defaultSEO.robots;

  useEffect(() => {
    document.title = finalTitle;

    const updateMetaTag = (name: string, content: string, isProperty = false) => {
      const attribute = isProperty ? 'property' : 'name';
      let element = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement;

      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }

      element.setAttribute('content', content);
    };

    const removeMetaTags = (selector: string) => {
      document.querySelectorAll(selector).forEach((node) => node.remove());
    };

    const updateLinkTag = (rel: string, href: string) => {
      let element = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
      if (!element) {
        element = document.createElement('link');
        element.setAttribute('rel', rel);
        document.head.appendChild(element);
      }
      element.setAttribute('href', href);
    };

    const updateJsonLd = (id: string, payload: object) => {
      let script = document.querySelector(`script[data-seo="${id}"]`) as HTMLScriptElement;
      if (!script) {
        script = document.createElement('script');
        script.type = 'application/ld+json';
        script.setAttribute('data-seo', id);
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(payload);
    };

    const removeJsonLd = (id: string) => {
      const script = document.querySelector(`script[data-seo="${id}"]`);
      if (script) {
        script.remove();
      }
    };

    const canonicalBase = (window.location.origin || 'https://myaide.vercel.app').replace(/\/+$/, '');
    const canonicalPath = isLanding && language !== 'en' ? `/?lang=${language}` : pathname;
    const canonicalUrl = `${canonicalBase}${canonicalPath}`;

    updateMetaTag('description', finalDescription);
    updateMetaTag('keywords', finalKeywords);
    updateMetaTag('robots', finalRobots || defaultSEO.robots);
    updateMetaTag('author', 'Aide');
    updateMetaTag('application-name', 'Aide');
    updateMetaTag('language', language);

    updateMetaTag('og:title', finalTitle, true);
    updateMetaTag('og:description', finalDescription, true);
    updateMetaTag('og:image', finalImage, true);
    updateMetaTag('og:type', 'website', true);
    updateMetaTag('og:url', canonicalUrl, true);
    updateMetaTag('og:site_name', 'Aide', true);
    updateMetaTag('og:locale', localeMap[language], true);

    removeMetaTags('meta[property="og:locale:alternate"][data-seo="alternate-locale"]');
    (Object.keys(localeMap) as Language[])
      .filter((langCode) => langCode !== language)
      .forEach((langCode) => {
        const tag = document.createElement('meta');
        tag.setAttribute('property', 'og:locale:alternate');
        tag.setAttribute('content', localeMap[langCode]);
        tag.setAttribute('data-seo', 'alternate-locale');
        document.head.appendChild(tag);
      });

    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', finalTitle);
    updateMetaTag('twitter:description', finalDescription);
    updateMetaTag('twitter:image', finalImage);

    updateLinkTag('canonical', canonicalUrl);

    document.querySelectorAll('link[data-seo="hreflang"]').forEach((node) => node.remove());
    if (isLanding) {
      (Object.keys(localeMap) as Language[]).forEach((langCode) => {
        const link = document.createElement('link');
        link.setAttribute('rel', 'alternate');
        link.setAttribute('hreflang', langCode);
        link.setAttribute('href', buildLandingUrl(canonicalBase, langCode));
        link.setAttribute('data-seo', 'hreflang');
        document.head.appendChild(link);
      });

      const xDefault = document.createElement('link');
      xDefault.setAttribute('rel', 'alternate');
      xDefault.setAttribute('hreflang', 'x-default');
      xDefault.setAttribute('href', buildLandingUrl(canonicalBase, 'en'));
      xDefault.setAttribute('data-seo', 'hreflang');
      document.head.appendChild(xDefault);
    }

    updateJsonLd('website-schema', {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Aide',
      url: 'https://myaide.vercel.app/',
      inLanguage: ['en', 'ru', 'hy', 'ko'],
      description: finalDescription,
    });

    updateJsonLd('app-schema', {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Aide',
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Web',
      url: 'https://myaide.vercel.app/',
      description: finalDescription,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      inLanguage: ['en', 'ru', 'hy', 'ko'],
      featureList: appFeatureList,
    });

    if (isLanding) {
      updateJsonLd('faq-schema', {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'What input formats does Aide support?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Aide supports plain text, PDF files, images, and voice dictation input.',
            },
          },
          {
            '@type': 'Question',
            name: 'What can Aide generate from one analysis?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Aide can generate summaries, key terms, quizzes, flashcards, neural maps, course plans, tutor chat context, and AI podcasts.',
            },
          },
          {
            '@type': 'Question',
            name: 'Does Aide support multilingual workflows?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes. Aide supports English, Russian, Armenian, and Korean with browser-language detection and manual switching.',
            },
          },
        ],
      });
    } else {
      removeJsonLd('faq-schema');
    }
  }, [finalTitle, finalDescription, finalKeywords, finalImage, finalRobots, pathname, language, isLanding]);

  return null;
};

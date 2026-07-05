export type Language = 'en' | 'ru' | 'hy' | 'ko';
export type PrimaryMode = 'analyse' | 'chat';
export type ActionMode = 'analyze' | 'chat' | 'podcast' | 'course';

export interface GenerationOptions {
  quiz: boolean;
  flashcards: boolean;
  map: boolean;
  course: boolean;
  podcast: boolean;
  // Dynamic quantity settings
  n_questions?: number;
  n_flashcards?: number;
}

// Quantity limits by plan
export const QUIZ_LIMITS = {
  free: { min: 1, max: 5 },
  pro: { min: 1, max: 15 },
  class: { min: 1, max: 50 }
};

export const FLASHCARD_LIMITS = {
  free: { min: 1, max: 5 },
  pro: { min: 1, max: 20 },
  class: { min: 1, max: 40 }
};

export interface MediaFile {
  data: string;
  mimeType: string;
  name: string;
}

export interface BottomInputBarProps {
  language: Language;
  onSubmit: (text: string, mode: ActionMode, media?: MediaFile[] | null, generationOptions?: GenerationOptions) => void;
  isProcessing: boolean;
  isLocked: boolean;
  isSessionLocked?: boolean;
  onDraftStart?: () => void;
  userPlan?: 'free' | 'pro' | 'class';
  isOpen?: boolean;
  onToggle?: () => void;
}

export const uiLabels = {
  en: {
    placeholder: {
      analyze: 'Paste text or attach files to analyze...',
      chat: 'Ask a question about any topic...',
      podcast: 'Enter a topic to generate a podcast discussion...',
      course: 'Paste course materials for a structured learning plan...'
    },
    primaryModes: {
      analyse: 'Analyse',
      chat: 'Chat'
    },
    modes: {
      analyze: 'Analyse',
      chat: 'Chat',
      podcast: 'Podcast',
      course: 'Course'
    },
    generationOptions: {
      quiz: 'Quiz',
      flashcards: 'Flashcards',
      map: 'Map',
      course: 'Course',
      podcast: 'Podcast'
    },
    tooltips: {
      analyze: 'Full pedagogical analysis',
      chat: 'General Q&A',
      podcast: 'Generate audio podcast',
      course: 'Structured course plan'
    },
    submit: 'Send',
    processing: 'Processing...',
    attachFile: 'Attach files',
    fileAttached: 'file attached',
    filesAttached: 'files attached',
    upgradeTooltip: 'Upgrade to continue',
    dropFiles: 'Drop files here',
    voiceInput: 'Voice input',
    listening: 'Listening...',
    expand: 'Open input',
    collapse: 'Collapse input',
    // Quantity labels
    questionsCount: 'Questions',
    flashcardsCount: 'Flashcards',
    quantity: 'Quantity'
  },
  ru: {
    placeholder: {
      analyze: 'Вставьте текст или прикрепите файлы для анализа...',
      chat: 'Задайте вопрос на любую тему...',
      podcast: 'Введите тему для создания подкаста...',
      course: 'Вставьте материалы курса для структурированного плана...'
    },
    primaryModes: {
      analyse: 'Анализ',
      chat: 'Чат'
    },
    modes: {
      analyze: 'Анализ',
      chat: 'Чат',
      podcast: 'Подкаст',
      course: 'Курс'
    },
    generationOptions: {
      quiz: 'Тест',
      flashcards: 'Карточки',
      map: 'Карта',
      course: 'Курс',
      podcast: 'Подкаст'
    },
    tooltips: {
      analyze: 'Полный педагогический анализ',
      chat: 'Общие вопросы и ответы',
      podcast: 'Создать аудио подкаст',
      course: 'Структурированный план курса'
    },
    submit: 'Отправить',
    processing: 'Обработка...',
    attachFile: 'Прикрепить файлы',
    fileAttached: 'файл прикреплён',
    filesAttached: 'файлов прикреплено',
    upgradeTooltip: 'Обновите для продолжения',
    dropFiles: 'Перетащите файлы сюда',
    voiceInput: 'Голосовой ввод',
    listening: 'Слушаю...',
    expand: 'Открыть ввод',
    collapse: 'Свернуть ввод',
    // Quantity labels
    questionsCount: 'Вопросы',
    flashcardsCount: 'Карточки',
    quantity: 'Количество'
  },
  hy: {
    placeholder: {
      analyze: 'Տեղադրեք տեքստ կամ կցեք ֆայլեր վերլուծության համար...',
      chat: 'Հարցրեք ցանկացած թեմայի մասին...',
      podcast: 'Մուտքագրեք թեմա պոդկաստի քննարկում ստեղծելու համար...',
      course: 'Տեղադրեք դասընթացի նյութերը կառուցվածքային ուսումնական ծրագրի համար...'
    },
    primaryModes: {
      analyse: 'Վերլուծել',
      chat: 'Զրուցարան'
    },
    modes: {
      analyze: 'Վերլուծել',
      chat: 'Զրուցարան',
      podcast: 'Պոդկաստ',
      course: 'Դասընթաց'
    },
    generationOptions: {
      quiz: 'Թեստ',
      flashcards: 'Քարտեր',
      map: 'Քարտեզ',
      course: 'Դասընթաց',
      podcast: 'Պոդկաստ'
    },
    tooltips: {
      analyze: 'Լիարժեք մանկավարժական վերլուծություն',
      chat: 'Ընդհանուր հարց ու պատասխան',
      podcast: 'Ստեղծել աուդիո պոդկաստ',
      course: 'Կառուցվածքային դասընթացի ծրագիր'
    },
    submit: 'Ուղարկել',
    processing: 'Մշակվում է...',
    attachFile: 'Կցել ֆայլեր',
    fileAttached: 'ֆայլ կցված է',
    filesAttached: 'ֆայլեր կցված են',
    upgradeTooltip: 'Թարմացրեք շարունակելու համար',
    dropFiles: 'Գցեք ֆայլերը այստեղ',
    voiceInput: 'Ձայնային մուտքագրում',
    listening: 'Լսում եմ...',
    expand: 'Բացել մուտքագրումը',
    collapse: 'Փակել մուտքագրումը',
    // Quantity labels
    questionsCount: 'Հարցեր',
    flashcardsCount: 'Քարտեր',
    quantity: 'Քանակ'
  },
  ko: {
    placeholder: {
      analyze: '텍스트를 붙여넣거나 파일을 첨부하여 분석...',
      chat: '어떤 주제에 대해 질문하세요...',
      podcast: '팟캐스트 토론을 생성할 주제를 입력하세요...',
      course: '구조화된 학습 계획을 위한 코스 자료를 붙여넣으세요...'
    },
    primaryModes: {
      analyse: '분석',
      chat: '채팅'
    },
    modes: {
      analyze: '분석',
      chat: '채팅',
      podcast: '팟캐스트',
      course: '코스'
    },
    generationOptions: {
      quiz: '퀴즈',
      flashcards: '플래시카드',
      map: '맵',
      course: '코스',
      podcast: '팟캐스트'
    },
    tooltips: {
      analyze: '전체 교육 분석',
      chat: '일반 Q&A',
      podcast: '오디오 팟캐스트 생성',
      course: '구조화된 코스 계획'
    },
    submit: '전송',
    processing: '처리 중...',
    attachFile: '파일 첨부',
    fileAttached: '개 파일 첨부됨',
    filesAttached: '개 파일 첨부됨',
    upgradeTooltip: '계속하려면 업그레이드',
    dropFiles: '파일을 여기에 놓으세요',
    voiceInput: '음성 입력',
    listening: '듣는 중...',
    expand: '입력 열기',
    collapse: '입력 접기',
    // Quantity labels
    questionsCount: '문항',
    flashcardsCount: '플래시카드',
    quantity: '수량'
  }
};

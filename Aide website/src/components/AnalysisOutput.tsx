import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Calendar, GraduationCap, Lightbulb, BookOpen } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Flashcards } from "./Flashcards";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { Link } from "react-router-dom";

type Language = 'en' | 'ru' | 'hy' | 'ko';

interface LessonSection {
  title: string;
  summary: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correct_answer_index: number;
  explanation: string;
}

interface Flashcard {
  front: string;
  back: string;
}

interface AnalysisData {
  language_detected?: string;
  three_bullet_summary: string[];
  key_terms: string[] | Array<{ term: string; definition: string; importance?: string }>;
  lesson_sections?: LessonSection[];
  quick_quiz_question?: QuizQuestion;
  quiz_questions?: QuizQuestion[];
  flashcards?: Flashcard[];
  study_plan?: {
    days: Array<{
      day: number;
      topics: string[];
      tasks: string[];
    }>;
  };
  course_data?: any;
}

interface AnalysisOutputProps {
  data: AnalysisData;
  language: Language;
  preview?: boolean;
  previewLimit?: number;
  analysisId?: string | null;
}

const uiLabels = {
  en: {
    summary: 'Key Summary',
    sections: 'Lesson Sections',
    terms: 'Key Terms',
    quiz: 'Practice Questions',
    questionPrefix: 'Question',
    checkAnswer: 'Check Answer',
    retry: 'Try Again',
    correct: 'Correct!',
    incorrect: 'Incorrect',
    explanation: 'Explanation',
    studyPlan: '7-Day Study Plan',
    day: 'Day',
    topics: 'Topics',
    count: 'Count',
    viewFull: 'View Full Analysis',
    coursePreview: 'Course Preview',
    viewCourse: 'Show more',
    coursePreviewEmpty: 'Your course is ready. Jump in for the full experience.'
  },
  ru: {
    summary: 'Ключевое Резюме',
    sections: 'Разделы урока',
    terms: 'Ключевые Термины',
    quiz: 'Практические вопросы',
    questionPrefix: 'Вопрос',
    checkAnswer: 'Проверить ответ',
    retry: 'Попробовать снова',
    correct: 'Правильно!',
    incorrect: 'Неправильно',
    explanation: 'Объяснение',
    studyPlan: '7-дневный план обучения',
    day: 'День',
    topics: 'Темы',
    count: 'Количество',
    viewFull: 'Посмотреть полный анализ',
    coursePreview: 'Курс',
    viewCourse: 'Показать больше',
    coursePreviewEmpty: 'Ваш курс готов. Откройте полный опыт обучения.'
  },
  hy: {
    summary: 'Կարևոր Ամփոփում',
    sections: 'Դասի բաժիններ',
    terms: 'Հիմնական Տերմիններ',
    quiz: 'Փորձնական Հարցեր',
    questionPrefix: 'Հարց',
    checkAnswer: 'Ստուգել պատասխանը',
    retry: 'Կրկին փորձել',
    correct: 'Ճիշտ է!',
    incorrect: 'Սխալ',
    explanation: 'Բացատրություն',
    studyPlan: '7-օրյա ուսումնական պլան',
    day: 'Օր',
    topics: 'Թեմաներ',
    count: 'Քանակ',
    viewFull: 'Դիտել ամբողջական վերլուծությունը',
    coursePreview: 'Դասընթացի նախադիտում',
    viewCourse: 'Տեսնել ավելին',
    coursePreviewEmpty: 'Ձեր դասընթացը պատրաստ է։ Մուտք գործեք ամբողջ փորձառության համար։'
  },
  ko: {
    summary: '주요 요약',
    sections: '수업 구성',
    terms: '주요 용어',
    quiz: '연습 문제',
    questionPrefix: '문항',
    checkAnswer: '답변 확인',
    retry: '다시 시도',
    correct: '정답입니다!',
    incorrect: '오답입니다',
    explanation: '설명',
    studyPlan: '7일 학습 계획',
    day: '일차',
    topics: '주제',
    count: '개수',
    viewFull: '전체 분석 보기',
    coursePreview: '코스 미리보기',
    viewCourse: '더 보기',
    coursePreviewEmpty: '코스가 준비되었습니다. 전체 경험을 확인하세요.'
  }
};

export const AnalysisOutput = ({ data, language, preview = false, previewLimit = 5, analysisId }: AnalysisOutputProps) => {
  const [questionStates, setQuestionStates] = useState<{ selectedAnswer: number | null; showResult: boolean; }[]>([]);
  const [numQuestions, setNumQuestions] = useState<number>(10);
  const labels = uiLabels[language] || uiLabels.en;
  const isPreview = preview;
  const courseData = data.course_data || {};
  const previewItems: string[] = (
    courseData?.modules ||
    courseData?.weeks ||
    courseData?.lessons ||
    courseData?.units ||
    []
  )
    .map((item: any) => item?.title || item?.name || item?.topic)
    .filter(Boolean)
    .slice(0, 3);

  const lessonSections = useMemo(() => (data.lesson_sections && data.lesson_sections.length > 0 ? data.lesson_sections : []), [data.lesson_sections]);

  const allQuizQuestions = useMemo(
    () => (data.quiz_questions && data.quiz_questions.length > 0
      ? data.quiz_questions
      : data.quick_quiz_question
        ? [data.quick_quiz_question]
        : []),
    [data.quiz_questions, data.quick_quiz_question]
  );

  const quizQuestions = useMemo(() => {
    const limit = isPreview ? previewLimit : numQuestions;
    return allQuizQuestions.slice(0, Math.min(limit, allQuizQuestions.length));
  }, [allQuizQuestions, isPreview, previewLimit, numQuestions]);

  const flashcardsToShow = useMemo(() => {
    const flashcards = data.flashcards || [];
    return isPreview ? flashcards.slice(0, previewLimit) : flashcards;
  }, [data.flashcards, isPreview, previewLimit]);

  useEffect(() => {
    setQuestionStates(quizQuestions.map(() => ({ selectedAnswer: null, showResult: false })));
  }, [quizQuestions]);

  useEffect(() => {
    if (isPreview) return;
    if (allQuizQuestions.length > 0) {
      const maxQuestions = Math.min(50, allQuizQuestions.length);
      setNumQuestions(maxQuestions);
    }
  }, [allQuizQuestions.length, isPreview]);

  const handleSelectOption = (questionIndex: number, optionIndex: number) => {
    setQuestionStates((prev) =>
      prev.map((state, idx) => (idx === questionIndex ? { ...state, selectedAnswer: optionIndex } : state))
    );
  };

  const handleCheckAnswer = (questionIndex: number) => {
    setQuestionStates((prev) =>
      prev.map((state, idx) => (idx === questionIndex ? { ...state, showResult: state.selectedAnswer !== null } : state))
    );
  };

  const handleRetry = (questionIndex: number) => {
    setQuestionStates((prev) =>
      prev.map((state, idx) => (idx === questionIndex ? { selectedAnswer: null, showResult: false } : state))
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-4">
      {/* Course Preview */}
      {(data.course_data || data.study_plan) && (
        <Card className="border-accent/20 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-accent text-base sm:text-lg">{labels.coursePreview}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {previewItems.length > 0 ? (
              <ul className="space-y-2 text-sm sm:text-base text-muted-foreground">
                {previewItems.map((item, index) => (
                  <li key={index} className="flex gap-2">
                    <span className="text-accent font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm sm:text-base text-muted-foreground">{labels.coursePreviewEmpty}</p>
            )}
            {analysisId && (
              <Button asChild variant="outline" size="sm" className="w-fit">
                <Link to={`/library/course/${analysisId}`}>{labels.viewCourse}</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
      {/* 7-Day Study Plan */}
      {data.study_plan && data.study_plan.days && (
        <Card className="border-primary/20 shadow-lg bg-gradient-to-br from-background to-primary/5">
          <CardHeader>
            <CardTitle className="text-xl text-primary flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {labels.studyPlan}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {data.study_plan.days.map((day, idx) => (
                <div key={idx} className="p-4 rounded-xl border bg-card/40 backdrop-blur-sm transition-all hover:shadow-md hover:border-primary/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-primary text-sm">{labels.day} {day.day}</span>
                    <GraduationCap className="h-4 w-4 text-primary opacity-40" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter">{labels.topics}</p>
                    <ul className="text-xs space-y-1.5">
                      {day.topics.map((t, i) => (
                        <li key={i} className="flex gap-2 items-start leading-tight">
                          <span className="text-primary mt-1 opacity-50">•</span>
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-primary/20 shadow-md overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-primary via-accent to-primary"></div>
        <CardHeader>
          <CardTitle className="text-primary flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {labels.summary}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4">
            {data.three_bullet_summary.map((point, index) => (
              <li key={index} className="flex gap-3 items-start group">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2.5 group-hover:scale-150 transition-transform"></div>
                <div className="text-sm sm:text-base leading-relaxed">
                  <MarkdownRenderer content={point} />
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {lessonSections.length > 0 && (
        <Card className="border-secondary/20 shadow-md">
          <CardHeader>
            <CardTitle className="text-secondary-foreground flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              {labels.sections}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {lessonSections.map((section, index) => (
              <div key={index} className="space-y-3 p-4 rounded-xl bg-muted/30 border border-transparent hover:border-border transition-colors">
                <p className="font-bold text-lg text-primary">{section.title}</p>
                <div className="text-muted-foreground text-sm leading-relaxed">
                  <MarkdownRenderer content={section.summary} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {allQuizQuestions.length > 0 && (
        <Card className="border-primary/20 shadow-md">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-primary">
                {labels.quiz} ({quizQuestions.length})
              </CardTitle>
              {!isPreview && allQuizQuestions.length >= 5 && (
                <div className="flex items-center gap-3 sm:gap-4 min-w-[200px] sm:min-w-[250px]">
                  <Label htmlFor="quiz-count" className="text-xs sm:text-sm whitespace-nowrap">
                    {labels.count}: {numQuestions}
                  </Label>
                  <Slider
                    id="quiz-count"
                    min={5}
                    max={Math.min(50, allQuizQuestions.length)}
                    step={1}
                    value={[numQuestions]}
                    onValueChange={(value) => setNumQuestions(value[0])}
                    className="flex-1"
                  />
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {quizQuestions.map((question, questionIndex) => {
              const questionState = questionStates[questionIndex];
              const selectedAnswer = questionState?.selectedAnswer ?? null;
              const showResult = questionState?.showResult ?? false;
              const isCorrect = selectedAnswer !== null && selectedAnswer === question.correct_answer_index;

              return (
                <div key={questionIndex} className="space-y-4 border rounded-xl p-5 bg-card hover:shadow-sm transition-shadow">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-black text-primary/40 uppercase tracking-[0.2em]">
                      {labels.questionPrefix} {questionIndex + 1}
                    </span>
                    <div className="font-semibold text-lg leading-tight">
                      <MarkdownRenderer content={question.question} />
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {question.options.map((option, optionIndex) => (
                      <button
                        key={optionIndex}
                        onClick={() => !showResult && handleSelectOption(questionIndex, optionIndex)}
                        disabled={showResult}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${selectedAnswer === optionIndex
                          ? showResult
                            ? isCorrect
                              ? 'border-green-500 bg-green-500/10'
                              : 'border-red-500 bg-red-500/10'
                            : 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'border-border hover:border-primary/30 hover:bg-muted/30'
                          } ${showResult && optionIndex === question.correct_answer_index ? 'border-green-500 bg-green-500/5' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-sm">
                            <MarkdownRenderer content={option} />
                          </div>
                          {showResult && optionIndex === question.correct_answer_index && (
                            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 ml-2" />
                          )}
                          {showResult && selectedAnswer === optionIndex && !isCorrect && (
                            <XCircle className="h-5 w-5 text-red-600 shrink-0 ml-2" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    {!showResult ? (
                      <Button
                        onClick={() => handleCheckAnswer(questionIndex)}
                        disabled={selectedAnswer === null}
                        className="w-full sm:flex-1 shadow-md bg-primary hover:opacity-90"
                      >
                        {labels.checkAnswer}
                      </Button>
                    ) : (
                      <>
                        <div className={`w-full sm:flex-1 p-4 rounded-xl ${isCorrect ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                          <p className={`font-black text-xs uppercase tracking-widest mb-2 ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                            {isCorrect ? labels.correct : labels.incorrect}
                          </p>
                          <div className="text-sm leading-relaxed text-foreground/80">
                            <strong>{labels.explanation}:</strong> <MarkdownRenderer content={question.explanation} />
                          </div>
                        </div>
                        <Button
                          onClick={() => handleRetry(questionIndex)}
                          variant="outline"
                          className="w-full sm:flex-[0.4] border-dashed"
                        >
                          {labels.retry}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {flashcardsToShow.length > 0 && (
        <Flashcards flashcards={flashcardsToShow} language={language} />
      )}

      {isPreview && analysisId && (
        <div className="flex justify-center">
          <Button asChild className="px-6 rounded-full bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/20">
            <Link to={`/library/${analysisId}`}>{labels.viewFull}</Link>
          </Button>
        </div>
      )}
    </div>
  );
};

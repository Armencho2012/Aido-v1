import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useContent } from '@/hooks/useContent';
import { ContentDetailSkeleton } from '@/components/ui/skeleton-loader';
import { useState, useEffect, useMemo } from 'react';

type Language = 'en' | 'ru' | 'hy' | 'ko';

interface QuizQuestion {
  question: string;
  options: string[];
  correct_answer_index: number;
  explanation: string;
}

const uiLabels = {
  en: {
    title: 'Practice Quiz',
    questionPrefix: 'Question',
    checkAnswer: 'Check Answer',
    retry: 'Try Again',
    correct: 'Correct!',
    incorrect: 'Incorrect',
    explanation: 'Explanation',
    noQuestions: 'No quiz questions available',
    backToContent: 'Back to Content'
  },
  ru: {
    title: 'Практический Тест',
    questionPrefix: 'Вопрос',
    checkAnswer: 'Проверить ответ',
    retry: 'Попробовать снова',
    correct: 'Правильно!',
    incorrect: 'Неправильно',
    explanation: 'Объяснение',
    noQuestions: 'Вопросы недоступны',
    backToContent: 'Назад к контенту'
  },
  hy: {
    title: 'Պրակտիկ թեստ',
    questionPrefix: 'Հարց',
    checkAnswer: 'Ստուգել պատասխանը',
    retry: 'Կրկին փորձել',
    correct: 'Ճիշտ է!',
    incorrect: 'Սխալ է',
    explanation: 'Բացատրություն',
    noQuestions: 'Հարցեր չկան',
    backToContent: 'Վերադառնալ բովանդակությանը'
  },
  ko: {
    title: '연습 퀴즈',
    questionPrefix: '문항',
    checkAnswer: '답변 확인',
    retry: '다시 시도',
    correct: '정답입니다!',
    incorrect: '오답입니다',
    explanation: '설명',
    noQuestions: '퀴즈 문제가 없습니다',
    backToContent: '콘텐츠로 돌아가기'
  }
};

const Quiz = () => {
  const { id } = useParams<{ id: string }>();
  const { content, isLoading, isAuthChecked } = useContent({ id });
  const [questionStates, setQuestionStates] = useState<{ selectedAnswer: number | null; showResult: boolean }[]>([]);

  const quizQuestions: QuizQuestion[] = useMemo(() => {
    return content?.analysis_data?.quiz_questions || [];
  }, [content]);

  useEffect(() => {
    setQuestionStates(quizQuestions.map(() => ({ selectedAnswer: null, showResult: false })));
  }, [quizQuestions]);

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


  if (!isAuthChecked || isLoading) {
    return <ContentDetailSkeleton />;
  }

  if (!content) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-muted-foreground mb-4 text-sm md:text-base">Content not found</p>
          <Button asChild size="sm">
            <Link to="/library">Back to Library</Link>
          </Button>
        </div>
      </div>
    );
  }

  const language = (content.language as Language) || 'en';
  const labels = uiLabels[language];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="container max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Button variant="ghost" asChild size="sm" className="w-fit">
            <Link to={`/library/${id}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span className="text-sm">{labels.backToContent}</span>
            </Link>
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {labels.title}
          </h1>
        </div>

        {quizQuestions.length === 0 ? (
          <Card className="p-6 sm:p-8 text-center">
            <p className="text-muted-foreground text-sm md:text-base">{labels.noQuestions}</p>
          </Card>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {quizQuestions.map((question, questionIndex) => {
              const questionState = questionStates[questionIndex];
              const selectedAnswer = questionState?.selectedAnswer ?? null;
              const showResult = questionState?.showResult ?? false;
              const isCorrect = selectedAnswer !== null && selectedAnswer === question.correct_answer_index;

              return (
                <Card key={questionIndex} className="border-primary/20 shadow-md">
                  <CardHeader className="pb-2 sm:pb-4">
                    <CardTitle className="text-base sm:text-lg">
                      {labels.questionPrefix} {questionIndex + 1}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4">
                    <p className="font-medium text-base sm:text-lg leading-relaxed">{question.question}</p>

                    <div className="space-y-2">
                      {question.options.map((option, optionIndex) => (
                        <button
                          key={optionIndex}
                          onClick={() => !showResult && handleSelectOption(questionIndex, optionIndex)}
                          disabled={showResult}
                          className={`w-full text-left p-3 sm:p-4 rounded-lg border-2 transition-all text-sm sm:text-base ${selectedAnswer === optionIndex
                            ? showResult
                              ? isCorrect
                                ? 'border-green-500 bg-green-50 dark:bg-green-950'
                                : 'border-red-500 bg-red-50 dark:bg-red-950'
                              : 'border-primary bg-secondary'
                            : 'border-border hover:border-primary/50'
                            } ${showResult && optionIndex === question.correct_answer_index ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex-1">{option}</span>
                            {showResult && optionIndex === question.correct_answer_index && (
                              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
                            )}
                            {showResult && selectedAnswer === optionIndex && !isCorrect && (
                              <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 flex-shrink-0" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-col gap-2">
                      {!showResult ? (
                        <Button
                          onClick={() => handleCheckAnswer(questionIndex)}
                          disabled={selectedAnswer === null}
                          className="w-full"
                          size="sm"
                        >
                          {labels.checkAnswer}
                        </Button>
                      ) : (
                        <>
                          <div className={`w-full p-3 sm:p-4 rounded-lg ${isCorrect ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950'}`}>
                            <p className={`font-bold mb-1 sm:mb-2 text-sm sm:text-base ${isCorrect ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                              {isCorrect ? labels.correct : labels.incorrect}
                            </p>
                            <p className="text-xs sm:text-sm leading-relaxed">
                              <strong>{labels.explanation}:</strong> {question.explanation}
                            </p>
                          </div>
                          <Button
                            onClick={() => handleRetry(questionIndex)}
                            variant="outline"
                            className="w-full"
                            size="sm"
                          >
                            {labels.retry}
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Quiz;
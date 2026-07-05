import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Loader2, Send, Bot, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { useContent } from '@/hooks/useContent';
import { ContentDetailSkeleton } from '@/components/ui/skeleton-loader';

type Language = 'en' | 'ru' | 'hy' | 'ko';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatLocationState {
  initialMessage?: string;
}

const GENERAL_CHAT_CONTEXT = 'General conversation - user is asking a question';

const uiLabels = {
  en: {
    title: 'AI Chat',
    placeholder: 'Ask a question about this material...',
    placeholderGeneral: 'Ask me anything...',
    send: 'Send',
    thinking: 'Thinking...',
    error: 'Failed to get response. Please try again.',
    welcome: 'Hi! I can answer questions about this content. What would you like to know?',
    welcomeGeneral: 'Hi! I am your AI assistant. Ask me anything.',
    backToContent: 'Back to Content',
    backToLibrary: 'Back to Library'
  },
  ru: {
    title: 'ИИ Чат',
    placeholder: 'Задайте вопрос об этом материале...',
    placeholderGeneral: 'Задайте любой вопрос...',
    send: 'Отправить',
    thinking: 'Думаю...',
    error: 'Не удалось получить ответ. Попробуйте снова.',
    welcome: 'Привет! Я могу ответить на вопросы об этом контенте. Что бы вы хотели узнать?',
    welcomeGeneral: 'Привет! Я ваш AI-ассистент. Задайте любой вопрос.',
    backToContent: 'Назад к контенту',
    backToLibrary: 'Назад в библиотеку'
  },
  hy: {
    title: 'AI Զրուցարան',
    placeholder: 'Հարց տվեք այս նյութի մասին...',
    placeholderGeneral: 'Հարց տվեք ցանկացած թեմայի մասին...',
    send: 'Ուղարկել',
    thinking: 'Մտածում եմ...',
    error: 'Չհաջողվեց պատասխան ստանալ: Խնդրում ենք կրկին փորձել:',
    welcome: 'Բարև: Ես կարող եմ պատասխանել այս բովանդակության վերաբերյալ հարցերին: Ի՞նչ կցանկանայիք իմանալ:',
    welcomeGeneral: 'Բարև: Ես ձեր AI օգնականն եմ: Հարց տվեք ցանկացած թեմայով:',
    backToContent: 'Վերադառնալ բովանդակությանը',
    backToLibrary: 'Վերադառնալ գրադարան'
  },
  ko: {
    title: 'AI 채팅',
    placeholder: '이 자료에 대해 질문하세요...',
    placeholderGeneral: '무엇이든 질문하세요...',
    send: '전송',
    thinking: '생각 중...',
    error: '응답을 받지 못했습니다. 다시 시도하세요.',
    welcome: '안녕하세요! 이 콘텐츠에 대한 질문에 답변해 드릴 수 있습니다. 무엇을 알고 싶으신가요?',
    welcomeGeneral: '안녕하세요! AI 도우미입니다. 무엇이든 물어보세요.',
    backToContent: '콘텐츠로 돌아가기',
    backToLibrary: '라이브러리로 돌아가기'
  }
};

const ChatPage = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const initialMessage = (location.state as ChatLocationState | null)?.initialMessage;
  const { content, isLoading, isAuthChecked } = useContent({ id });
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const hasAutoSentInitialMessage = useRef(false);
  const isGeneralChat = content?.content_type === 'chat';

  useEffect(() => {
    hasAutoSentInitialMessage.current = false;
  }, [id, initialMessage]);

  useEffect(() => {
    if (content) {
      const language = (content.language as Language) || 'en';
      const labels = uiLabels[language];
      setMessages([
        {
          role: 'assistant',
          content: isGeneralChat ? labels.welcomeGeneral : labels.welcome
        }
      ]);
    }
  }, [content, isGeneralChat]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(async (messageText?: string) => {
    if (isSending || !content) return;

    const userMessage = (messageText ?? input).trim();
    if (!userMessage) return;

    const language = (content.language as Language) || 'en';
    const labels = uiLabels[language];
    const contentText = isGeneralChat
      ? GENERAL_CHAT_CONTEXT
      : content.original_text || GENERAL_CHAT_CONTEXT;

    if (!messageText) {
      setInput('');
    }

    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsSending(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/content-chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: userMessage,
          contentText,
          analysisData: isGeneralChat ? null : content.analysis_data,
          language,
          chatHistory: [...messages, { role: 'user', content: userMessage }]
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");
      if (!response.body) throw new Error("No response body");

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantAnswer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        assistantAnswer += chunk;

        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = {
            role: 'assistant',
            content: assistantAnswer
          };
          return newMessages;
        });
      }

      if (!assistantAnswer.trim()) {
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = {
            role: 'assistant',
            content: labels.error
          };
          return newMessages;
        });
      }
    } catch (error) {
      console.error('Chat error:', error);
      const language = (content.language as Language) || 'en';
      const labels = uiLabels[language];
      setMessages(prev => [...prev, { role: 'assistant', content: labels.error }]);
    } finally {
      setIsSending(false);
    }
  }, [content, input, isSending, isGeneralChat, messages]);

  useEffect(() => {
    if (!content || hasAutoSentInitialMessage.current) return;

    const prompt = typeof initialMessage === 'string' ? initialMessage.trim() : '';
    if (!prompt) return;

    hasAutoSentInitialMessage.current = true;
    handleSend(prompt);
  }, [content, handleSend, initialMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages, content]);

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
  const backTarget = isGeneralChat ? '/library' : `/library/${id}`;
  const backLabel = isGeneralChat ? labels.backToLibrary : labels.backToContent;
  const placeholder = isGeneralChat ? labels.placeholderGeneral : labels.placeholder;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="h-screen flex flex-col">
        <div className="flex flex-col gap-3 px-3 sm:px-4 py-3 sm:py-4 border-b border-border">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <Button variant="ghost" asChild size="sm" className="w-fit">
                <Link to={backTarget}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  <span className="text-sm">{backLabel}</span>
                </Link>
              </Button>
              <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent flex items-center gap-2">
                <Bot className="h-5 w-5 sm:h-6 sm:w-6" />
                {labels.title}
              </h1>
            </div>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col p-2 sm:p-4 min-w-0">
            <Card className="flex-1 flex flex-col overflow-hidden">
              <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
                <CardTitle className="text-sm sm:text-lg truncate">
                  {content.title || 'Untitled'}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-2 sm:p-4 pt-0 overflow-hidden">
                <ScrollArea className="flex-1 pr-2 sm:pr-4 mb-3 sm:mb-4" ref={scrollAreaRef}>
                  <div className="space-y-3 sm:space-y-4">
                    {messages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex gap-2 sm:gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {message.role === 'assistant' && (
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                          </div>
                        )}
                        <div
                          className={`max-w-[85%] sm:max-w-[80%] rounded-lg p-2.5 sm:p-3 ${message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                            }`}
                        >
                          <MarkdownRenderer content={message.content} />
                        </div>
                        {message.role === 'user' && (
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                            <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </div>
                        )}
                      </div>
                    ))}
                    {isSending && messages[messages.length - 1]?.content === '' && (
                      <div className="flex gap-2 sm:gap-3">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                        </div>
                        <div className="bg-muted rounded-lg p-2.5 sm:p-3">
                          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                            <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                            {labels.thinking}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
                <div className="flex gap-2">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className="min-h-[50px] sm:min-h-[60px] resize-none text-sm"
                    disabled={isSending}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!input.trim() || isSending}
                    className="px-3 sm:px-4"
                    size="default"
                  >
                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;

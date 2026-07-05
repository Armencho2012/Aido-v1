import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, Bot, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type Language = 'en' | 'ru' | 'hy' | 'ko';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ContentChatProps {
  contentText: string;
  analysisData: any;
  language: Language;
}

const uiLabels = {
  en: {
    title: 'Ask AI About This Content',
    placeholder: 'Ask a question about this material...',
    send: 'Send',
    thinking: 'Thinking...',
    error: 'Failed to get response. Please try again.',
    welcome: 'Hi! I can answer questions about this content. What would you like to know?'
  },
  ru: {
    title: 'Спросите ИИ об этом контенте',
    placeholder: 'Задайте вопрос об этом материале...',
    send: 'Отправить',
    thinking: 'Думаю...',
    error: 'Не удалось получить ответ. Попробуйте снова.',
    welcome: 'Привет! Я могу ответить на вопросы об этом контенте. Что бы вы хотели узнать?'
  },
  hy: {
    title: 'Հարցրեք ԱԲ-ին այս բովանդակության մասին',
    placeholder: 'Հարց տվեք այս նյութի մասին...',
    send: 'Ուղարկել',
    thinking: 'Մտածում եմ...',
    error: 'Չհաջողվեց պատասխան ստանալ: Խնդրում ենք կրկին փորձել:',
    welcome: 'Բարև: Ես կարող եմ պատասխանել այս բովանդակության վերաբերյալ հարցերին: Ի՞նչ կցանկանայիք իմանալ:'
  },
  ko: {
    title: 'AI에게 이 콘텐츠에 대해 질문하기',
    placeholder: '이 자료에 대해 질문하세요...',
    send: '전송',
    thinking: '생각 중...',
    error: '응답을 받지 못했습니다. 다시 시도하세요.',
    welcome: '안녕하세요! 이 콘텐츠에 대한 질문에 답변해 드릴 수 있습니다. 무엇을 알고 싶으신가요?'
  }
};

export const ContentChat = ({ contentText, analysisData, language }: ContentChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const labels = uiLabels[language];

  useEffect(() => {
    // Add welcome message
    setMessages([{ role: 'assistant', content: labels.welcome }]);
  }, [labels.welcome]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('content-chat', {
        body: { 
          question: userMessage, 
          contentText,
          analysisData,
          language,
          chatHistory: messages
        }
      });

      if (error) throw error;

      setMessages(prev => [...prev, { role: 'assistant', content: data.answer || labels.error }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: labels.error }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          {labels.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-4 pt-0">
        <ScrollArea className="flex-1 pr-4 mb-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
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
            placeholder={labels.placeholder}
            className="min-h-[60px] resize-none"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-3"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

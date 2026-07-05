import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Search, Trash2, Calendar, PlayCircle, Menu, MessageCircle, FileText, GraduationCap } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useContent } from '@/hooks/useContent';
import { useSettings } from '@/hooks/useSettings';
import { LibrarySkeleton } from '@/components/ui/skeleton-loader';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type Language = 'en' | 'ru' | 'hy' | 'ko';

const uiLabels = {
  en: {
    myLibrary: 'My Library',
    dashboard: 'Dashboard',
    back: 'Back',
    deleted: 'Deleted',
    contentRemoved: 'Content removed from library',
    recentContent: 'Recent Content',
    untitled: 'Untitled',
    all: 'All',
    analyses: 'Analyses',
    chats: 'Chats',
    courses: 'Courses',
    searchPlaceholder: 'Search your content...',
    noContent: 'No content in your library yet. Start by analyzing some text!',
    deleteConfirmTitle: 'Delete Content',
    deleteConfirmDescription: 'Are you sure you want to delete this content? This action cannot be undone.',
    confirmDelete: 'Delete',
    cancel: 'Cancel',
    deleteToast: 'Content deleted successfully'
  },
  ru: {
    myLibrary: 'Моя библиотека',
    dashboard: 'Панель управления',
    back: 'Назад',
    deleted: 'Удалено',
    contentRemoved: 'Контент удален из библиотеки',
    recentContent: 'Недавний контент',
    untitled: 'Без названия',
    all: 'Все',
    analyses: 'Анализы',
    chats: 'Чаты',
    courses: 'Курсы',
    searchPlaceholder: 'Найти контент...',
    noContent: 'В вашей библиотеке еще нет контента. Начните с анализа текста!',
    deleteConfirmTitle: 'Удалить контент',
    deleteConfirmDescription: 'Вы уверены, что хотите удалить этот контент? Это действие нельзя отменить.',
    confirmDelete: 'Удалить',
    cancel: 'Отмена',
    deleteToast: 'Контент успешно удален'
  },
  hy: {
    myLibrary: 'Իմ գրադարան',
    dashboard: 'Վահանակ',
    back: 'Հետ',
    deleted: 'Ջնջված',
    contentRemoved: 'Բովանդակությունը հանվել է գրադարանից',
    recentContent: 'Վերջին բովանդակություն',
    untitled: 'Անունից չունի',
    all: 'Բոլորը',
    analyses: 'Վերլուծություններ',
    chats: 'Զրուցարաններ',
    courses: 'Դասընթացներ',
    searchPlaceholder: 'Որոնել ձեր բովանդակությունը...',
    noContent: 'Ձեր գրադարանում դեռ բովանդակություն չկա: Սկսեք տեքստ վերլուծելով:',
    deleteConfirmTitle: 'Ջնջել բովանդակությունը',
    deleteConfirmDescription: 'Դուք համոզված եք, որ ցանկանում եք ջնջել այս բովանդակությունը: Այս գործողությունը չի կարող հետարկվել:',
    confirmDelete: 'Ջնջել',
    cancel: 'Չեղարկել',
    deleteToast: 'Բովանդակությունը հաջողությամբ ջնջվել է'
  },
  ko: {
    myLibrary: '내 라이브러리',
    dashboard: '대시보드',
    back: '뒤로',
    deleted: '삭제됨',
    contentRemoved: '라이브러리에서 콘텐츠가 제거됨',
    recentContent: '최근 콘텐츠',
    untitled: '제목 없음',
    all: '모두',
    analyses: '분석',
    chats: '채팅',
    courses: '코스',
    searchPlaceholder: '콘텐츠 검색...',
    noContent: '라이브러리에 콘텐츠가 없습니다. 텍스트 분석을 시작하세요!',
    deleteConfirmTitle: '콘텐츠 삭제',
    deleteConfirmDescription: '이 콘텐츠를 정말 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.',
    confirmDelete: '삭제',
    cancel: '취소',
    deleteToast: '콘텐츠가 성공적으로 삭제됨'
  }
};

const Library = () => {
  const { contentList, isLoading, isAuthChecked, deleteContent } = useContent();
  const { language } = useSettings();
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'analyse' | 'chat' | 'course'>('all');
  const navigate = useNavigate();
  const labels = uiLabels[language as Language] || uiLabels.en;
  const getContentRoute = (id: string, contentType: string | null) =>
    contentType === 'chat' ? `/library/${id}/chat` : `/library/${id}`;

  const handleDelete = (id: string) => {
    deleteContent(id);
    toast({ title: labels.deleted, description: labels.contentRemoved });
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const filteredContent = useMemo(() => {
    let filtered = contentList;
    
    // Filter by content type tab
    if (activeTab === 'analyse') {
      filtered = filtered.filter(item => item.content_type !== 'chat' && item.content_type !== 'course');
    } else if (activeTab === 'chat') {
      filtered = filtered.filter(item => item.content_type === 'chat');
    } else if (activeTab === 'course') {
      filtered = filtered.filter(item => item.content_type === 'course' || item.generation_status?.course === true || item.course_data);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        item =>
          item.title?.toLowerCase().includes(query) ||
          item.original_text?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [contentList, searchQuery, activeTab]);

  // Show skeleton while loading OR while auth is not yet checked
  if (!isAuthChecked || isLoading) {
    return <LibrarySkeleton />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      {/* Mobile Hamburger Menu */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-[280px] sm:w-[350px]">
          <SheetHeader>
            <SheetTitle className="text-left">{labels.myLibrary}</SheetTitle>
          </SheetHeader>
          <nav className="mt-6 space-y-2">
            <Button variant="ghost" asChild className="w-full justify-start" onClick={() => setMobileMenuOpen(false)}>
              <Link to="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {labels.dashboard}
              </Link>
            </Button>
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-2 px-2">{labels.recentContent}</p>
              {filteredContent.slice(0, 5).map((item) => (
                <Button
                  key={item.id}
                  variant="ghost"
                  className="w-full justify-start text-left h-auto py-2"
                  onClick={() => {
                    navigate(getContentRoute(item.id, item.content_type));
                    setMobileMenuOpen(false);
                  }}
                >
                  <span className="truncate">{item.title || labels.untitled}</span>
                </Button>
              ))}
            </div>
          </nav>
        </SheetContent>
      </Sheet>

      <div className="container max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-6 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Hamburger menu for mobile */}
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Button variant="ghost" asChild size="sm" className="hidden sm:flex">
              <Link to="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="text-sm sm:text-base">{labels.back}</span>
              </Link>
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {labels.myLibrary}
            </h1>
          </div>
        </div>

        {/* Tabs for filtering content type */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'analyse' | 'chat' | 'course')} className="mb-4 sm:mb-6">
          <TabsList className="bg-card/50">
            <TabsTrigger value="all" className="flex items-center gap-2">
              {labels.all}
            </TabsTrigger>
            <TabsTrigger value="analyse" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">{labels.analyses}</span>
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              <span className="hidden sm:inline">{labels.chats}</span>
            </TabsTrigger>
            <TabsTrigger value="course" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              <span className="hidden sm:inline">{labels.courses}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full max-w-md mb-4 sm:mb-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder={labels.searchPlaceholder}
            className="pl-10 text-sm sm:text-base"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {filteredContent.length === 0 ? (
          <Card className="p-6 sm:p-8 text-center">
            <p className="text-sm sm:text-base text-muted-foreground">
              {labels.noContent}
            </p>
          </Card>
        ) : (
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredContent.map((item) => (
              <Card 
                key={item.id} 
                className="overflow-hidden hover:shadow-md transition-shadow h-full flex flex-col cursor-pointer group"
                onClick={() => navigate(getContentRoute(item.id, item.content_type))}
              >
                <div className="p-3 sm:p-4 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <h3 className="font-medium text-base sm:text-lg line-clamp-2 flex-1">{item.title || labels.untitled}</h3>
                    {item.language && (
                      <span className="text-xs px-2 py-1 bg-muted rounded-full whitespace-nowrap flex-shrink-0">
                        {item.language}
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 line-clamp-3 flex-1">
                    {item.original_text}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-2 border-t">
                    <div className="flex items-center">
                      <Calendar className="h-3.5 w-3.5 mr-1" />
                      {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Unknown date'}
                    </div>
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-primary hover:text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(getContentRoute(item.id, item.content_type));
                        }}
                        title={labels.back}
                      >
                        <PlayCircle className="h-4 w-4 mr-1" />
                        <span className="hidden sm:inline text-xs">{labels.back}</span>
                      </Button>
                      {(item.generation_status?.course || item.course_data) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-accent hover:text-accent hover:bg-accent/10 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/library/course/${item.id}`);
                          }}
                          title={labels.courses}
                        >
                          <GraduationCap className="h-4 w-4 mr-1" />
                          <span className="hidden sm:inline text-xs">{labels.courses}</span>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setItemToDelete(item.id);
                          setDeleteDialogOpen(true);
                        }}
                        title={labels.deleteConfirmTitle}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{labels.deleteConfirmTitle}</AlertDialogTitle>
              <AlertDialogDescription>
                {labels.deleteConfirmDescription}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{labels.cancel}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => itemToDelete && handleDelete(itemToDelete)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {labels.confirmDelete}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default Library;

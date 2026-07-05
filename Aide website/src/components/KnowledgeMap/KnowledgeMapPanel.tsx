import { useState, useEffect, useMemo } from 'react';
import { Map, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import KnowledgeMap from './KnowledgeMap';
import { KnowledgeMapData } from './types';

interface KnowledgeMapPanelProps {
  onAskAboutNode?: (nodeName: string, description?: string, category?: string) => void;
  activeNodeId?: string;
  data?: KnowledgeMapData | null;
  highlightedNodes?: Set<string>;
  isMobile?: boolean;
  language?: 'en' | 'ru' | 'hy' | 'ko';
}

export const KnowledgeMapPanel = ({ onAskAboutNode, activeNodeId, data, highlightedNodes, isMobile, language = 'en' }: KnowledgeMapPanelProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const isMobileDevice = useIsMobile();
  const isSmallScreen = window.innerWidth < 1024;

  const labels = {
    en: 'Knowledge Map',
    ru: 'Карта Знаний',
    hy: 'Գիտելիքների Քարտեզ',
    ko: '지식 맵'
  };

  const title = labels[language] || labels.en;

  const handleNodeClick = (nodeName: string, description?: string, category?: string) => {
    // Contextual injection: pass description and category as metadata for more precise deep dives
    const contextualPrompt = description
      ? `Tell me more about ${nodeName}. Context: ${description}. Category: ${category || 'general'}.`
      : `Tell me more about ${nodeName}`;
    onAskAboutNode?.(contextualPrompt, description, category);

    // Close mobile sheet after clicking
    if (isMobileDevice || isMobile) {
      setMobileSheetOpen(false);
    }
  };

  // Auto-open on desktop, closed on mobile
  useEffect(() => {
    setIsOpen(!isMobileDevice && !isMobile);
  }, [isMobileDevice, isMobile]);

  // Mobile: Use Sheet/Drawer component
  if (isMobileDevice || isMobile || isSmallScreen) {
    return (
      <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 lg:hidden"
          >
            <Map className="h-4 w-4" />
            {title}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[90vh] overflow-hidden p-0">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>
          <div className="h-[calc(90vh-5rem)] p-4 overflow-auto">
            <KnowledgeMap
              onNodeClick={handleNodeClick}
              activeNodeId={activeNodeId}
              data={data}
              highlightedNodes={highlightedNodes}
              language={language}
            />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Side panel with toggle
  return (
    <div
      className={`relative h-full transition-all duration-300 ease-out ${isOpen ? 'w-full sm:w-[350px] md:w-[400px] lg:w-[500px]' : 'w-12'
        }`}
    >
      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="absolute -left-10 top-1/2 -translate-y-1/2 z-10 bg-card border border-border shadow-lg hover:bg-secondary rounded-l-lg rounded-r-none h-20 w-10"
      >
        {isOpen ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </Button>

      {/* Collapsed state */}
      {!isOpen && (
        <div className="h-full flex items-center justify-center bg-card/50 backdrop-blur-sm border-l border-border">
          <div className="flex flex-col items-center gap-2">
            <Map className="h-5 w-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground writing-mode-vertical transform rotate-180" style={{ writingMode: 'vertical-rl' }}>
              {title}
            </span>
          </div>
        </div>
      )}

      {/* Expanded state */}
      {isOpen && (
        <div className="h-full p-4">
          <KnowledgeMap
            onNodeClick={handleNodeClick}
            activeNodeId={activeNodeId}
            data={data}
            highlightedNodes={highlightedNodes}
            language={language}
          />
        </div>
      )}
    </div>
  );
};

export default KnowledgeMapPanel;

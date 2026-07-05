import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, Info, ArrowRight, Sparkles, Pencil, FileText, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ZenModeSidePanelProps {
  isOpen: boolean;
  node: {
    id: string;
    label: string;
    category: string;
    description?: string;
    details?: string[];
    connections?: string[];
    sourceSnippet?: string;
    isGhost?: boolean;
    isHighYield?: boolean;
  } | null;
  outline?: string | null;
  showOutline?: boolean;
  outlineLabel?: string;
  outlinePlaceholder?: string;
  downloadLabel?: string;
  copyLabel?: string;
  onDownloadOutline?: () => void;
  onCopyOutline?: () => void;
  onClose: () => void;
  onEditLabel?: (nodeId: string, currentLabel: string) => void;
}

export const ZenModeSidePanel = ({
  isOpen,
  node,
  outline,
  showOutline,
  outlineLabel = 'Outline',
  outlinePlaceholder = 'Outline not generated yet.',
  downloadLabel = 'Download .md',
  copyLabel = 'Copy for Notion',
  onDownloadOutline,
  onCopyOutline,
  onClose,
  onEditLabel
}: ZenModeSidePanelProps) => {
  if (!node) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed right-0 top-0 h-full w-[400px] z-[60] overflow-hidden"
        >
          <div
            className="h-full w-full overflow-y-auto backdrop-blur-xl border-l"
            style={{
              background: 'linear-gradient(180deg, hsl(265 70% 12% / 0.98), hsl(265 60% 8% / 0.99))',
              borderColor: 'hsl(265 60% 30% / 0.5)',
            }}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 p-6 border-b backdrop-blur-sm" style={{ borderColor: 'hsl(265 60% 30% / 0.3)' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-purple-400" />
                    <span className="text-xs uppercase tracking-wider text-purple-300 font-medium px-2 py-0.5 rounded-full bg-purple-500/20">
                      {node.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold text-white">{node.label}</h2>
                    {onEditLabel && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEditLabel(node.id, node.label)}
                        className="h-7 w-7 text-purple-300 hover:text-white hover:bg-purple-500/20"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-9 w-9 text-purple-300 hover:text-white hover:bg-purple-500/20 shrink-0 backdrop-blur-sm active:scale-95 transition-all"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Description */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="h-5 w-5 text-purple-400" />
                  <span className="text-sm font-semibold text-purple-200">Description</span>
                </div>
                <p className="text-base text-purple-100/90 leading-relaxed">
                  {node.description || `Learn more about "${node.label}" and how it connects to other concepts in your knowledge map.`}
                </p>
              </motion.div>

              {node.sourceSnippet && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Info className="h-5 w-5 text-purple-400" />
                    <span className="text-sm font-semibold text-purple-200">Source Snippet</span>
                  </div>
                  <p className="text-sm text-purple-100/80 leading-relaxed whitespace-pre-wrap">
                    {node.sourceSnippet}
                  </p>
                </motion.div>
              )}

              {showOutline && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18 }}
                  className="pt-4 border-t"
                  style={{ borderColor: 'hsl(265 60% 30% / 0.3)' }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="h-5 w-5 text-purple-400" />
                    <span className="text-sm font-semibold text-purple-200">{outlineLabel}</span>
                  </div>
                  {outline ? (
                    <pre className="text-xs text-purple-100/90 whitespace-pre-wrap leading-relaxed max-h-[32vh] overflow-y-auto">
                      {outline}
                    </pre>
                  ) : (
                    <p className="text-xs text-purple-100/70">{outlinePlaceholder}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {onDownloadOutline && (
                      <Button variant="outline" size="sm" onClick={onDownloadOutline}>
                        {downloadLabel}
                      </Button>
                    )}
                    {onCopyOutline && (
                      <Button variant="outline" size="sm" onClick={onCopyOutline}>
                        <Copy className="mr-2 h-3.5 w-3.5" />
                        {copyLabel}
                      </Button>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Key Details */}
              {node.details && node.details.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Info className="h-5 w-5 text-purple-400" />
                    <span className="text-sm font-semibold text-purple-200">Key Facts</span>
                  </div>
                  <ul className="space-y-2.5">
                    {node.details.map((detail, index) => (
                      <motion.li
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + index * 0.05 }}
                        className="flex items-start gap-3 text-base text-purple-100/80"
                      >
                        <span className="text-purple-400 mt-1 text-lg">•</span>
                        <span>{detail}</span>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {/* Connected Concepts */}
              {node.connections && node.connections.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="pt-4 border-t"
                  style={{ borderColor: 'hsl(265 60% 30% / 0.3)' }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <ArrowRight className="h-5 w-5 text-purple-400" />
                    <span className="text-sm font-semibold text-purple-200">Connected Concepts</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {node.connections.map((conn, index) => (
                      <motion.span
                        key={index}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 + index * 0.05 }}
                        className="text-sm px-3 py-1.5 rounded-full bg-purple-500/20 text-purple-200 border border-purple-500/30 hover:bg-purple-500/30 transition-colors cursor-pointer"
                      >
                        {conn}
                      </motion.span>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ZenModeSidePanel;

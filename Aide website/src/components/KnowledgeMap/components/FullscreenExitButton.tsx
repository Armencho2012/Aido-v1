import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FullscreenExitButtonProps {
  onExit: () => void;
}

export const FullscreenExitButton = ({ onExit }: FullscreenExitButtonProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const handleMouseMove = (e: MouseEvent) => {
      // Show button when mouse is near the top
      if (e.clientY < 80) {
        setIsVisible(true);
        clearTimeout(timeout);
      } else {
        // Hide after delay when mouse moves away
        timeout = setTimeout(() => setIsVisible(false), 1500);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[65]"
        >
          <Button
            variant="outline"
            size="sm"
            onClick={onExit}
            className="bg-card/95 backdrop-blur-sm border-border shadow-lg hover:bg-destructive/20 hover:text-destructive hover:border-destructive/50 active:scale-95 transition-all gap-2"
          >
            <X className="h-4 w-4" />
            Exit Zen Mode
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FullscreenExitButton;

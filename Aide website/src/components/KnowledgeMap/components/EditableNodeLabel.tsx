import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EditableNodeLabelProps {
  isOpen: boolean;
  nodeId: string;
  currentLabel: string;
  onSave: (nodeId: string, newLabel: string) => void;
  onCancel: () => void;
}

export const EditableNodeLabel = ({ isOpen, nodeId, currentLabel, onSave, onCancel }: EditableNodeLabelProps) => {
  const [label, setLabel] = useState(currentLabel);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setLabel(currentLabel);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, currentLabel]);

  const handleSave = () => {
    if (label.trim()) {
      onSave(nodeId, label.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onCancel}
    >
      <motion.div
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        className="bg-card border border-border rounded-xl p-6 shadow-2xl w-[400px]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4 text-foreground">Edit Node Label</h3>
        <input
          ref={inputRef}
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="Enter node label..."
        />
        <div className="flex justify-end gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="backdrop-blur-sm active:scale-95 transition-all"
          >
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!label.trim()}
            className="backdrop-blur-sm active:scale-95 transition-all"
          >
            <Check className="h-4 w-4 mr-1" />
            Save
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default EditableNodeLabel;

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  Beaker,
  BookOpen,
  Calculator,
  Languages,
  Cpu,
  Brain,
  Palette,
  Lightbulb,
  Circle,
  Star,
  FileText,
  AlertTriangle,
  type LucideIcon
} from 'lucide-react';
import { NodeCategory, categoryColors } from './types';

interface ConceptNodeData {
  label: string;
  category: NodeCategory;
  isActive?: boolean;
  isHighlighted?: boolean;
  description?: string;
  sourceSnippet?: string;
  size?: number;
  centrality?: number;
  masteryStatus?: 'locked' | 'unlocked' | 'mastered';
  isGhost?: boolean;
  isHighYield?: boolean;
  isRoot?: boolean;
  isZenMode?: boolean;
  onClick?: (label: string, description?: string, category?: string) => void;
}

interface ConceptNodeProps {
  data: ConceptNodeData;
}

const iconMap: Record<NodeCategory, LucideIcon> = {
  concept: Circle,
  problem: AlertTriangle,
  technology: Cpu,
  science: Beaker,
  history: BookOpen,
  math: Calculator,
  language: Languages,
  philosophy: Brain,
  art: Palette,
  general: Lightbulb,
  main: Star,
  section: FileText,
};

const ConceptNodeComponent = ({ data }: ConceptNodeProps) => {
  const {
    label,
    category,
    isActive,
    isHighlighted,
    description,
    sourceSnippet,
    size = 40,
    centrality = 0,
    masteryStatus = 'unlocked',
    isGhost = false,
    isHighYield = false,
    isRoot = false,
    isZenMode = false,
    onClick
  } = data;
  
  // Zen Mode scaling factor (25% larger)
  const zenScale = isZenMode ? 1.25 : 1;
  const colors = categoryColors[category] || categoryColors.general;
  const Icon = iconMap[category] || Lightbulb;

  // Determine visual state based on mastery
  const isLocked = masteryStatus === 'locked';
  const isMastered = masteryStatus === 'mastered';

  // Special styling for root/main node
  const rootGradient = 'linear-gradient(135deg, hsl(265, 85%, 55%), hsl(280, 90%, 45%), hsl(250, 85%, 60%))';
  const rootBorder = 'hsl(265, 85%, 65%)';
  const rootGlow = 'hsl(265, 85%, 60%)';

  // Adjust colors based on mastery status and root status
  const nodeBg = isRoot
    ? rootGradient
    : isGhost
      ? 'linear-gradient(135deg, hsl(215 12% 18% / 0.6), hsl(215 16% 28% / 0.6))'
    : isLocked
      ? 'hsl(215, 25%, 30%)'
    : isMastered
      ? 'linear-gradient(135deg, hsl(45, 90%, 55%), hsl(35, 95%, 60%))'
        : `linear-gradient(135deg, ${colors.bg}20, ${colors.bg}40)`;
  
  const nodeBorder = isRoot
    ? rootBorder
    : isGhost
      ? 'hsl(215, 15%, 35%)'
    : isLocked
      ? 'hsl(215, 25%, 40%)'
    : isMastered
      ? 'hsl(45, 90%, 60%)'
        : isActive ? colors.border : `${colors.border}60`;
  
  const nodeGlow = isRoot ? rootGlow : isMastered ? 'hsl(45, 90%, 60%)' : colors.glow;

  const handleClick = () => {
    if (!isLocked) {
      onClick?.(label, description, category);
    }
  };

  // Root node dimensions with Zen Mode scaling
  const nodeMinWidth = (isRoot ? 220 : Math.max(160, size)) * zenScale;
  const nodeMaxWidth = (isRoot ? 280 : 200) * zenScale;
  const nodePadding = isRoot 
    ? (isZenMode ? 'px-9 py-8' : 'px-7 py-6') 
    : (isZenMode ? 'px-6 py-5' : 'px-5 py-4');
  const iconSize = isRoot 
    ? (isZenMode ? 'h-10 w-10' : 'h-8 w-8') 
    : (isZenMode ? 'h-6 w-6' : 'h-5 w-5');
  const textSize = isRoot 
    ? (isZenMode ? 'text-2xl' : 'text-xl') 
    : (isZenMode ? 'text-lg' : 'text-base');
  const iconPadding = isRoot 
    ? (isZenMode ? 'p-4' : 'p-3') 
    : (isZenMode ? 'p-3' : 'p-2');

  return (
    <div
      onClick={handleClick}
      className="relative cursor-pointer transition-all duration-300 ease-out"
      style={{
        filter: isHighYield
          ? `drop-shadow(0 0 22px hsl(45, 90%, 60%))`
          : isActive || isRoot
            ? `drop-shadow(0 0 ${isRoot ? '35px' : '20px'} ${isRoot ? rootGlow : colors.glow})`
            : 'none',
        opacity: isGhost ? 0.5 : 1,
      }}
    >
      {isHighYield && !isRoot && (
        <div
          className="absolute -inset-3 rounded-3xl pointer-events-none animate-[pulse_2.8s_ease-in-out_infinite]"
          style={{
            boxShadow: '0 0 36px 10px hsl(45 90% 60% / 0.5)',
            filter: 'blur(1px)',
            zIndex: 0,
          }}
        />
      )}
      {/* Glassmorphism card with improved sizing and padding */}
      <div
        className={`relative ${nodePadding} rounded-2xl backdrop-blur-xl border-2 transition-all duration-300 hover:scale-105 ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${isMastered ? 'ring-2 ring-yellow-400 ring-offset-2' : ''} ${isHighYield ? 'ring-2 ring-amber-300 ring-offset-2 ring-offset-transparent' : ''} ${isRoot ? 'ring-4 ring-purple-400/50 ring-offset-4 ring-offset-transparent' : ''}`}
        style={{
          background: nodeBg,
          borderColor: nodeBorder,
          borderWidth: isRoot ? '3px' : '2px',
          minWidth: `${nodeMinWidth}px`,
          maxWidth: `${nodeMaxWidth}px`,
          width: 'auto',
          borderStyle: isGhost ? 'dashed' : 'solid',
          boxShadow: isRoot
            ? `0 0 60px -10px ${rootGlow}, 0 20px 50px -10px ${rootGlow}80, inset 0 2px 0 hsl(265 85% 70% / 0.4)`
            : isActive
              ? `0 12px 40px -4px ${nodeGlow}50, inset 0 1px 0 ${nodeBorder}30`
            : isMastered
              ? `0 8px 24px -2px hsl(45 90% 55% / 0.5), inset 0 1px 0 hsl(45 90% 60% / 0.3)`
            : `0 8px 24px -4px hsl(0 0% 0% / 0.3), inset 0 1px 0 hsl(0 0% 100% / 0.1)`,
          transform: isLocked ? 'scale(0.9)' : undefined,
        }}
        title={isLocked ? 'Complete related quiz to unlock' : isMastered ? 'Mastered!' : sourceSnippet || description || label}
      >
        {/* Root node animated background */}
        {isRoot && (
          <div
            className="absolute inset-0 rounded-2xl animate-pulse"
            style={{
              background: `radial-gradient(ellipse at center, ${rootGlow}30, transparent 70%)`,
              zIndex: 0,
            }}
          />
        )}

        {/* Active glow ring or pulse animation */}
        {(isActive || isHighlighted) && !isRoot && (
          <div
            className={`absolute inset-0 rounded-xl ${isHighlighted ? 'animate-[pulse_1.5s_ease-in-out_infinite]' : 'animate-pulse'}`}
            style={{
              background: isHighlighted
                ? `radial-gradient(ellipse at center, hsl(var(--primary)) 30%, transparent 70%)`
                : `radial-gradient(ellipse at center, ${nodeGlow}15, transparent 70%)`,
              border: isHighlighted ? '2px solid hsl(var(--primary))' : 'none',
              boxShadow: isHighlighted ? `0 0 30px hsl(var(--primary) / 0.8)` : 'none',
              zIndex: isHighlighted ? 10 : 0
            }}
          />
        )}

        {/* Mastery badge */}
        {isMastered && (
          <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 border-2 border-background flex items-center justify-center shadow-lg">
            <span className="text-xs">✓</span>
          </div>
        )}

        {isHighYield && !isRoot && (
          <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-amber-400 text-[10px] font-bold text-amber-950 shadow">
            High-Yield
          </div>
        )}

        {isGhost && (
          <div className="absolute -bottom-2 -left-2 px-2 py-0.5 rounded-full bg-slate-700/80 text-[10px] font-semibold text-slate-100 border border-slate-400/60 shadow">
            Ghost
          </div>
        )}

        {/* Locked indicator */}
        {isLocked && (
          <div className="absolute inset-0 rounded-xl bg-black/20 backdrop-blur-sm flex items-center justify-center">
            <span className="text-xs text-muted-foreground">🔒</span>
          </div>
        )}

        {/* Content - Improved typography */}
        <div className="relative flex items-center gap-3 z-10">
          <div
            className={`${iconPadding} rounded-lg flex-shrink-0`}
            style={{
              background: isRoot ? 'hsl(265, 85%, 70%, 0.4)' : `${colors.bg}60`,
            }}
          >
            <Icon className={`${iconSize} text-white`} />
          </div>
          <span 
            className={`${textSize} font-semibold text-white drop-shadow-md leading-tight`}
            style={{
              fontFamily: "'Inter', 'Geist', system-ui, sans-serif",
              maxWidth: isRoot ? '180px' : '140px',
              wordWrap: 'break-word',
              whiteSpace: 'normal',
            }}
          >
            {label}
          </span>
        </div>

        {/* Category indicator dot - hidden for root */}
        {!isRoot && (
          <div
            className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-background"
            style={{
              background: colors.bg,
              boxShadow: `0 0 8px ${colors.glow}`,
            }}
          />
        )}

        {/* Root crown indicator */}
        {isRoot && (
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-2xl">
            👑
          </div>
        )}
      </div>

      {/* Handles for connections */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-transparent !border-0 !w-4 !h-4"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-transparent !border-0 !w-4 !h-4"
      />
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-transparent !border-0 !w-4 !h-4"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-transparent !border-0 !w-4 !h-4"
      />
    </div>
  );
};

export default memo(ConceptNodeComponent);

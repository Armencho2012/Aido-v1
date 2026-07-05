import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  ConnectionLineType,
  MarkerType,
  Panel,
  NodeTypes,
  NodeChange,
  NodePositionChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { toPng } from 'html-to-image';
import { Trash2, Download, Maximize2, Minimize2, Map as MapIcon, X, Info, Sparkles, ArrowRight, BookOpen, RotateCcw, Copy, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import ConceptNodeComponent from './ConceptNodeComponent';
import { initialNodes, initialEdges, nodeDescriptions } from './mockData';
import { ConceptNode, ConceptEdge, KnowledgeMapData, categoryColors, NodeCategory, EdgeType, EdgeDirection } from './types';
import { ZenModeSidePanel } from './components/ZenModeSidePanel';
import { EditableNodeLabel } from './components/EditableNodeLabel';
import { FullscreenExitButton } from './components/FullscreenExitButton';
import { supabase } from '@/integrations/supabase/client';

interface KnowledgeMapProps {
  onNodeClick?: (nodeName: string, description?: string, category?: string) => void;
  activeNodeId?: string;
  data?: KnowledgeMapData | null;
  highlightedNodes?: Set<string>;
  language?: 'en' | 'ru' | 'hy' | 'ko';
  analysisId?: string;
  sourceText?: string;
}

const uiLabels = {
  en: {
    knowledgeMap: 'Knowledge Map',
    clearMap: 'Clear Map',
    clear: 'Clear',
    export: 'Export',
    save: 'Save',
    reset: 'Reset',
    mapCleared: 'Map Cleared',
    mapClearedDesc: 'The knowledge map has been reset.',
    exportSuccess: 'Export Successful',
    exportSuccessDesc: 'Your knowledge map has been exported as an image.',
    exportFail: 'Export Failed',
    exportFailDesc: 'Could not export the map. Please try again.',
    exportImage: 'Export Image',
    exportOutline: 'Export Outline (.md)',
    copyOutline: 'Copy for Notion',
    outlineCopied: 'Outline Copied',
    outlineCopiedDesc: 'Paste into Notion or any editor.',
    outlinePlaceholder: 'Outline not generated yet.',
    zenMode: 'Zen Mode',
    scan: 'Scan for Gaps',
    scanning: 'Scanning...',
    outline: 'Outline',
    download: 'Download .md',
    showLabels: 'Show Labels',
    hideLabels: 'Hide Labels',
    primaryLinks: 'Primary Links',
    allLinks: 'All Links',
    filters: 'Filters',
    layout: 'Layout',
    radial: 'Radial',
    force: 'Force',
    undo: 'Undo'
  },
  ru: {
    knowledgeMap: 'Карта Знаний',
    clearMap: 'Очистить карту',
    clear: 'Очистить',
    export: 'Экспорт',
    save: 'Сохранить',
    reset: 'Сброс',
    mapCleared: 'Карта очищена',
    mapClearedDesc: 'Карта знаний была сброшена.',
    exportSuccess: 'Экспорт выполнен успешно',
    exportSuccessDesc: 'Ваша карта знаний была экспортирована как изображение.',
    exportFail: 'Ошибка экспорта',
    exportFailDesc: 'Не удалось экспортировать карту. Попробуйте снова.',
    exportImage: 'Экспорт изображения',
    exportOutline: 'Экспорт плана (.md)',
    copyOutline: 'Копировать для Notion',
    outlineCopied: 'План скопирован',
    outlineCopiedDesc: 'Вставьте в Notion или редактор.',
    outlinePlaceholder: 'План пока не сгенерирован.',
    zenMode: 'Режим Дзен',
    scan: 'Поиск пробелов',
    scanning: 'Сканирование...',
    outline: 'План',
    download: 'Скачать .md',
    showLabels: 'Показать подписи',
    hideLabels: 'Скрыть подписи',
    primaryLinks: 'Основные связи',
    allLinks: 'Все связи',
    filters: 'Фильтры',
    layout: 'Макет',
    radial: 'Радиальный',
    force: 'Силовой',
    undo: 'Отменить'
  },
  hy: {
    knowledgeMap: 'Գիտելիքների Քարտեզ',
    clearMap: 'Մաքրել Քարտեզը',
    clear: 'Մաքրել',
    export: 'Արտահանել',
    save: 'Պահպանել',
    reset: 'Վերականգնել',
    mapCleared: 'Քարտեզը մաքրված է',
    mapClearedDesc: 'Գիտելիքների քարտեզը վերականգնվել է սկզբնական վիճակի:',
    exportSuccess: 'Արտահանումը հաջողվեց',
    exportSuccessDesc: 'Ձեր գիտելիքների քարտեզը արտահանվել է որպես պատկեր:',
    exportFail: 'Արտահանումը ձախողվեց',
    exportFailDesc: 'Չհաջողվեց արտահանել քարտեզը: Խնդրում ենք փորձել կրկին:',
    exportImage: 'Արտահանել պատկեր',
    exportOutline: 'Արտահանել պլան (.md)',
    copyOutline: 'Պատճենել Notion-ի համար',
    outlineCopied: 'Պլանը պատճենված է',
    outlineCopiedDesc: 'Տեղադրեք Notion-ում կամ խմբագրում։',
    outlinePlaceholder: 'Պլանը դեռ չի ստեղծվել։',
    zenMode: 'Զեն ռեժիմ',
    scan: 'Բացթողումների սկանավորում',
    scanning: 'Սկանավորում...',
    outline: 'Ընդհանուր պլան',
    download: 'Ներբեռնել .md',
    showLabels: 'Ցույց տալ մակագրությունները',
    hideLabels: 'Թաքցնել մակագրությունները',
    primaryLinks: 'Հիմնական կապեր',
    allLinks: 'Բոլոր կապերը',
    filters: 'Ֆիլտրեր',
    layout: 'Դասավորություն',
    radial: 'Շառավղային',
    force: 'Ուժային',
    undo: 'Հետարկել'
  },
  ko: {
    knowledgeMap: '지식 맵',
    clearMap: '맵 지우기',
    clear: '지우기',
    export: '내보내기',
    save: '저장',
    reset: '초기화',
    mapCleared: '맵이 지워졌습니다',
    mapClearedDesc: '지식 맵이 초기화되었습니다.',
    exportSuccess: '내보내기 성공',
    exportSuccessDesc: '지식 맵이 이미지로 내보내졌습니다.',
    exportFail: '내보내기 실패',
    exportFailDesc: '맵을 내보낼 수 없습니다. 다시 시도해 주세요.',
    exportImage: '이미지 내보내기',
    exportOutline: '아웃라인 내보내기 (.md)',
    copyOutline: 'Notion용 복사',
    outlineCopied: '아웃라인 복사됨',
    outlineCopiedDesc: 'Notion 또는 편집기에 붙여넣으세요.',
    outlinePlaceholder: '아직 아웃라인이 생성되지 않았습니다.',
    zenMode: '젠 모드',
    scan: '빈틈 스캔',
    scanning: '스캔 중...',
    outline: '아웃라인',
    download: '다운로드 .md',
    showLabels: '라벨 표시',
    hideLabels: '라벨 숨기기',
    primaryLinks: '주요 링크',
    allLinks: '모든 링크',
    filters: '필터',
    layout: '레이아웃',
    radial: '방사형',
    force: '포스',
    undo: '되돌리기'
  }
};

const nodeTypes: NodeTypes = {
  conceptNode: ConceptNodeComponent,
};

const getNodeColor = (node: Node): string => {
  const category = node.data?.category as NodeCategory;
  const colors = categoryColors[category] || categoryColors.concept;
  return colors.bg;
};

const labelFromType = (type?: EdgeType, fallback?: string) => {
  if (fallback) return fallback;
  switch (type) {
    case 'enables':
      return 'enables';
    case 'essential_for':
      return 'essential for';
    case 'challenges':
      return 'challenges';
    case 'is_a_type_of':
      return 'is a type of';
    case 'relates_to':
      return 'relates to';
    default:
      return 'relates to';
  }
};

const styleForEdgeType = (type: EdgeType | undefined, isZenMode: boolean, isGhost = false) => {
  const palette: Record<EdgeType, string> = {
    enables: 'hsl(145, 65%, 50%)',
    essential_for: 'hsl(200, 80%, 60%)',
    challenges: 'hsl(5, 80%, 60%)',
    relates_to: 'hsl(265, 60%, 55%)',
    is_a_type_of: 'hsl(35, 80%, 60%)',
  };
  const base = {
    stroke: isGhost ? 'hsl(215, 18%, 60%)' : palette[type || 'relates_to'],
    strokeWidth: isZenMode ? 3 : 2,
    strokeLinecap: 'round' as const,
    opacity: isGhost ? 0.45 : 1,
    strokeDasharray: isGhost ? '6 6' : undefined,
  };
  if (type === 'challenges') {
    return {
      ...base,
      strokeWidth: isZenMode ? 3.5 : 2.5,
      strokeDasharray: isGhost ? '6 6' : '8 6',
    };
  }
  if (type === 'enables' || type === 'essential_for') {
    return {
      ...base,
      strokeWidth: isZenMode ? 4.5 : 3.5,
    };
  }
  if (type === 'is_a_type_of') {
    return {
      ...base,
      strokeWidth: isZenMode ? 3 : 2.2,
    };
  }
  return {
    ...base,
    strokeWidth: isZenMode ? 2.5 : 1.8,
  };
};

const normalizeCategory = (value?: string): NodeCategory => {
  const normalized = (value || '').toLowerCase();
  if (normalized === 'concept') return 'concept';
  if (normalized === 'problem') return 'problem';
  if (normalized === 'technology') return 'technology';
  if (normalized === 'science') return 'science';
  if (normalized === 'history') return 'history';
  if (normalized === 'math') return 'math';
  if (normalized === 'language') return 'language';
  if (normalized === 'philosophy') return 'philosophy';
  if (normalized === 'art') return 'art';
  if (normalized === 'main') return 'main';
  if (normalized === 'section') return 'section';
  return 'general';
};

const normalizeEdgeType = (value?: string): EdgeType => {
  const normalized = (value || '').toLowerCase();
  if (normalized === 'enables') return 'enables';
  if (normalized === 'challenges') return 'challenges';
  if (normalized === 'contradiction' || normalized === 'contradictions' || normalized === 'contradicts') return 'challenges';
  if (normalized === 'is_a_type_of' || normalized === 'is a type of') return 'is_a_type_of';
  if (normalized === 'essential_for' || normalized === 'essential for') return 'essential_for';
  return 'relates_to';
};

const buildOutlineMarkdown = (nodes: ConceptNode[], edges: ConceptEdge[]) => {
  const nodesById = new Map(nodes.map(node => [node.id, node]));
  const categories = new Map<NodeCategory, ConceptNode[]>();
  nodes.forEach(node => {
    const list = categories.get(node.category) || [];
    list.push(node);
    categories.set(node.category, list);
  });

  const connectionMap = new Map<string, ConceptEdge[]>();
  edges.forEach(edge => {
    if (!connectionMap.has(edge.source)) connectionMap.set(edge.source, []);
    if (!connectionMap.has(edge.target)) connectionMap.set(edge.target, []);
    connectionMap.get(edge.source)!.push(edge);
    connectionMap.get(edge.target)!.push(edge);
  });

  const lines: string[] = ['# Structured Outline', ''];
  const orderedCategories = Array.from(categories.keys());
  orderedCategories.forEach(category => {
    lines.push(`## ${category.replace('_', ' ').toUpperCase()}`);
    const list = categories.get(category) || [];
    list.forEach(node => {
      lines.push(`- ${node.label}`);
      const connections = connectionMap.get(node.id) || [];
      connections.slice(0, 6).forEach(edge => {
        const otherId = edge.source === node.id ? edge.target : edge.source;
        const other = nodesById.get(otherId)?.label || otherId;
        const rel = labelFromType(edge.type, edge.label);
        lines.push(`  - ${rel} → ${other}`);
      });
    });
    lines.push('');
  });
  return lines.join('\n');
};

interface LayoutResult {
  nodes: Node[];
  edges: Edge[];
}

const createForcePositions = (
  conceptNodes: ConceptNode[],
  conceptEdges: ConceptEdge[],
  isZenMode?: boolean
): globalThis.Map<string, { x: number; y: number }> => {
  const positions = new globalThis.Map<string, { x: number; y: number }>();
  const nodeCount = conceptNodes.length || 1;
  const radius = isZenMode ? 640 : 520;

  conceptNodes.forEach((node, index) => {
    const angle = (index / nodeCount) * Math.PI * 2;
    positions.set(node.id, {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    });
  });

  const iterations = isZenMode ? 260 : 180;
  const repulsion = 18000;
  const spring = 0.06;
  const desired = 260;

  for (let iter = 0; iter < iterations; iter += 1) {
    const forces = new globalThis.Map<string, { x: number; y: number }>();
    conceptNodes.forEach(node => forces.set(node.id, { x: 0, y: 0 }));

    for (let i = 0; i < conceptNodes.length; i += 1) {
      for (let j = i + 1; j < conceptNodes.length; j += 1) {
        const a = conceptNodes[i];
        const b = conceptNodes[j];
        const pa = positions.get(a.id) || { x: 0, y: 0 };
        const pb = positions.get(b.id) || { x: 0, y: 0 };
        const dx = pa.x - pb.x;
        const dy = pa.y - pb.y;
        const dist = Math.max(40, Math.hypot(dx, dy));
        const force = repulsion / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        const fa = forces.get(a.id)!;
        const fb = forces.get(b.id)!;
        fa.x += fx;
        fa.y += fy;
        fb.x -= fx;
        fb.y -= fy;
      }
    }

    conceptEdges.forEach(edge => {
      const pa = positions.get(edge.source);
      const pb = positions.get(edge.target);
      if (!pa || !pb) return;
      const dx = pb.x - pa.x;
      const dy = pb.y - pa.y;
      const dist = Math.max(20, Math.hypot(dx, dy));
      const delta = dist - desired;
      const fx = (dx / dist) * delta * spring;
      const fy = (dy / dist) * delta * spring;
      const fa = forces.get(edge.source);
      const fb = forces.get(edge.target);
      if (fa) {
        fa.x += fx;
        fa.y += fy;
      }
      if (fb) {
        fb.x -= fx;
        fb.y -= fy;
      }
    });

    conceptNodes.forEach(node => {
      const pos = positions.get(node.id) || { x: 0, y: 0 };
      const force = forces.get(node.id) || { x: 0, y: 0 };
      positions.set(node.id, {
        x: pos.x + force.x * 0.08,
        y: pos.y + force.y * 0.08,
      });
    });
  }

  return positions;
};

const createTreeLayout = (
  conceptNodes: ConceptNode[],
  conceptEdges: ConceptEdge[],
  activeNodeId?: string,
  highlightedNodes?: Set<string>,
  isZenMode?: boolean,
  layoutMode: 'radial' | 'force' = 'radial',
  showEdgeLabels = true,
  showSecondaryEdges = true
): LayoutResult => {
  if (conceptNodes.length === 0) return { nodes: [], edges: [] };

  // Scale factor for Zen Mode (25% larger text/padding handled in node component)
  const scaleFactor = isZenMode ? 1.25 : 1;

  // 1. Build Adjacency List from original edges
  const adjacency = new globalThis.Map<string, string[]>();
  conceptNodes.forEach(node => {
    adjacency.set(node.id, []);
  });

  conceptEdges.forEach(edge => {
    if (adjacency.has(edge.source)) adjacency.get(edge.source)?.push(edge.target);
    if (adjacency.has(edge.target)) adjacency.get(edge.target)?.push(edge.source);
  });

  // 2. Identify Root (main node or highest degree)
  let rootId = conceptNodes[0]?.id;
  const mainNode = conceptNodes.find(n => n.category === 'main');
  if (mainNode) {
    rootId = mainNode.id;
  } else {
    let maxDegree = -1;
    conceptNodes.forEach(node => {
      const degree = adjacency.get(node.id)?.length || 0;
      if (degree > maxDegree) {
        maxDegree = degree;
        rootId = node.id;
      }
    });
  }

  // 3. Build Spanning Tree (BFS) - THIS IS THE KEY: tree edges NEVER cross
  const childrenMap = new globalThis.Map<string, string[]>();
  const parentMap = new globalThis.Map<string, string | null>();
  const visited = new globalThis.Set<string>();
  const queue = [rootId];
  visited.add(rootId);
  childrenMap.set(rootId, []);
  parentMap.set(rootId, null);

  // Store tree edges as we build the tree
  const edgeKey = (a: string, b: string) => (a < b ? `${a}::${b}` : `${b}::${a}`);
  const treeEdgePairs = new Set<string>();

  while (queue.length > 0) {
    const u = queue.shift()!;
    const neighbors = adjacency.get(u) || [];
    for (const v of neighbors) {
      if (!visited.has(v)) {
        visited.add(v);
        childrenMap.get(u)?.push(v);
        childrenMap.set(v, []);
        parentMap.set(v, u);
        queue.push(v);
        // Add tree edge (parent -> child)
        treeEdgePairs.add(edgeKey(u, v));
      }
    }
  }

  // Handle disconnected nodes - attach to root
  conceptNodes.forEach(node => {
    if (!visited.has(node.id)) {
      visited.add(node.id);
      childrenMap.get(rootId)?.push(node.id);
      childrenMap.set(node.id, []);
      parentMap.set(node.id, rootId);
      treeEdgePairs.add(edgeKey(rootId, node.id));
    }
  });

  const renderEdges: ConceptEdge[] = showSecondaryEdges
    ? [...conceptEdges]
    : conceptEdges.filter(edge => edge.is_ghost || treeEdgePairs.has(edgeKey(edge.source, edge.target)));

  // 4. Calculate Subtree Sizes for proportional angle allocation
  const subtreeSizes = new globalThis.Map<string, number>();
  const calcSize = (u: string): number => {
    let size = 1;
    const children = childrenMap.get(u) || [];
    for (const v of children) {
      size += calcSize(v);
    }
    subtreeSizes.set(u, size);
    return size;
  };
  calcSize(rootId);

  // 5. Calculate node depths
  const depths = new globalThis.Map<string, number>();
  const calcDepth = (u: string, depth: number) => {
    depths.set(u, depth);
    const children = childrenMap.get(u) || [];
    for (const v of children) {
      calcDepth(v, depth + 1);
    }
  };
  calcDepth(rootId, 0);

  // 6. Layout positions
  let positions = new globalThis.Map<string, { x: number; y: number }>();

  if (layoutMode === 'force') {
    positions = createForcePositions(conceptNodes, showSecondaryEdges ? conceptEdges : renderEdges, isZenMode);
  } else {
    // Radial Tree Layout - MUCH more spacing, guaranteed no crossing
    const LAYER_SPACING = 520 * scaleFactor; // Much bigger spacing between layers
    const MIN_NODE_SPACING = 0.45; // Minimum angle gap between siblings (radians)

    const layoutNode = (u: string, startAngle: number, endAngle: number) => {
      const depth = depths.get(u) || 0;
      const radius = depth * LAYER_SPACING;
      const midAngle = (startAngle + endAngle) / 2;

      positions.set(u, {
        x: Math.cos(midAngle) * radius,
        y: Math.sin(midAngle) * radius
      });

      const children = childrenMap.get(u) || [];
      if (children.length === 0) return;

      const totalWeight = children.reduce((sum, v) => sum + (subtreeSizes.get(v) || 1), 0);
      const totalSweep = endAngle - startAngle;

      // Ensure minimum spacing between children
      const requiredPadding = MIN_NODE_SPACING * (children.length - 1);
      const availableSweep = Math.max(totalSweep - requiredPadding, totalSweep * 0.7);
      const actualPadding = (totalSweep - availableSweep) / Math.max(1, children.length - 1);

      let currentAngle = startAngle;

      for (let i = 0; i < children.length; i++) {
        const v = children[i];
        const weight = subtreeSizes.get(v) || 1;
        const share = weight / totalWeight;
        const angleWidth = availableSweep * share;

        layoutNode(v, currentAngle, currentAngle + angleWidth);
        currentAngle += angleWidth + actualPadding;
      }
    };

    // Start layout from root with full circle
    layoutNode(rootId, 0, 2 * Math.PI);
  }

  // 7. Create Flow Nodes
  const flowNodes: Node[] = conceptNodes.map((node) => {
    const pos = positions.get(node.id) || { x: 0, y: 0 };
    const isActive = node.id === activeNodeId;
    const isHighlighted = highlightedNodes?.has(node.id);
    const isRoot = node.id === rootId;

    let size: number;
    if (isRoot) {
      size = 240 * scaleFactor; // Big central node
    } else {
      const baseSize = 100 + (node.label?.length || 0) * 1.5;
      size = Math.min(Math.max(baseSize, 80), 160) * scaleFactor;
    }

    return {
      id: node.id,
      type: 'conceptNode',
      position: pos,
      data: {
        label: node.label,
        category: isRoot ? 'main' : node.category,
        description: node.description || '',
        sourceSnippet: node.source_snippet,
        isGhost: node.is_ghost,
        isHighYield: node.is_high_yield,
        isActive,
        isHighlighted,
        size,
        isRoot,
        isZenMode,
      },
    };
  });

  // 8. Create edges from the original data (preserve types + direction)
  const parallelGroups = new Map<string, ConceptEdge[]>();
  renderEdges.forEach((edge) => {
    const key = edgeKey(edge.source, edge.target);
    const list = parallelGroups.get(key) || [];
    list.push(edge);
    parallelGroups.set(key, list);
  });

  const flowEdges: Edge[] = renderEdges
    .map((edge, index) => {
      const isGhostEdge = !!edge.is_ghost;
      const label = showEdgeLabels ? labelFromType(edge.type, edge.label) : undefined;
      const edgeStyle = styleForEdgeType(edge.type, isZenMode, isGhostEdge);
      const isHighlightedEdge = highlightedNodes?.has(edge.source) && highlightedNodes?.has(edge.target);
      const baseOpacity = typeof edgeStyle.opacity === 'number' ? edgeStyle.opacity : 1;
      const finalOpacity = highlightedNodes && !isHighlightedEdge ? baseOpacity * 0.25 : baseOpacity;
      const finalStyle = {
        ...edgeStyle,
        stroke: isHighlightedEdge ? 'hsl(195, 85%, 70%)' : edgeStyle.stroke,
        strokeWidth: isHighlightedEdge ? (isZenMode ? 4 : 3) : edgeStyle.strokeWidth,
        opacity: finalOpacity,
      };
      const groupKey = edgeKey(edge.source, edge.target);
      const group = parallelGroups.get(groupKey) || [edge];
      const groupIndex = Math.max(0, group.findIndex((g) => g === edge));
      const offsetIndex = groupIndex - (group.length - 1) / 2;
      const curveOffset = group.length > 1 ? offsetIndex * 28 : 0;
      const labelOffset = group.length > 1 ? offsetIndex * 14 : 0;
      const markerScale =
        edge.type === 'enables' || edge.type === 'essential_for'
          ? 1.35
          : edge.type === 'challenges'
            ? 1.2
            : 1;
      const markerSize = (isZenMode ? 18 : 15) * markerScale * (isGhostEdge ? 0.9 : 1);
      const marker = {
        type: MarkerType.ArrowClosed,
        color: finalStyle.stroke as string,
        width: markerSize,
        height: markerSize,
      };

      return {
        id: edge.id || `map-edge-${index}`,
        source: edge.source,
        target: edge.target,
        type: 'smoothstep',
        pathOptions: { offset: Math.max(Math.abs(curveOffset), 12), borderRadius: 16 },
        label,
        labelStyle: showEdgeLabels
          ? {
              fill: isGhostEdge ? 'hsl(215, 20%, 75%)' : 'hsl(265, 80%, 80%)',
              fontWeight: 600,
              fontSize: isZenMode ? 14 : 11,
              textShadow: '0 1px 3px hsl(0 0% 0% / 0.8)',
              transform: labelOffset ? `translateY(${labelOffset}px)` : undefined,
            }
          : undefined,
        labelBgStyle: showEdgeLabels
          ? {
              fill: isGhostEdge ? 'hsl(215, 25%, 18%)' : 'hsl(265, 40%, 15%)',
              fillOpacity: isGhostEdge ? 0.6 : 0.9,
              rx: 4,
              ry: 4,
            }
          : undefined,
        labelBgPadding: showEdgeLabels ? ([6, 4] as [number, number]) : undefined,
        style: finalStyle,
        markerEnd: marker,
        markerStart: edge.direction === 'bi' ? marker : undefined,
        data: { edgeType: edge.type, direction: edge.direction, isGhost: isGhostEdge },
      };
    })
    .filter((edge): edge is NonNullable<typeof edge> => edge !== null) as any[];

  return { nodes: flowNodes, edges: flowEdges };
};

export const KnowledgeMap = ({ onNodeClick, activeNodeId, data, highlightedNodes, language = 'en', analysisId, sourceText }: KnowledgeMapProps) => {
  const { toast } = useToast();
  const flowRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isZenMode, setIsZenMode] = useState(false);
  const [selectedNode, setSelectedNode] = useState<{
    id: string;
    label: string;
    category: string;
    description?: string;
    details?: string[];
    connections?: string[];
    sourceSnippet?: string;
    isGhost?: boolean;
    isHighYield?: boolean;
  } | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<'radial' | 'force'>('radial');
  const [edgeTypeFilters, setEdgeTypeFilters] = useState<Record<EdgeType, boolean>>({
    enables: true,
    challenges: true,
    relates_to: true,
    is_a_type_of: true,
    essential_for: true,
  });
  const [showEdgeLabels, setShowEdgeLabels] = useState(true);
  const [showSecondaryEdges, setShowSecondaryEdges] = useState(false);
  const [ghostNodes, setGhostNodes] = useState<ConceptNode[]>([]);
  const [ghostEdges, setGhostEdges] = useState<ConceptEdge[]>([]);
  const [outlineContent, setOutlineContent] = useState<string | null>(null);
  const [showOutlinePanel, setShowOutlinePanel] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [positionHistory, setPositionHistory] = useState<Map<string, { x: number; y: number }>[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Edit modal state
  const [editingNode, setEditingNode] = useState<{ id: string; label: string } | null>(null);

  // Persistence: track if user has made changes
  const [hasUserChanges, setHasUserChanges] = useState(false);
  const [userNodePositions, setUserNodePositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const [userNodeLabels, setUserNodeLabels] = useState<Map<string, string>>(new Map());

  const labels = uiLabels[language] || uiLabels.en;

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const hoveredNodes = useMemo(() => {
    if (!hoveredNodeId) return new Set<string>();
    const sourceNodes = data?.nodes || initialNodes;
    const sourceEdges = data?.edges || initialEdges;
    const connected = new Set<string>([hoveredNodeId]);
    sourceEdges.forEach(edge => {
      if (edge.source === hoveredNodeId) connected.add(edge.target);
      if (edge.target === hoveredNodeId) connected.add(edge.source);
    });
    sourceNodes.forEach(node => {
      if (node.connectedTo?.includes(hoveredNodeId)) connected.add(node.id);
    });
    return connected;
  }, [hoveredNodeId, data]);

  const currentMapData = useMemo(() => {
    const sourceNodes = data?.nodes || initialNodes;
    const sourceEdges = data?.edges || initialEdges;
    const nodes = [...sourceNodes, ...ghostNodes].map(node => ({
      ...node,
      category: normalizeCategory(node.category),
      label: userNodeLabels.get(node.id) || node.label,
    }));
    const edges: ConceptEdge[] = [...sourceEdges, ...ghostEdges].map(edge => ({
      ...edge,
      type: normalizeEdgeType(edge.type),
      direction: (edge.direction === 'bi' ? 'bi' : 'uni') as EdgeDirection,
      is_ghost: edge.is_ghost,
    }));
    return { nodes, edges };
  }, [data, ghostNodes, ghostEdges, userNodeLabels]);

  // Calculate layout with user modifications applied
  const layoutResult = useMemo(() => {
    const filteredEdges = currentMapData.edges.filter(edge => edgeTypeFilters[edge.type || 'relates_to']);

    const combinedHighlights = highlightedNodes
      ? new Set([...Array.from(highlightedNodes), ...Array.from(hoveredNodes)])
      : hoveredNodes;

    return createTreeLayout(
      currentMapData.nodes,
      filteredEdges,
      activeNodeId,
      combinedHighlights,
      isZenMode,
      layoutMode,
      showEdgeLabels,
      showSecondaryEdges
    );
  }, [currentMapData, activeNodeId, highlightedNodes, isZenMode, hoveredNodes, edgeTypeFilters, layoutMode, showEdgeLabels, showSecondaryEdges]);

  // Apply user position changes to layout result
  const nodesWithUserPositions = useMemo(() => {
    if (userNodePositions.size === 0) return layoutResult.nodes;
    return layoutResult.nodes.map(node => {
      const userPos = userNodePositions.get(node.id);
      return userPos ? { ...node, position: userPos } : node;
    });
  }, [layoutResult.nodes, userNodePositions]);

  const [nodes, setNodes, onNodesChange] = useNodesState(nodesWithUserPositions);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutResult.edges);

  // Sync nodes when layout changes (but preserve user positions)
  useEffect(() => {
    if (!hasUserChanges) {
      setNodes(nodesWithUserPositions);
      setEdges(layoutResult.edges);
    } else {
      // Only update edges, keep user node positions
      setEdges(layoutResult.edges);
    }
  }, [nodesWithUserPositions, layoutResult.edges, hasUserChanges, setNodes, setEdges]);

  // Handle node position changes (drag)
  const handleNodesChange = useCallback((changes: NodeChange<Node>[]) => {
    onNodesChange(changes);

    // Track position changes for persistence
    changes.forEach(change => {
      if (change.type === 'position' && change.position) {
        const posChange = change as NodePositionChange;
        if (posChange.position) {
          setUserNodePositions(prev => {
            const newMap = new Map(prev);
            newMap.set(change.id, posChange.position!);
            return newMap;
          });
          setHasUserChanges(true);
        }
      }
    });
  }, [onNodesChange]);

  const handleNodeDragStop = useCallback(() => {
    const snapshot = new Map(nodes.map(node => [node.id, node.position]));
    setPositionHistory(prev => {
      const next = [...prev, snapshot];
      if (next.length > 20) next.shift();
      return next;
    });
  }, [nodes]);

  // Handle node double-click for editing
  const handleNodeDoubleClick = useCallback((_event: React.MouseEvent, node: Node) => {
    const nodeData = node.data as { label: string };
    setEditingNode({ id: node.id, label: nodeData.label });
  }, []);

  // Save edited label
  const handleSaveLabel = useCallback((nodeId: string, newLabel: string) => {
    setUserNodeLabels(prev => {
      const newMap = new Map(prev);
      newMap.set(nodeId, newLabel);
      return newMap;
    });
    setHasUserChanges(true);
    setEditingNode(null);

    // Update the selected node if it's the one being edited
    setSelectedNode(prev => prev?.id === nodeId ? { ...prev, label: newLabel } : prev);

    // Update nodes state directly
    setNodes(nds => nds.map(n =>
      n.id === nodeId ? { ...n, data: { ...n.data, label: newLabel } } : n
    ));
  }, [setNodes]);

  // Handle node click - show comprehensive info panel
  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    const nodeData = node.data as { label: string; category: string; description?: string; sourceSnippet?: string; isGhost?: boolean; isHighYield?: boolean };
    const nodeId = node.id;

    // Find connected nodes
    const sourceNodes = data?.nodes || initialNodes;
    const sourceEdges = data?.edges || initialEdges;
    const currentNode = sourceNodes.find(n => n.id === nodeId);
    // Get description and details from nodeDescriptions
    const nodeInfo = nodeDescriptions[nodeId] || {
      description: currentNode?.description || nodeData.description || `Learn more about "${nodeData.label}"`,
      details: []
    };
    const connections = currentNode?.connectedTo && currentNode.connectedTo.length > 0
      ? currentNode.connectedTo
      : sourceEdges
        .filter(edge => edge.source === nodeId || edge.target === nodeId)
        .map(edge => edge.source === nodeId ? edge.target : edge.source);
    const connectionLabels = connections.map(connId => {
      const connNode = sourceNodes.find(n => n.id === connId);
      return connNode?.label || connId;
    });

    setSelectedNode({
      id: nodeId,
      label: userNodeLabels.get(nodeId) || nodeData.label,
      category: nodeData.category,
      description: nodeData.sourceSnippet || nodeInfo.description,
      details: nodeInfo.details,
      connections: connectionLabels,
      sourceSnippet: nodeData.sourceSnippet,
      isGhost: nodeData.isGhost,
      isHighYield: nodeData.isHighYield,
    });
    onNodeClick?.(nodeData.label, nodeInfo.description, nodeData.category);
  }, [onNodeClick, data, userNodeLabels]);

  const closeInfoPanel = useCallback(() => {
    setSelectedNode(null);
    setShowOutlinePanel(false);
  }, []);

  const clearState = useCallback(() => {
    setNodes([]);
    setEdges([]);
  }, [setNodes, setEdges]);

  // Reset to initial layout
  const resetToInitial = useCallback(() => {
    setUserNodePositions(new Map());
    setUserNodeLabels(new Map());
    setHasUserChanges(false);
    setNodes(layoutResult.nodes);
    setEdges(layoutResult.edges);
    toast({
      title: labels.mapCleared,
      description: labels.mapClearedDesc,
    });
  }, [layoutResult, setNodes, setEdges, toast, labels]);

  // Zen Mode toggle with Browser Fullscreen API
  const toggleZenMode = useCallback(async () => {
    if (!isZenMode) {
      // Enter Zen Mode
      try {
        if (containerRef.current?.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        }
      } catch (e) {
        console.warn('Fullscreen API not available:', e);
      }
      setIsZenMode(true);
    } else {
      // Exit Zen Mode
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        }
      } catch (e) {
        console.warn('Error exiting fullscreen:', e);
      }
      setIsZenMode(false);
    }
  }, [isZenMode]);

  // Handle ESC key and fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isZenMode) {
        setIsZenMode(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isZenMode) {
        toggleZenMode();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isZenMode, toggleZenMode]);

  const handleClearMap = useCallback(() => {
    clearState();
    toast({
      title: labels.mapCleared,
      description: labels.mapClearedDesc,
    });
  }, [clearState, toast, labels]);

  const handleExportImage = useCallback(async () => {
    if (!flowRef.current) return;

    try {
      const dataUrl = await toPng(flowRef.current, {
        backgroundColor: 'hsl(215, 30%, 12%)',
        quality: 1,
        pixelRatio: 2,
      });

      const link = document.createElement('a');
      link.download = 'knowledge-map.png';
      link.href = dataUrl;
      link.click();

      toast({
        title: labels.exportSuccess,
        description: labels.exportSuccessDesc,
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: labels.exportFail,
        description: labels.exportFailDesc,
        variant: 'destructive',
      });
    }
  }, [toast, labels]);

  const persistOutline = useCallback(async (outline: string) => {
    if (!analysisId) return;
    try {
      const { data: existing, error: fetchError } = await supabase
        .from('user_content')
        .select('analysis_data')
        .eq('id', analysisId)
        .single();
      if (fetchError) {
        console.error('Outline fetch error:', fetchError);
        return;
      }
      const existingData = (existing?.analysis_data && typeof existing.analysis_data === 'object') ? existing.analysis_data : {};
      const updatedAnalysis = {
        ...existingData,
        structured_outline_md: outline,
      };
      const { error: updateError } = await supabase
        .from('user_content')
        .update({ analysis_data: updatedAnalysis })
        .eq('id', analysisId);
      if (updateError) {
        console.error('Outline save error:', updateError);
      }
    } catch (error) {
      console.error('Outline save error:', error);
    }
  }, [analysisId]);

  const ensureOutline = useCallback(async (options?: { openPanel?: boolean }) => {
    if (outlineContent) {
      if (options?.openPanel) setShowOutlinePanel(true);
      return outlineContent;
    }
    const outline = buildOutlineMarkdown(currentMapData.nodes, currentMapData.edges);
    setOutlineContent(outline);
    if (options?.openPanel) setShowOutlinePanel(true);
    await persistOutline(outline);
    return outline;
  }, [outlineContent, currentMapData, persistOutline]);

  const handleGenerateOutline = useCallback(async () => {
    await ensureOutline({ openPanel: true });
  }, [ensureOutline]);

  const handleDownloadOutline = useCallback(async () => {
    const outline = await ensureOutline();
    if (!outline) return;
    const blob = new Blob([outline], { type: 'text/markdown;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'structured_outline.md';
    link.click();
    URL.revokeObjectURL(link.href);
  }, [ensureOutline]);

  const handleCopyOutline = useCallback(async () => {
    const outline = await ensureOutline();
    if (!outline) return;
    try {
      await navigator.clipboard.writeText(outline);
      toast({
        title: labels.outlineCopied,
        description: labels.outlineCopiedDesc,
      });
    } catch (error) {
      console.error('Outline copy failed:', error);
      toast({
        title: labels.exportFail,
        description: labels.exportFailDesc,
        variant: 'destructive',
      });
    }
  }, [ensureOutline, toast, labels]);

  useEffect(() => {
    if (!selectedNode) return;
    setShowOutlinePanel(true);
    if (!outlineContent) {
      void ensureOutline();
    }
  }, [selectedNode, outlineContent, ensureOutline]);

  const handleScanForGaps = useCallback(async () => {
    if (!sourceText) {
      toast({
        title: labels.exportFail,
        description: 'Source text is not available for gap scanning.',
        variant: 'destructive',
      });
      return;
    }
    setIsScanning(true);
    try {
      const { data: scanData, error } = await supabase.functions.invoke('scan-knowledge-map', {
        body: {
          text: sourceText,
          knowledge_map: {
            nodes: currentMapData.nodes,
            edges: currentMapData.edges,
          },
          language,
        },
      });
      if (error) throw error;
      const ghostNodesPayload: ConceptNode[] = (scanData?.ghost_nodes || []).map((node: ConceptNode, idx: number) => ({
        ...node,
        id: node.id || `ghost-${idx + 1}`,
        category: normalizeCategory(node.category),
        is_ghost: true,
      }));
      const ghostEdgesPayload: ConceptEdge[] = (scanData?.ghost_edges || []).map((edge: ConceptEdge, idx: number) => ({
        ...edge,
        id: edge.id || `ghost-edge-${idx + 1}`,
        type: normalizeEdgeType(edge.type),
        direction: edge.direction === 'bi' ? 'bi' : 'uni',
        is_ghost: true,
      }));

      setGhostNodes(prev => {
        const existing = new Set(prev.map(node => node.id));
        return [...prev, ...ghostNodesPayload.filter(node => !existing.has(node.id))];
      });
      setGhostEdges(prev => {
        const existing = new Set(prev.map(edge => edge.id));
        return [...prev, ...ghostEdgesPayload.filter(edge => !existing.has(edge.id))];
      });
    } catch (error) {
      console.error('Gap scan failed:', error);
      toast({
        title: labels.exportFail,
        description: 'Gap scan failed. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsScanning(false);
    }
  }, [sourceText, currentMapData, language, toast, labels]);

  const handleUndo = useCallback(() => {
    setPositionHistory(prev => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      const last = next.pop();
      if (last) {
        setUserNodePositions(last);
        setNodes(nds => nds.map(node => {
          const pos = last.get(node.id);
          return pos ? { ...node, position: pos } : node;
        }));
        setHasUserChanges(true);
      }
      return next;
    });
  }, []);

  const handleAcceptGhostNode = useCallback(() => {
    if (!selectedNode?.id) return;
    setGhostNodes(prev => prev.map(node => node.id === selectedNode.id ? { ...node, is_ghost: false } : node));
    setGhostEdges(prev => prev.map(edge => (edge.source === selectedNode.id || edge.target === selectedNode.id) ? { ...edge, is_ghost: false } : edge));
    setSelectedNode(prev => prev ? { ...prev, isGhost: false } : prev);
  }, [selectedNode]);

  const handleDismissGhostNode = useCallback(() => {
    if (!selectedNode?.id) return;
    const ghostId = selectedNode.id;
    setGhostNodes(prev => prev.filter(node => node.id !== ghostId));
    setGhostEdges(prev => prev.filter(edge => edge.source !== ghostId && edge.target !== ghostId));
    setSelectedNode(null);
  }, [selectedNode]);

  return (
    <>
      <AnimatePresence>
        <motion.div
          ref={containerRef}
          layout
          initial={false}
          animate={{
            width: isZenMode ? '100vw' : '100%',
            height: isZenMode ? '100vh' : '100%',
          }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className={`relative ${isZenMode ? 'fixed inset-0 z-50' : 'h-full w-full'}`}
        >
          {/* Dark glassmorphism background */}
          <div
            className="absolute inset-0 rounded-xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, hsl(215 30% 12% / 0.95), hsl(215 28% 8% / 0.98))',
              backdropFilter: 'blur(20px)',
              border: isZenMode ? 'none' : '1px solid hsl(215 20% 25% / 0.5)',
              borderRadius: isZenMode ? 0 : undefined,
            }}
          >
            <div
              ref={flowRef}
              className="w-full h-full"
              style={{ touchAction: 'none', paddingBottom: 'calc(env(safe-area-inset-bottom, 16px) + 56px)' }}
            >
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={handleNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={handleNodeClick}
                onNodeDoubleClick={handleNodeDoubleClick}
                onNodeDragStop={handleNodeDragStop}
                onNodeMouseEnter={(_evt, node) => setHoveredNodeId(node.id)}
                onNodeMouseLeave={() => setHoveredNodeId(null)}
                nodeTypes={nodeTypes}
                connectionLineType={ConnectionLineType.SmoothStep}
                fitView
                fitViewOptions={{ padding: isZenMode ? 0.2 : 0.3 }}
                minZoom={0.1}
                maxZoom={isZenMode ? 4 : 3}
                proOptions={{ hideAttribution: true }}
                panOnDrag={true}
                zoomOnPinch={true}
                zoomOnScroll={true}
                preventScrolling={false}
                nodesDraggable={true}
              >
                <Background
                  color="hsl(215, 20%, 30%)"
                  gap={isZenMode ? 30 : 20}
                  size={1}
                />
                <Controls
                  className={`!backdrop-blur-sm !border-border !rounded-lg !shadow-lg ${isZenMode
                      ? '!bg-card/95 [&>button]:!w-10 [&>button]:!h-10 [&>button]:!text-base'
                      : '!bg-card/80'
                    }`}
                  showInteractive={false}
                  style={{
                    boxShadow: isZenMode ? '0 10px 40px -10px hsl(0 0% 0% / 0.5)' : undefined,
                  }}
                />
                <MiniMap
                  key={`${layoutMode}-${showSecondaryEdges}`}
                  nodeColor={getNodeColor}
                  maskColor="hsl(215, 30%, 12% / 0.8)"
                  className="!bg-card/60 !backdrop-blur-sm !border-border !rounded-lg"
                />

                {/* Control Panel */}
                <Panel position="top-right" className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleScanForGaps}
                    disabled={isScanning}
                    className="bg-card/90 backdrop-blur-sm border-border hover:bg-primary/20 hover:text-primary hover:border-primary/50 shadow-md text-xs sm:text-sm active:scale-95 transition-all"
                  >
                    {isScanning ? (
                      <span className="animate-pulse">{labels.scanning}</span>
                    ) : (
                      <span>{labels.scan}</span>
                    )}
                  </Button>
                  <Button
                    variant={showOutlinePanel ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      if (showOutlinePanel) {
                        setShowOutlinePanel(false);
                      } else {
                        void handleGenerateOutline();
                      }
                    }}
                    className="bg-card/90 backdrop-blur-sm border-border hover:bg-secondary shadow-md text-xs sm:text-sm active:scale-95 transition-all"
                  >
                    {labels.outline}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilters((prev) => !prev)}
                    className="bg-card/90 backdrop-blur-sm border-border hover:bg-secondary shadow-md text-xs sm:text-sm active:scale-95 transition-all"
                  >
                    {labels.filters}
                  </Button>
                  <div className="flex gap-1 bg-card/80 border border-border rounded-lg p-1 shadow-md">
                    <Button
                      variant={layoutMode === 'radial' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setLayoutMode('radial')}
                      className="h-7 px-2 text-xs"
                    >
                      {labels.radial}
                    </Button>
                    <Button
                      variant={layoutMode === 'force' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setLayoutMode('force')}
                      className="h-7 px-2 text-xs"
                    >
                      {labels.force}
                    </Button>
                  </div>
                  {positionHistory.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleUndo}
                      className="bg-card/90 backdrop-blur-sm border-border hover:bg-secondary shadow-md text-xs sm:text-sm active:scale-95 transition-all"
                    >
                      {labels.undo}
                    </Button>
                  )}
                  {hasUserChanges && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetToInitial}
                      className="bg-card/90 backdrop-blur-sm border-border hover:bg-secondary shadow-md text-xs sm:text-sm active:scale-95 transition-all"
                    >
                      <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">{labels.reset}</span>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearMap}
                    className="bg-card/90 backdrop-blur-sm border-border hover:bg-destructive/20 hover:text-destructive hover:border-destructive/50 shadow-md text-xs sm:text-sm active:scale-95 transition-all"
                  >
                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">{labels.clearMap}</span>
                    <span className="sm:hidden">{labels.clear}</span>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-card/90 backdrop-blur-sm border-border hover:bg-primary/20 hover:text-primary hover:border-primary/50 shadow-md text-xs sm:text-sm active:scale-95 transition-all"
                      >
                        <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">{labels.export}</span>
                        <span className="sm:hidden">{labels.save}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={() => void handleExportImage()}>
                        <Download className="mr-2 h-4 w-4" />
                        <span>{labels.exportImage}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => void handleDownloadOutline()}>
                        <FileText className="mr-2 h-4 w-4" />
                        <span>{labels.exportOutline}</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => void handleCopyOutline()}>
                        <Copy className="mr-2 h-4 w-4" />
                        <span>{labels.copyOutline}</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleZenMode}
                    className="bg-card/90 backdrop-blur-sm border-border hover:bg-secondary shadow-md active:scale-95 transition-all"
                  >
                    {isZenMode ? (
                      <Minimize2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    ) : (
                      <Maximize2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    )}
                  </Button>
                </Panel>

                {showFilters && (
                  <Panel position="top-right" className="mt-14 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-3 shadow-md">
                    <div className="flex flex-wrap gap-2">
                      {(['enables', 'essential_for', 'challenges', 'relates_to', 'is_a_type_of'] as EdgeType[]).map((type) => (
                        <Button
                          key={type}
                          variant={edgeTypeFilters[type] ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setEdgeTypeFilters(prev => ({ ...prev, [type]: !prev[type] }))}
                          className="h-7 px-2 text-[10px]"
                        >
                          {labelFromType(type)}
                        </Button>
                      ))}
                      <div className="w-full h-px bg-border/50" />
                      <Button
                        variant={showEdgeLabels ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setShowEdgeLabels(prev => !prev)}
                        className="h-7 px-2 text-[10px]"
                      >
                        {showEdgeLabels ? labels.hideLabels : labels.showLabels}
                      </Button>
                      <Button
                        variant={showSecondaryEdges ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setShowSecondaryEdges(prev => !prev)}
                        className="h-7 px-2 text-[10px]"
                      >
                        {showSecondaryEdges ? labels.allLinks : labels.primaryLinks}
                      </Button>
                    </div>
                  </Panel>
                )}

                {/* Title */}
                <Panel position="top-left">
                  <motion.div
                    layout
                    className="flex items-center gap-2 bg-card/90 backdrop-blur-sm border border-border rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 shadow-md"
                  >
                    <MapIcon className={`text-primary ${isZenMode ? 'h-5 w-5' : 'h-3 w-3 sm:h-4 sm:w-4'}`} />
                    <span className={`font-medium text-foreground ${isZenMode ? 'text-base' : 'text-xs sm:text-sm'}`}>
                      {labels.knowledgeMap}
                      {isZenMode && <span className="text-muted-foreground ml-2">• {labels.zenMode}</span>}
                    </span>
                  </motion.div>
                </Panel>
              </ReactFlow>
            </div>
          </div>

          {/* Zen Mode exit button (appears on hover at top) */}
          {isZenMode && <FullscreenExitButton onExit={toggleZenMode} />}

          {/* Node Info Panel - responsive: side panel desktop, bottom sheet mobile */}
          {selectedNode && !isZenMode && (
            <div
              className={
                isMobile
                  ? "fixed inset-x-0 bottom-0 z-30 px-3 pb-3"
                  : "absolute top-4 right-4 bottom-4 left-4 sm:left-auto sm:w-[380px] z-20"
              }
            >
              <motion.div
                initial={{ x: 20, opacity: 0, y: isMobile ? 20 : 0 }}
                animate={{ x: 0, opacity: 1, y: 0 }}
                exit={{ x: 20, opacity: 0, y: isMobile ? 20 : 0 }}
                className={`backdrop-blur-xl border overflow-y-auto ${
                  isMobile
                    ? "h-[60vh] rounded-t-2xl shadow-2xl"
                    : "h-full rounded-xl"
                } p-5`}
                style={{
                  background: 'linear-gradient(135deg, hsl(265 70% 20% / 0.95), hsl(265 60% 15% / 0.98))',
                  borderColor: 'hsl(265 60% 50% / 0.5)',
                  boxShadow: isMobile
                    ? '0 -10px 40px -8px hsl(265 60% 20% / 0.45)'
                    : '0 20px 50px -10px hsl(265 60% 30% / 0.5)',
                }}
              >
                {isMobile && (
                  <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-white/40" />
                )}
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-purple-400" />
                      <span className="text-xs uppercase tracking-wider text-purple-300 font-medium px-2 py-0.5 rounded-full bg-purple-500/20">
                        {selectedNode.category}
                      </span>
                      {selectedNode.isHighYield && (
                        <span className="text-[10px] uppercase tracking-wider text-amber-200 font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40">
                          High-Yield
                        </span>
                      )}
                      {selectedNode.isGhost && (
                        <span className="text-[10px] uppercase tracking-wider text-slate-200 font-semibold px-2 py-0.5 rounded-full bg-slate-500/20 border border-slate-400/40">
                          Ghost
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-white">{selectedNode.label}</h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={closeInfoPanel}
                    className="h-8 w-8 text-purple-300 hover:text-white hover:bg-purple-500/20 shrink-0 backdrop-blur-sm active:scale-95 transition-all"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  {/* Description */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen className="h-4 w-4 text-purple-400" />
                      <span className="text-sm font-semibold text-purple-200">Description</span>
                    </div>
                    <p className="text-sm text-purple-100/90 leading-relaxed">{selectedNode.description}</p>
                  </div>

                  {selectedNode.sourceSnippet && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Info className="h-4 w-4 text-purple-400" />
                        <span className="text-sm font-semibold text-purple-200">Source Snippet</span>
                      </div>
                      <p className="text-xs text-purple-100/80 leading-relaxed whitespace-pre-wrap">
                        {selectedNode.sourceSnippet}
                      </p>
                    </div>
                  )}

                  {showOutlinePanel && (
                    <div className="pt-3 border-t border-purple-500/30">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-purple-400" />
                          <span className="text-sm font-semibold text-purple-200">{labels.outline}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowOutlinePanel(false)}
                          className="h-7 w-7 text-purple-300 hover:text-white hover:bg-purple-500/20"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      {outlineContent ? (
                        <pre className="text-xs text-purple-100/90 whitespace-pre-wrap leading-relaxed max-h-[35vh] overflow-y-auto">
                          {outlineContent}
                        </pre>
                      ) : (
                        <p className="text-xs text-purple-100/70">
                          {labels.outlinePlaceholder}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {!outlineContent && (
                          <Button variant="outline" size="sm" onClick={() => void handleGenerateOutline()}>
                            {labels.outline}
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => void handleDownloadOutline()}>
                          {labels.download}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => void handleCopyOutline()}>
                          {labels.copyOutline}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Key Details */}
                  {selectedNode.details && selectedNode.details.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Info className="h-4 w-4 text-purple-400" />
                        <span className="text-sm font-semibold text-purple-200">Key Facts</span>
                      </div>
                      <ul className="space-y-1.5">
                        {selectedNode.details.map((detail, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm text-purple-100/80">
                            <span className="text-purple-400 mt-0.5">•</span>
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Connected Concepts */}
                  {selectedNode.connections && selectedNode.connections.length > 0 && (
                    <div className="pt-3 border-t border-purple-500/30">
                      <div className="flex items-center gap-2 mb-2">
                        <ArrowRight className="h-4 w-4 text-purple-400" />
                        <span className="text-sm font-semibold text-purple-200">Connected To</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedNode.connections.map((conn, index) => (
                          <span
                            key={index}
                            className="text-xs px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-200 border border-purple-500/30"
                          >
                            {conn}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedNode.isGhost && (
                    <div className="pt-3 border-t border-purple-500/30 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAcceptGhostNode}
                        className="flex-1 border-green-400/50 text-green-200 hover:bg-green-500/20"
                      >
                        Accept Node
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDismissGhostNode}
                        className="flex-1 border-red-400/50 text-red-200 hover:bg-red-500/20"
                      >
                        Dismiss
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}

          {showOutlinePanel && outlineContent && !isZenMode && !selectedNode && (
            <div className="absolute top-20 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-20 max-h-[70vh] overflow-y-auto">
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="rounded-xl p-5 backdrop-blur-xl border"
                style={{
                  background: 'linear-gradient(135deg, hsl(215 50% 16% / 0.95), hsl(215 40% 10% / 0.98))',
                  borderColor: 'hsl(215 60% 50% / 0.5)',
                  boxShadow: '0 20px 50px -10px hsl(215 60% 30% / 0.5)',
                }}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="text-lg font-bold text-white">{labels.outline}</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowOutlinePanel(false)}
                    className="h-7 w-7 text-blue-200 hover:text-white hover:bg-blue-500/20"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <pre className="text-xs text-blue-100/90 whitespace-pre-wrap leading-relaxed max-h-[50vh] overflow-y-auto">
                  {outlineContent}
                </pre>
                <div className="mt-3 flex flex-wrap gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => void handleDownloadOutline()}>
                    {labels.download}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => void handleCopyOutline()}>
                    {labels.copyOutline}
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Zen Mode Side Panel */}
      <ZenModeSidePanel
        isOpen={isZenMode && !!selectedNode}
        node={selectedNode}
        outline={outlineContent}
        showOutline={showOutlinePanel}
        outlineLabel={labels.outline}
        outlinePlaceholder={labels.outlinePlaceholder}
        downloadLabel={labels.download}
        copyLabel={labels.copyOutline}
        onDownloadOutline={() => void handleDownloadOutline()}
        onCopyOutline={() => void handleCopyOutline()}
        onClose={closeInfoPanel}
        onEditLabel={(nodeId, label) => setEditingNode({ id: nodeId, label })}
      />

      {/* Edit Node Label Modal */}
      <AnimatePresence>
        {editingNode && (
          <EditableNodeLabel
            isOpen={!!editingNode}
            nodeId={editingNode.id}
            currentLabel={editingNode.label}
            onSave={handleSaveLabel}
            onCancel={() => setEditingNode(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default KnowledgeMap;

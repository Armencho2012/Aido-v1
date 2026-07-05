import { useState, useCallback, useEffect } from 'react';
import { Node, Edge } from '@xyflow/react';

interface PersistedMapState {
  nodes: Node[];
  edges: Edge[];
  timestamp: number;
}

interface MapPersistenceOptions {
  mapId?: string;
  initialNodes: Node[];
  initialEdges: Edge[];
}

export const useMapPersistence = ({ mapId = 'default', initialNodes, initialEdges }: MapPersistenceOptions) => {
  const storageKey = `knowledge-map-${mapId}`;
  
  // Load persisted state or use initial
  const [nodes, setNodes] = useState<Node[]>(() => {
    if (typeof window === 'undefined') return initialNodes;
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        const parsed: PersistedMapState = JSON.parse(stored);
        // Only use persisted state if it's recent (within session)
        return parsed.nodes;
      }
    } catch (e) {
      console.warn('Failed to load persisted map state:', e);
    }
    return initialNodes;
  });

  const [edges, setEdges] = useState<Edge[]>(() => {
    if (typeof window === 'undefined') return initialEdges;
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        const parsed: PersistedMapState = JSON.parse(stored);
        return parsed.edges;
      }
    } catch (e) {
      console.warn('Failed to load persisted map state:', e);
    }
    return initialEdges;
  });

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Persist state on change
  const persistState = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const state: PersistedMapState = {
        nodes,
        edges,
        timestamp: Date.now(),
      };
      sessionStorage.setItem(storageKey, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to persist map state:', e);
    }
  }, [nodes, edges, storageKey]);

  // Auto-persist when nodes/edges change
  useEffect(() => {
    persistState();
  }, [nodes, edges, persistState]);

  // Update node label (for editing)
  const updateNodeLabel = useCallback((nodeId: string, newLabel: string) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, label: newLabel } }
          : node
      )
    );
    setHasUnsavedChanges(true);
  }, []);

  // Update node position
  const updateNodePosition = useCallback((nodeId: string, position: { x: number; y: number }) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId ? { ...node, position } : node
      )
    );
    setHasUnsavedChanges(true);
  }, []);

  // Reset to initial state
  const resetToInitial = useCallback(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setHasUnsavedChanges(false);
    try {
      sessionStorage.removeItem(storageKey);
    } catch (e) {
      console.warn('Failed to clear persisted state:', e);
    }
  }, [initialNodes, initialEdges, storageKey]);

  // Sync with new initial data (e.g., when data prop changes)
  const syncWithInitial = useCallback((newNodes: Node[], newEdges: Edge[]) => {
    // Only sync if we haven't made local changes
    if (!hasUnsavedChanges) {
      setNodes(newNodes);
      setEdges(newEdges);
    }
  }, [hasUnsavedChanges]);

  return {
    nodes,
    edges,
    setNodes,
    setEdges,
    updateNodeLabel,
    updateNodePosition,
    resetToInitial,
    syncWithInitial,
    hasUnsavedChanges,
  };
};

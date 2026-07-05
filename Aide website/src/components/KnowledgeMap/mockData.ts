import { ConceptNode, ConceptEdge, KnowledgeMapData } from './types';

// Node descriptions for comprehensive info
export const nodeDescriptions: Record<string, { description: string; details: string[] }> = {
  'photosynthesis': {
    description: 'The process by which green plants convert sunlight, water, and carbon dioxide into glucose and oxygen.',
    details: [
      'Occurs in chloroplasts',
      'Produces oxygen as a byproduct',
      'Essential for life on Earth',
      'Light-dependent and light-independent reactions'
    ]
  },
  'chlorophyll': {
    description: 'The green pigment in plants that absorbs light energy for photosynthesis.',
    details: [
      'Found in chloroplasts',
      'Absorbs red and blue light',
      'Reflects green light',
      'Essential for capturing solar energy'
    ]
  },
  'sunlight': {
    description: 'Electromagnetic radiation from the sun that provides energy for photosynthesis.',
    details: [
      'Primary energy source for plants',
      'Contains photons that drive reactions',
      'Visible light spectrum used most',
      'Intensity affects photosynthesis rate'
    ]
  },
  'glucose': {
    description: 'A simple sugar produced during photosynthesis, used as energy storage and fuel.',
    details: [
      'Chemical formula: C₆H₁₂O₆',
      'Primary product of photosynthesis',
      'Used in cellular respiration',
      'Can be converted to starch for storage'
    ]
  },
  'oxygen': {
    description: 'A byproduct of photosynthesis essential for aerobic respiration in most organisms.',
    details: [
      'Released during light reactions',
      'Essential for animal life',
      'Makes up 21% of atmosphere',
      'Produced when water is split'
    ]
  },
  'energy': {
    description: 'The capacity to do work, transferred and transformed through biological processes.',
    details: [
      'Flows through ecosystems',
      'Stored in chemical bonds',
      'Converted between forms',
      'Follows laws of thermodynamics'
    ]
  },
  'cellular-respiration': {
    description: 'The process by which cells break down glucose to release energy in the form of ATP.',
    details: [
      'Occurs in mitochondria',
      'Uses oxygen (aerobic)',
      'Produces CO₂ and water',
      'Releases stored energy as ATP'
    ]
  },
  'atp': {
    description: 'Adenosine Triphosphate - the primary energy currency of cells.',
    details: [
      'Powers cellular processes',
      'Produced in mitochondria',
      'Contains high-energy phosphate bonds',
      'Recycled continuously in cells'
    ]
  },
  'plant-cells': {
    description: 'The basic structural unit of plants, containing specialized organelles for photosynthesis.',
    details: [
      'Have cell walls for structure',
      'Contain chloroplasts',
      'Large central vacuole',
      'Capable of photosynthesis'
    ]
  },
  'mitochondria': {
    description: 'The powerhouse of the cell, where cellular respiration occurs to produce ATP.',
    details: [
      'Double membrane structure',
      'Has its own DNA',
      'Produces most cellular ATP',
      'Found in all eukaryotic cells'
    ]
  }
};

// Edge relationship labels
export const edgeRelationships: Record<string, string> = {
  'chlorophyll-photosynthesis': 'enables',
  'photosynthesis-chlorophyll': 'requires',
  'sunlight-photosynthesis': 'powers',
  'photosynthesis-sunlight': 'uses',
  'photosynthesis-glucose': 'produces',
  'glucose-photosynthesis': 'from',
  'photosynthesis-oxygen': 'releases',
  'oxygen-photosynthesis': 'from',
  'sunlight-energy': 'provides',
  'energy-sunlight': 'from',
  'glucose-energy': 'stores',
  'energy-glucose': 'in',
  'glucose-cellular-respiration': 'fuels',
  'cellular-respiration-glucose': 'consumes',
  'oxygen-cellular-respiration': 'required by',
  'cellular-respiration-oxygen': 'uses',
  'energy-atp': 'stored as',
  'atp-energy': 'releases',
  'cellular-respiration-atp': 'produces',
  'atp-cellular-respiration': 'from',
  'chlorophyll-plant-cells': 'found in',
  'plant-cells-chlorophyll': 'contains',
  'plant-cells-mitochondria': 'contains',
  'mitochondria-plant-cells': 'inside',
  'mitochondria-cellular-respiration': 'site of',
  'cellular-respiration-mitochondria': 'occurs in'
};

export const initialNodes: ConceptNode[] = [
  {
    id: 'photosynthesis',
    label: 'Photosynthesis',
    category: 'concept',
    connectedTo: ['chlorophyll', 'sunlight', 'glucose', 'oxygen'],
    source_snippet: 'Plants convert light into chemical energy during photosynthesis.',
    is_high_yield: true,
    isActive: true,
  },
  {
    id: 'chlorophyll',
    label: 'Chlorophyll',
    category: 'technology',
    connectedTo: ['photosynthesis', 'plant-cells'],
    source_snippet: 'Chlorophyll is the pigment that captures light energy.',
  },
  {
    id: 'sunlight',
    label: 'Sunlight',
    category: 'concept',
    connectedTo: ['photosynthesis', 'energy'],
    source_snippet: 'Sunlight provides the energy for photosynthesis.',
  },
  {
    id: 'glucose',
    label: 'Glucose',
    category: 'concept',
    connectedTo: ['photosynthesis', 'energy', 'cellular-respiration'],
    source_snippet: 'Glucose is produced by photosynthesis and used for energy.',
  },
  {
    id: 'oxygen',
    label: 'Oxygen',
    category: 'concept',
    connectedTo: ['photosynthesis', 'cellular-respiration'],
    source_snippet: 'Oxygen is released during photosynthesis.',
  },
  {
    id: 'energy',
    label: 'Energy',
    category: 'concept',
    connectedTo: ['sunlight', 'glucose', 'atp'],
    source_snippet: 'Energy is stored in chemical bonds.',
  },
  {
    id: 'cellular-respiration',
    label: 'Cellular Respiration',
    category: 'concept',
    connectedTo: ['glucose', 'oxygen', 'atp'],
    source_snippet: 'Cellular respiration breaks down glucose to make ATP.',
  },
  {
    id: 'atp',
    label: 'ATP',
    category: 'concept',
    connectedTo: ['energy', 'cellular-respiration'],
    source_snippet: 'ATP is the primary energy currency of cells.',
  },
  {
    id: 'plant-cells',
    label: 'Plant Cells',
    category: 'concept',
    connectedTo: ['chlorophyll', 'mitochondria'],
    source_snippet: 'Plant cells contain chloroplasts and mitochondria.',
  },
  {
    id: 'mitochondria',
    label: 'Mitochondria',
    category: 'technology',
    connectedTo: ['plant-cells', 'cellular-respiration'],
    source_snippet: 'Mitochondria are the site of cellular respiration.',
  },
];

// Generate edges from node connections with labels
const labelToType = (label: string): ConceptEdge['type'] => {
  const normalized = label.toLowerCase();
  if (normalized.includes('enables') || normalized.includes('powers') || normalized.includes('produces')) return 'enables';
  if (normalized.includes('requires') || normalized.includes('required')) return 'essential_for';
  if (normalized.includes('contradicts') || normalized.includes('debate')) return 'challenges';
  if (normalized.includes('type')) return 'is_a_type_of';
  return 'relates_to';
};

export const generateEdges = (nodes: ConceptNode[]): ConceptEdge[] => {
  const edges: ConceptEdge[] = [];
  const addedEdges = new Set<string>();

  nodes.forEach((node) => {
    node.connectedTo.forEach((targetId) => {
      const edgeId = [node.id, targetId].sort().join('-');
      if (!addedEdges.has(edgeId)) {
        addedEdges.add(edgeId);
        // Get relationship label
        const relationKey = `${node.id}-${targetId}`;
        const label = edgeRelationships[relationKey] || edgeRelationships[`${targetId}-${node.id}`] || 'relates to';
        edges.push({
          id: edgeId,
          source: node.id,
          target: targetId,
          label: label,
          type: labelToType(label),
          direction: 'bi',
        });
      }
    });
  });

  return edges;
};

export const initialEdges: ConceptEdge[] = generateEdges(initialNodes);

export const mockKnowledgeMapData: KnowledgeMapData = {
  nodes: initialNodes,
  edges: initialEdges,
};

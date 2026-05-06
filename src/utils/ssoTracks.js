/**
 * SSO Track Registry — Unified Scope Definition
 * 
 * Resolves Finding #5 from the Integrity Audit: SSO scope mismatch.
 * Each track defines what data the AI intelligence engine has access to,
 * what it can analyze, and what token budget range it operates within.
 * 
 * RULE: AI never receives raw manuscript text. Only SSO state snapshots.
 */

export const SSO_TRACKS = {
  FORMAT: {
    id: 'format',
    label: 'Format Intelligence',
    description: 'Template selection, margin/spacing rules, export configuration',
    storeKeys: ['projectTitle', 'chapterOrder', 'chapters'],
    excludeFromSnapshot: ['content'],  // Never send raw text
    tokenBudget: { min: 500, max: 1500 },
    requiresPaid: false,
  },

  PROSE: {
    id: 'prose',
    label: 'Prose Quality',
    description: 'Readability metrics, style analysis, dialogue ratio, verb strength',
    storeKeys: [],  // Handled by /api/analysis/prose with explicit text send
    excludeFromSnapshot: [],
    tokenBudget: { min: 1000, max: 3000 },
    requiresPaid: false,
  },

  DEVELOPMENTAL: {
    id: 'developmental',
    label: 'Developmental Intelligence',
    description: 'Signal engine, progression curve, arc detection, pacing analysis',
    storeKeys: [
      'characterStates', 'conflictStates', 'progressionMarkers',
      'nodes', 'edges', 'chapterOrder'
    ],
    excludeFromSnapshot: ['content'],
    tokenBudget: { min: 2000, max: 8000 },
    requiresPaid: true,
  },

  MARKET: {
    id: 'market',
    label: 'Market Intelligence',
    description: 'Genre positioning, word count targets, comp title analysis',
    storeKeys: ['projectTitle', 'chapterOrder'],
    excludeFromSnapshot: ['content'],
    tokenBudget: { min: 800, max: 2000 },
    requiresPaid: false,
  },

  QUERY: {
    id: 'query',
    label: 'Query & Submission',
    description: 'Query letter generation, synopsis drafting, publisher matching',
    storeKeys: ['projectTitle', 'chapterOrder', 'characters', 'nodes'],
    excludeFromSnapshot: [],  // Query mode MAY need text (explicit user action)
    tokenBudget: { min: 1500, max: 4000 },
    requiresPaid: true,
  },

  CULTURAL: {
    id: 'cultural',
    label: 'Cultural Intelligence',
    description: 'Indian genre awareness, regional context, vernacular support',
    storeKeys: [
      'characterStates', 'conflictStates', 'characters',
      'locations', 'projectTitle'
    ],
    excludeFromSnapshot: ['content'],
    tokenBudget: { min: 800, max: 2500 },
    requiresPaid: false,
  },
};

/**
 * Build an SSO snapshot for a specific track.
 * Strips excluded keys and enforces token budget awareness.
 * 
 * @param {string} trackId - One of the SSO_TRACKS keys
 * @param {object} storeState - Current Zustand store state
 * @returns {object} Filtered snapshot safe for AI consumption
 */
export function buildTrackSnapshot(trackId, storeState) {
  const track = SSO_TRACKS[trackId];
  if (!track) {
    console.warn(`Unknown SSO track: ${trackId}`);
    return {};
  }

  const snapshot = {};
  
  for (const key of track.storeKeys) {
    if (storeState[key] !== undefined) {
      const value = storeState[key];
      
      // Deep-strip excluded fields from objects
      if (track.excludeFromSnapshot.length > 0 && typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          snapshot[key] = value.map(item => stripFields(item, track.excludeFromSnapshot));
        } else if (typeof value === 'object') {
          const stripped = {};
          for (const [k, v] of Object.entries(value)) {
            stripped[k] = typeof v === 'object' && v !== null
              ? stripFields(v, track.excludeFromSnapshot)
              : v;
          }
          snapshot[key] = stripped;
        }
      } else {
        snapshot[key] = value;
      }
    }
  }

  return {
    track: track.id,
    tokenBudget: track.tokenBudget,
    data: snapshot,
  };
}

/**
 * Strip specified fields from an object (shallow).
 */
function stripFields(obj, fields) {
  if (typeof obj !== 'object' || obj === null) return obj;
  const result = { ...obj };
  for (const field of fields) {
    delete result[field];
  }
  return result;
}

/**
 * Get available tracks based on subscription tier.
 */
export function getAvailableTracks(subscriptionPlan) {
  const isPaid = subscriptionPlan && subscriptionPlan !== 'free' && subscriptionPlan !== 'none';
  
  return Object.entries(SSO_TRACKS)
    .filter(([_, track]) => !track.requiresPaid || isPaid)
    .map(([key, track]) => ({ key, ...track }));
}

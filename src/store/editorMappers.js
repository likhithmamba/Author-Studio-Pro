export function toDbCharacter(c, projectId) {
  return {
    id: c.id,
    project_id: projectId,
    name: c.name || "Unnamed Character",
    role: c.role || null,
    description: c.bio || c.description || null,
    traits: Array.isArray(c.traits) ? c.traits : [],
    goals: c.goals || null,
    meta: {
      color: c.color || null,
      arc: c.arc || null,
      arc_pct: c.arc_pct ?? 0,
      age: c.age || null,
    },
  };
}

export function toDbLocation(l, projectId) {
  return {
    id: l.id,
    project_id: projectId,
    name: l.name || "Unnamed Location",
    description: l.desc || l.description || null,
    history: l.history || null,
    tags: Array.isArray(l.tags) ? l.tags : [l.tag].filter(Boolean),
    meta: {
      type: l.type || null,
      region: l.region || null,
      color: l.color || null,
    },
  };
}

export function toDbTimelineEvent(e, projectId) {
  return {
    id: e.id,
    project_id: projectId,
    title: e.title || e.label || "Untitled Event",
    description: e.description || e.desc || null,
    event_date: e.event_date || e.year || null,
    sort_order: Number.isFinite(e.sort_order) ? e.sort_order : 0,
    meta: {},
  };
}

export function toDbResearchNote(n, projectId) {
  return {
    id: n.id,
    project_id: projectId,
    title: n.title || "Untitled Note",
    content: n.content || n.body || "",
    url: n.url || null,
    tags: Array.isArray(n.tags) ? n.tags : [n.tag].filter(Boolean),
    meta: { color: n.color || null },
  };
}

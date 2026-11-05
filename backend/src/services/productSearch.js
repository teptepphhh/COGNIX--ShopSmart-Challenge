export function normalizeSearch(value) {
  return String(value || '').trim();
}

export function buildProductWhere(value) {
  const search = normalizeSearch(value);
  if (!search) return { active: true };
  return {
    active: true,
    OR: [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } }
    ]
  };
}

export function normalizeSearch(value) {
  return String(value || '').trim();
}

// LAB 6 fix: Prisma passes `contains` to PostgreSQL LIKE without escaping, so a search
// for "%" or "_" matched every product. Escape the LIKE wildcards and the escape character.
export function escapeLikePattern(value) {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

export function buildProductWhere(value) {
  const search = normalizeSearch(value);
  if (!search) return { active: true };
  const pattern = escapeLikePattern(search);
  return {
    active: true,
    OR: [
      { name: { contains: pattern, mode: 'insensitive' } },
      { description: { contains: pattern, mode: 'insensitive' } }
    ]
  };
}

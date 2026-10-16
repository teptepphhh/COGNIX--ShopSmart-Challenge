// LAB 3: Builds the Prisma "where" filter for GET /api/products.
// Only active products are returned. When a search term is given, it must
// match the product name OR the description, ignoring letter case.
export function normalizeSearch(value) {
  return String(value ?? '').trim();
}

export function buildProductWhere(search) {
  const term = normalizeSearch(search);
  if (!term) return { active: true };
  return {
    active: true,
    OR: [
      { name: { contains: term, mode: 'insensitive' } },
      { description: { contains: term, mode: 'insensitive' } }
    ]
  };
}

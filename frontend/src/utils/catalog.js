export function getCatalogCategories(products) {
  return [...new Set(products.map((product) => product.category))];
}

export function getCategoryOptions(catalogCategories, selectedCategory) {
  const options = ['All', ...catalogCategories];
  if (!options.includes(selectedCategory)) options.push(selectedCategory);
  return options;
}

export function filterByCategory(products, category) {
  return products.filter((product) => category === 'All' || product.category === category);
}

export function sortProducts(products, sort) {
  const sorted = [...products];
  if (sort === 'price-asc') sorted.sort((a, b) => a.price - b.price);
  if (sort === 'price-desc') sorted.sort((a, b) => b.price - a.price);
  if (sort === 'name-asc') sorted.sort((a, b) => a.name.localeCompare(b.name));
  return sorted;
}

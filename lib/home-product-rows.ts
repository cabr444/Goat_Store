import { technologyCategories } from './technology-products';
import { secondhandCategories } from './secondhand-products';
import { sortCards } from './catalog-order';
import type { StoreOptions } from './store-settings';
const departments = [
  { id: 'streaming', title: 'Streaming', href: '/catalogo?categoria=Streaming', categories: ['Streaming'] as readonly string[] },
  { id: 'tienda', title: 'Tienda', href: '/store', categories: technologyCategories as readonly string[] },
  { id: 'segunda', title: 'Segunda', href: '/segunda', categories: secondhandCategories as readonly string[] },
  { id: 'cursos', title: 'Cursos', href: '/cursos', categories: ['Cursos'] as readonly string[] },
];
export function homeProductRows<T extends { id: string; category: string }>(products: T[], role: string, options: StoreOptions, orderedIds: string[]) {
  return departments.filter(row => role !== 'CLIENTE' || (row.id !== 'tienda' || options.tiendaEnabled) && (row.id !== 'segunda' || options.segundaEnabled))
    .map(row => ({ ...row, products: sortCards(products.filter(product => row.categories.includes(product.category)), orderedIds, product => product.id).slice(0, 10) }));
}

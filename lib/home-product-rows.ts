import { technologyCategories } from './technology-products';
import { secondhandCategories } from './secondhand-products';
import { sortCards } from './catalog-order';
import type { StoreOptions } from './store-settings';
const departments = [
  { id: 'streaming', title: 'Streaming', href: '/catalogo?categoria=Streaming', categories: ['Streaming'] as readonly string[] },
  { id: 'personalizados', title: '¡Personaliza a tu manera!', href: '/store?personalizados=1', categories: ['Vasos', 'Camisetas'] as readonly string[] },
  { id: 'tienda', title: 'Tienda', href: '/store', categories: technologyCategories as readonly string[] },
  { id: 'segunda', title: 'Segunda', href: '/segunda', categories: secondhandCategories as readonly string[] },
  { id: 'cursos', title: 'Cursos', href: '/cursos', categories: ['Cursos'] as readonly string[] },
];
export function homeProductRows<T extends { id: string; category: string }>(products: T[], role: string, options: StoreOptions, orderedIds: string[]) {
  return departments.filter(row => role !== 'CLIENTE' || (!['tienda', 'personalizados'].includes(row.id) || options.tiendaEnabled) && (row.id !== 'segunda' || options.segundaEnabled))
    .map(row => {
      const sorted = sortCards(products.filter(product => row.categories.includes(product.category)), orderedIds, product => product.id);
      if (row.id !== 'personalizados') return { ...row, products: sorted.slice(0, 10) };
      const cups = sorted.filter(product => product.category === 'Vasos');
      const shirts = sorted.filter(product => product.category === 'Camisetas');
      const alternating: T[] = [];
      for (let index = 0; index < Math.max(cups.length, shirts.length) && alternating.length < 10; index++) {
        if (cups[index]) alternating.push(cups[index]);
        if (shirts[index] && alternating.length < 10) alternating.push(shirts[index]);
      }
      return { ...row, products: alternating };
    });
}

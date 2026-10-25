export const personalizedProducts = [
  ['nombre', 'Vaso personalizado con tu nombre', 'Camiseta personalizada con tu nombre'],
  ['foto', 'Vaso personalizado con foto', 'Camiseta personalizada con foto'],
  ['frase', 'Vaso personalizado con tu frase', 'Camiseta personalizada con tu frase'],
  ['mascota', 'Vaso personalizado de tu mascota', 'Camiseta personalizada de tu mascota'],
  ['diseno', 'Vaso personalizado con tu diseño', 'Camiseta personalizada con tu diseño'],
  ['anime', 'Vaso personalizado estilo anime', 'Camiseta personalizada estilo anime'],
  ['pareja', 'Vaso personalizado para parejas', 'Camiseta personalizada para parejas'],
  ['cumpleanos', 'Vaso personalizado de cumpleaños', 'Camiseta personalizada de cumpleaños'],
  ['gamer', 'Vaso personalizado gamer', 'Camiseta personalizada gamer'],
  ['empresa', 'Vaso personalizado con tu logo', 'Camiseta personalizada con tu logo'],
].flatMap(([design, cup, shirt]) => [
  { id: `goats-personalized-vaso-${design}`, name: cup, category: 'Vasos' as const, price: 25000 },
  { id: `goats-personalized-camiseta-${design}`, name: shirt, category: 'Camisetas' as const, price: 45000 },
]).map(product => ({ ...product, description: 'Personaliza este producto a tu manera. Confirma con soporte el diseño, las opciones disponibles, el tiempo de preparación y la entrega antes de comprar.', mark: 'PERSONALIZADO', stock: 0, active: true, gradient: 'linear-gradient(135deg,#eee3ff,#dccbff,#e5f1ff)' }));

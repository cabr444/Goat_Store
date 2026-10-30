export const accountCategories = ['Streaming', 'Música', 'Productividad'] as const;
export function isAccountCategory(category: string) {
  return accountCategories.some(value => value === category);
}

export const fullAccountProfile = 'Cuenta completa';
export function isFullAccount(value: string) {
  const normalized = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return /\b(?:complet[ao]s?|full|entera?s?|entero?s?|total|principal|owner|titular)\b/.test(normalized);
}

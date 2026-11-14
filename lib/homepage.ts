export const homepageSettingsKind = 'homepage';
export function inicioEnabledFromSettings(value: unknown) {
  return !Array.isArray(value) || !value.includes('streaming');
}
export function homepageDestination(options: {inicioEnabled?: boolean}) {
  return options.inicioEnabled === false ? '/catalogo?categoria=Streaming' : '/';
}

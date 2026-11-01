// Published Stripe test fixtures, not generated account numbers. Local simulation only.
export const sandboxCards = [
  { id: 'success', label: 'Pago de prueba aceptado', number: '4242 4242 4242 4242', result: 'Simulación: pago aceptado en el escenario de prueba.', state: 'success' },
  { id: 'decline', label: 'Rechazo genérico', number: '4000 0000 0000 0002', result: 'Simulación: el pago fue rechazado.', state: 'decline' },
  { id: 'funds', label: 'Fondos insuficientes', number: '4000 0000 0000 9995', result: 'Simulación: fondos insuficientes.', state: 'decline' },
  { id: 'authentication', label: 'Autenticación 3D Secure', number: '4000 0025 0000 3155', result: 'Simulación: se requiere autenticación 3D Secure.', state: 'authentication' },
] as const;

// Return only fixed diagnostics; database errors may contain connection secrets.
export function pushFailure(error: unknown) {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  if (code === 'P2021' || code === 'P2022') return {code:'PUSH_SCHEMA',message:'Faltan tablas o columnas de notificaciones en la base de datos de este despliegue. Verifica que DATABASE_URL de Vercel sea la misma usada con npm run db:push.'};
  if (['P1000','P1001','P1002','P1003','P1010','P1017','P2024'].includes(code)) return {code:'PUSH_DATABASE',message:'El servidor no pudo acceder a la base de datos para guardar las notificaciones. Revisa la conexión y los permisos de DATABASE_URL en Vercel.'};
  if (error instanceof Error && error.message === 'Missing delivery encryption secret') return {code:'PUSH_ENCRYPTION',message:'No se pudo cifrar la suscripción. Verifica AUTH_SECRET y DELIVERY_SECRET en este despliegue; conserva sus valores originales.'};
  if (error instanceof SyntaxError) return {code:'PUSH_JSON',message:'La solicitud de notificaciones contiene datos inválidos. Actualiza la página e inténtalo nuevamente.'};
  if (code === 'P2002') return {code:'PUSH_CONFLICT',message:'La suscripción cambió durante el registro. Pulsa Activar notificaciones nuevamente.'};
  return {code:'PUSH_REGISTRATION',message:'No se pudo guardar la suscripción del teléfono. Consulta en los registros de Vercel el evento PUSH_REGISTRATION de /api/admin/push.'};
}

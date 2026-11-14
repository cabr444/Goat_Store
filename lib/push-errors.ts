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

export function pushSendFailure(error: unknown) {
  const status = typeof error === 'object' && error !== null && 'statusCode' in error ? Number(error.statusCode) : 0;
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  const message = error instanceof Error ? error.message : '';
  if (status === 404 || status === 410) return {code:'PUSH_EXPIRED',message:'La suscripción del teléfono caducó. Pulsa Desactivar en este teléfono y luego Activar notificaciones.'};
  if (status === 401 || status === 403) return {code:'PUSH_AUTH',message:'El servicio de notificaciones rechazó la autenticación VAPID. Verifica que ambas claves sean de la misma pareja y que VAPID_SUBJECT sea mailto:tu-correo. Si cambiaste las claves, desactiva y activa las notificaciones en este teléfono.'};
  if (/vapid|private key|public key/i.test(message)) return {code:'PUSH_VAPID',message:'La configuración VAPID no es válida. Revisa el formato de ambas claves, sin comillas ni espacios, y VAPID_SUBJECT como mailto:tu-correo.'};
  if (status === 429) return {code:'PUSH_LIMIT',message:'El servicio de notificaciones limitó los envíos. Espera unos minutos antes de probar nuevamente.'};
  if (['ETIMEDOUT','ECONNRESET','ENOTFOUND','ECONNREFUSED','EAI_AGAIN'].includes(code) || status >= 500) return {code:'PUSH_NETWORK',message:'El servidor no pudo comunicarse con el servicio de notificaciones. Inténtalo más tarde y revisa el acceso de red del servidor.'};
  return {code:'PUSH_SEND',message:'No se pudo enviar la prueba. Desactiva y activa las notificaciones en este teléfono; si continúa, revisa el evento PUSH_SEND en los registros de Vercel.'};
}

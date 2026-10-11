# Goat Store — tienda con usuarios, saldos y combos

## Qué incluye
- Diseño Colorful Modern en español, móvil y escritorio.
- 23 productos predefinidos (19 productos individuales + 4 opciones de combos).
- Acceso obligatorio; registro con elección **Cliente** o **Vendedor**.
- **Administrador** creado de manera privada mediante el script seed, no seleccionable públicamente.
- Vendedores: pueden publicar y modificar **sus propios productos**; administradores: cualquier producto.
- Solo el administrador puede **recargar saldo** a cualquier usuario; operación auditada.
- Compras con saldo: precio calculado en servidor, débito condicionado por saldo suficiente, pedido y movimiento creados en una transacción.
- Pedidos registrados como **PENDIENTE_ENTREGA**; entrega manual, sin generación de accesos a servicios.

## Requisitos
- Node.js 20+ y una base PostgreSQL accesible.

## Configuración local
1. `npm install`
2. Copia `.env.example` a `.env` y configura `DATABASE_URL`, `AUTH_SECRET` aleatorio (32+ caracteres), `ADMIN_EMAIL` y `ADMIN_PASSWORD` (12+ caracteres). No publiques `.env`.
3. `npx prisma generate`
4. `npm run db:push`
5. `npm run db:seed` (crea el administrador + catálogo inicial; no duplica productos ya sembrados).
6. `npm run dev` y abre `http://localhost:3000`.

## Deploy
Configura PostgreSQL gestionado y variables del entorno en el proveedor de hosting (por ejemplo, Vercel), aplica el esquema con Prisma en un entorno seguro, ejecuta seed para inicializar catálogo y administrador, y despliega el repositorio Next.js. El comando `npm run build` ejecuta `prisma generate`. No ejecutes seed con contraseñas predeterminadas.

## Consideraciones de seguridad y negocio
- Registro de vendedor es abierto por solicitud; **antes de lanzar** es recomendable aprobar vendedores manualmente, añadir verificación de correo, rate limit, protección antiabuso, auditoría con panel, política de privacidad y términos.
- La cookie de sesión es httpOnly, sameSite=Lax, firmada y expira en 7 días; la contraseña se guarda con bcrypt. Todos los endpoints protegidos verifican identidad/rol en servidor.
- Recargas y compras exigen conexión PostgreSQL real. Las recargas se registran en `WalletEvent`; no están conectadas a un depósito bancario.
- **Las compras debitadas crean pedidos pendientes de entrega manual**; no implican activación instantánea de plataformas. Se recomienda agregar panel de gestión de pedidos/reembolsos antes de operar comercialmente.
- Debes comprobar licencias, permisos de reventa y términos de los proveedores de streaming/software.
- Los productos y precios son información proporcionada por el comerciante.
- Los nombres de servicios no implican afiliación con las marcas.

## Recuperación de contraseña
En `/acceso`, pulsa **¿Olvidaste tu contraseña?** para solicitar un correo con un enlace de un solo uso, válido durante 30 minutos. Al cambiar la contraseña se invalidan las sesiones anteriores.

Configura en el servidor:
- `APP_URL`: URL pública de la aplicación (por ejemplo, `https://tu-tienda.com`; en desarrollo, `http://localhost:3000`).
- `RESEND_API_KEY`: clave de API de Resend.
- `EMAIL_FROM`: remitente autorizado en tu dominio verificado de Resend (por ejemplo, `Goat <acceso@tu-tienda.com>`).

Ejecuta `npm test` para validar la construcción del correo y el manejo de errores del proveedor con una API simulada.

Ejecuta `npm run db:push` antes de usar la función para crear `PasswordReset` y añadir `User.sessionVersion`, y vuelve a desplegar. Los tokens se guardan únicamente como hashes. Las solicitudes para cuentas inexistentes y las solicitudes repetidas durante un minuto muestran el mismo mensaje. Verifica la entrega con una cuenta de prueba y un remitente autorizado; sin las variables de correo el servidor devuelve un error de configuración. Los fallos del proveedor se registran sin exponer el correo ni el token al cliente.

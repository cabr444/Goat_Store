# Goat Store — tienda con usuarios, saldos y combos

## Qué incluye
- Diseño Colorful Modern en español, móvil y escritorio.
- 23 productos predefinidos (19 productos individuales + 4 opciones de combos).
- Acceso obligatorio; registro con elección **Cliente** o **Vendedor**.
- **Administrador** creado de manera privada mediante el script seed, no seleccionable públicamente.
- Vendedores: pueden publicar y modificar **sus propios productos**; administradores: cualquier producto.
- Solo el administrador puede **recargar saldo** a cualquier usuario; operación auditada.
- Compras con saldo: precio calculado en servidor, débito condicionado por saldo suficiente, pedido y movimiento creados en una transacción.
- Pedidos de artículos físicos pendientes de entrega manual; accesos digitales configurados se entregan como comprobantes privados guardados con la compra.

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
- **Las compras físicas debitadas crean pedidos pendientes de entrega manual**; no implican activación instantánea de plataformas. Se recomienda agregar panel de gestión de pedidos/reembolsos antes de operar comercialmente.
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

## Protecciones de seguridad
- Todas las operaciones de escritura rechazan solicitudes de otro origen, formatos no JSON (salvo logout y DELETE) y cuerpos mayores de 16 KiB.
- Autenticación: límites persistentes en PostgreSQL por operación/correo (20 intentos de login, 5 registros, 5 solicitudes de recuperación por ventana de 15 minutos); límite global de 1000 solicitudes por ventana para evitar ataques con correos distintos. No dependen de cabeceras IP manipulables. Las ventanas son fijas; un límite devuelve HTTP 429. Los contadores vencidos se eliminan automáticamente. El límite global puede afectar a otros clientes bajo un ataque; añade protección adicional en tu proveedor de hosting para producción.
- JWT: solo HS256; cookies httpOnly y SameSite, con Secure en producción. Cambiar una contraseña o volver a ejecutar seed del administrador invalida sus sesiones previas.
- Contraseñas nuevas limitadas a 72 bytes UTF-8 para evitar truncamiento de bcrypt.
- Cabeceras contra framing, MIME sniffing y filtrado de referencias; CSP limita objetos, formularios y framing. No es una CSP completa con nonces para scripts.
- Los errores internos de compras no se exponen al cliente. Los precios y permisos se comprueban en servidor.

Tras actualizar: `npm install`, `npm run db:push` y reinicia el servidor. Configura `APP_URL` con el origen exacto de tu web y usa HTTPS en producción. La tabla `RateLimit` es necesaria para iniciar sesión o registrarse. Ejecuta `npm test`, `npx tsc --noEmit`, `npm run build` y `npm audit --omit=dev` para validar.

La revisión incluye código y pruebas automatizadas; no reemplaza una prueba de penetración. No se ha validado aquí una base de datos real ni entrega de emails. El registro de vendedores sigue abierto por diseño: para una tienda pública, define aprobación de vendedores, verificación de email y MFA para el administrador. Usa credenciales de base de datos con privilegios mínimos, copias de seguridad y protección antiabuso del hosting.

## Store de tecnología
El enlace **Store**, después de Combos, abre `/store`. La página mantiene el acceso obligatorio y comparte carrito, saldo, pedidos y permisos con el catálogo digital. Añade búsqueda y filtros para Computadores, Periféricos, Audio, Accesorios y Redes.

Para cargar los 50 productos de ejemplo en tu PostgreSQL:
```sh
npm run db:seed:technology
```
El comando carga `DATABASE_URL` desde `.env` (Node.js 20.6+), añade 10 productos por categoría y se puede repetir sin duplicarlos ni sobrescribir ediciones. No modifica la cuenta administradora. Los artículos, especificaciones y precios COP son ejemplos: verifica productos reales, disponibilidad, garantías, impuestos y entrega antes de aceptar compras. Edita el catálogo desde la cuenta administradora.

## Segunda: artículos de segunda mano
**Tienda** es el nuevo nombre del enlace de tecnología (`/store`). A su lado, **Segunda** abre `/segunda`: catálogo separado con 50 artículos de ejemplo (20 de tecnología usada, 15 de ropa usada y 15 de calzado usado). Las fichas muestran estado de uso, tallas cuando corresponden, descripción y precio COP. Se comparte el carrito y los permisos de gestión.

Carga los productos con `npm run db:seed:secondhand`. Es seguro repetir el comando: no duplica artículos ni sobrescribe ediciones existentes, y no modifica la cuenta administradora. Los estados, especificaciones y precios son ejemplos; actualízalos para reflejar los artículos reales antes de venderlos. La disponibilidad de piezas únicas y el seguimiento de inventario todavía deben gestionarse manualmente.

## Seis imágenes en el banner de Inicio
El fondo del banner de Inicio cambia cada 7 segundos mediante un fundido; el texto y los botones permanecen fijos. Hay seis imágenes de ejemplo, controles para elegir una imagen y un botón para pausar. Si el usuario prefiere movimiento reducido, la reproducción automática empieza pausada.

Ejecuta npm run db:push para crear BannerImage. Inicia sesión como administrador, abre Inicio y baja a **Imágenes del banner de Inicio**. Usa **Cambiar imagen 1** hasta **Cambiar imagen 6** para subir tus imágenes. Formatos: JPG, PNG o WebP, máximo 2 MB por archivo; tamaño recomendado: 1600 × 700 px. Las imágenes se guardan en PostgreSQL, por lo que permanecen después de reiniciar o desplegar la aplicación. **Restaurar imagen** vuelve al fondo de ejemplo de esa posición. El almacenamiento máximo de los seis archivos es 12 MB; incluye la tabla en las copias de seguridad.

Solo el administrador puede modificar imágenes. El servidor valida origen, tamaño real y firma del archivo; no acepta SVG subidos. Tienda y Segunda mantienen sus propios banners.

Los seis fondos predeterminados de Inicio ahora son diseños de Netflix, Prime Video, Disney+, Max, YouTube Premium y Paramount+. Si una posición tiene una imagen personalizada, pulsa **Restaurar imagen** en el editor del banner para mostrar el nuevo fondo de plataforma.

## Imágenes de categorías, productos y carrito
Las tarjetas de Inicio, Tienda y Segunda muestran imágenes locales representativas, y el carrito muestra la misma miniatura del producto. La selección usa nombre y categoría: plataformas de streaming, computadores, periféricos, audio, accesorios, ropa y calzado. Funciona con los productos ya existentes; no exige migraciones ni volver a ejecutar los seeds. Nuevos productos usan una imagen de su categoría si su tipo no está reconocido.

Las fotos y dibujos del catálogo son ejemplos representativos; sustitúyelos por fotos de tus artículos reales antes de vender, especialmente los usados. Cambia las rutas de selección en lib/catalog-images.ts o reemplaza los archivos de public/images/catalog. No se solicitan imágenes a servicios externos cuando el cliente abre la web. Fotos descargadas de Unsplash; fuente y referencias en public/images/catalog/SOURCES.md.

## Perfil, pedidos y WhatsApp
El círculo de perfil junto al saldo abre un menú al pasar el mouse; también funciona por clic, teclado y toque. Incluye Perfil, Pedidos, Soporte y Recargas.

- Perfil: nombre, email, rol, saldo, total gastado, fecha de registro, número de pedidos y los últimos 10 productos comprados. Vendedores también ven sus últimas 10 ventas. Administradores ven sus ventas y las de productos gestionados por la tienda.
- Pedidos: historial privado con todos los pedidos accesibles mediante paginación de 20, filtros de Streaming y digitales, Tienda y Segunda, y detalle de productos, cantidades, precios, subtotales y estado. Los pedidos mixtos aparecen en los filtros correspondientes y separan sus productos por sección dentro del detalle.
- Soporte: abre WhatsApp a +57 3223037790 con el mensaje "Necesito soporte...".
- Recargas: abre el mismo número con "quiero recargar saldo.".

Ejecuta npm run db:push después de actualizar. Los nuevos pedidos guardan la categoría y el vendedor de cada producto al comprar. Los pedidos históricos usan la categoría y el propietario actuales del producto cuando no tienen esos datos guardados. El gasto corresponde al total debitado por pedidos; no implementa reembolsos. Las páginas verifican la sesión y solo consultan compras del usuario; las listas de ventas respetan el vendedor o el rol administrador. El enlace de WhatsApp prepara el mensaje; el usuario decide enviarlo.

## Stock, imágenes administrables y comprobantes privados
Todos los productos permanecen en el catálogo, incluso con stock cero. Cero unidades muestra **Agotado** y bloquea añadir al carrito; stock positivo muestra el número de unidades en verde. La disponibilidad se actualiza cada 15 segundos. El servidor comprueba y descuenta stock junto con el saldo y crea el pedido y su movimiento de billetera en una sola transacción. Una compra rechazada no cambia el saldo ni el stock. Si el stock cambia mientras un administrador tiene el formulario abierto, guardar devuelve un aviso de conflicto: cierra y reabre el producto para evitar restaurar unidades ya vendidas.

Después de actualizar, ejecuta npm run db:push. Los productos anteriores empiezan con stock 0: ingresa sus cantidades reales.

### Administración desde Perfil
Inicia sesión como ADMIN, abre Perfil y pulsa **Administrar productos, stock e imágenes**:
- Las categorías tienen **Cambiar imagen** y **Restaurar imagen**. Los banners mantienen sus seis espacios de carga.
- Busca un producto y pulsa **Editar** para cambiar precio, descripción, cantidad e imagen. **Agotar** pone su stock a cero sin ocultarlo.
- Para productos digitales existentes, configura encabezado, correo de plataforma, clave, perfil y PIN; pulsa **Guardar acceso privado**. Después ajusta stock y pulsa **Guardar producto**. Un producto nuevo debe guardarse primero para obtener su ID.
- Un producto de Streaming sin acceso configurado no se puede comprar. Cada unidad recibe el mismo acceso configurado en ese producto; para perfiles únicos, usa stock 1 y un producto por perfil.

Las imágenes de productos y categorías se guardan en PostgreSQL y permanecen después de reiniciar. Se admiten JPG, PNG y WebP hasta 2 MB por archivo; solo ADMIN puede modificarlas.

### Comprobantes de compras
Al comprar un acceso configurado, el usuario va directamente a Pedidos y ve el comprobante con encabezado, plataforma, correo, clave, perfil, PIN, ID, fecha, cantidad, precio y el aviso solicitado. Puede copiarlo. Se guarda una copia cifrada de los datos usados al pagar: editar después el producto no cambia comprobantes anteriores. Las compras completamente digitales con accesos configurados quedan ENTREGADO; las mixtas o físicas quedan PENDIENTE_ENTREGA. Las compras anteriores a esta función conservan su historial pero no reciben accesos retrospectivamente.

Los accesos y comprobantes se cifran con AES-256-GCM; no se envían en el catálogo. Solo ADMIN puede consultar la configuración y cada comprador puede abrir sus propios comprobantes. La clave usa DELIVERY_SECRET si está configurada; en caso contrario usa AUTH_SECRET. Conserva esa clave y sus copias de seguridad: cambiarla impide descifrar datos anteriores. Si quieres separar las claves, configura DELIVERY_SECRET de 32+ caracteres **antes de guardar el primer acceso**.

### Verificación
Se validó con una base PostgreSQL temporal y la aplicación en producción local: dos compradores compitiendo por la última unidad crean un solo pedido y un solo débito; el stock cero sigue visible; las compras sin acceso no hacen cargos; los comprobantes se mantienen después de editar credenciales y no son accesibles a otro comprador. Se probaron las pantallas de administrador y cliente en escritorio y móvil con PostgreSQL real.

La prueba reproducible npm run test:inventory requiere un PostgreSQL desechable local llamado goat_inventory_test, su esquema aplicado y el servidor local de prueba activo (puerto 3103 por defecto). Usa DATABASE_URL, AUTH_SECRET y DELIVERY_SECRET idénticos en servidor y prueba; INVENTORY_TEST_URL permite elegir otro puerto local. La prueba rechaza bases remotas o con otro nombre, crea datos sintéticos con IDs únicos y elimina sus propios registros al terminar. No la ejecutes contra la base de clientes.

Las nuevas compras tienen una referencia consecutiva P1, P2, P3 (P de pedido), asignada en la misma transacción que el pago. Los pedidos antiguos conservan su referencia anterior. Ejecuta `npm run db:push` antes de iniciar esta versión. Al terminar el pago se abre un comprobante centrado; puede cerrarse con Cerrar o Escape y sigue guardado en Pedidos. Las marcas de negrita `*texto*` y `**texto**` se muestran en negrita, sin interpretar HTML.

Para cambiar precios: Perfil → Administrar productos, stock e imágenes → Editar → Precio (COP) → Guardar producto. El precio nuevo se usa en futuras compras y los pedidos anteriores conservan el precio pagado.

Después de iniciar sesión correctamente con Entrar a Goat, se muestra una bienvenida de 3,2 segundos con una mascota Goat original de estilo anime. Al terminar, omitirla o pulsar Escape, se entra a Inicio. Los accesos fallidos y las visitas normales a Inicio no muestran la bienvenida. Con movimiento reducido se entra directamente. El panel lateral de acceso tiene un fondo animado con portal y tarjetas flotantes, que se puede pausar y respeta movimiento reducido. La ilustración es SVG local y no requiere servicios externos.

La cabrita junto al formulario de acceso se asoma, saluda, parpadea y se esconde en un ciclo de 9 segundos. En móvil aparece sobre la tarjeta sin tapar los campos. Queda estática con movimiento reducido.

Inicio omite las secciones Productos y Beneficios y sus enlaces de navegación. Las compras digitales siguen disponibles en `/catalogo`; Inicio muestra una sección de Streaming con sus productos; su enlace del menú lleva a esa sección. Combos abre su categoría en el catálogo digital. Las demás categorías de Inicio y Ver catálogo llevan al catálogo digital. Tienda, Segunda y administración conservan sus catálogos.

Optimización de carga: `/api/storefront` reúne usuario, catálogo y últimos 10 pedidos en una petición; las consultas se ejecutan en paralelo y la lista de usuarios solo se entrega a administradores. El historial completo sigue en Pedidos. El banner prioriza la primera imagen y prepara la siguiente después de 1,5 segundos; el resto se carga al necesitarlo. Las imágenes subidas usan ETag y revalidación privada autenticada (304 si no cambiaron), sin caché pública. Se omiten las consultas de imágenes en acceso y las actualizaciones periódicas de stock mientras la pestaña está oculta. Para medir velocidad real usa `npm run build` y `npm run start`; el servidor de desarrollo compila páginas bajo demanda.

El administrador puede habilitar o deshabilitar Tienda y Segunda por separado en Perfil → Administrar productos, stock e imágenes → Secciones disponibles para clientes. Las opciones se guardan en StoreSettings y comienzan habilitadas. Ejecuta `npm run db:push` al actualizar. Solo afecta a CLIENTE: oculta los enlaces, redirige las páginas deshabilitadas a Inicio, excluye esos productos de los catálogos del cliente y bloquea compras nuevas (incluyendo carritos antiguos) sin descontar saldo ni stock. ADMIN y VENDEDOR conservan acceso; los pedidos anteriores permanecen visibles. Las pestañas abiertas actualizan las opciones con el sondeo de stock cada 15 segundos mientras están visibles.

Prueba de integración opcional: `node tests/store-options.integration.mjs`, usando los mismos DATABASE_URL, AUTH_SECRET e INVENTORY_TEST_URL de la prueba de inventario local. Requiere una base aislada local llamada goat_inventory_test y restaura la configuración original al terminar.

El administrador puede pulsar Ordenar tarjetas en Inicio, el catálogo digital, Tienda, Segunda o administración. En ese modo puede arrastrar categorías y productos o usar las flechas (también en móvil y con teclado). Cada movimiento se guarda en CatalogOrder y se muestra a clientes y vendedores, que no tienen controles ni permisos para reordenar. Categorías y productos mantienen órdenes independientes; las tarjetas nuevas se añaden al final. Al mover dentro de un filtro se conserva el orden relativo de las tarjetas no visibles. Versiones de orden impiden sobrescribir cambios de otro administrador; si hay conflicto, recarga antes de continuar. Ejecuta `npm run db:push` al actualizar. Prueba opcional con base local aislada: `node tests/card-order.integration.mjs`, con las mismas variables de la prueba de inventario.

Inicio y el catálogo de Streaming incluyen Historias que enganchan: selección editorial de seis series para cada una de las nueve plataformas, selector horizontal de plataforma y tarjetas con desplazamiento horizontal táctil, teclado y flechas. Ver planes abre el catálogo de Streaming con el filtro de la plataforma correspondiente. La selección está en `lib/streaming-highlights.ts`; es editorial y la disponibilidad depende del país y del plan. Las ilustraciones y los iconos de las tarjetas son locales, sin peticiones a un proveedor de rankings.

En Inicio y Streaming, las tarjetas de los planes aparecen antes de Historias que enganchan. Cuando hay una búsqueda o filtro de plataforma activo, Ver todo Streaming borra la búsqueda para volver a mostrar todos los planes de Streaming, incluyendo los agotados.

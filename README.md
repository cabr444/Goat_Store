# Goats Store — tienda con usuarios, saldos y combos

Documentación profesional editable: [English](docs/goat-store-en.md) · [Español](docs/goat-store-es.md). Para generar ambos archivos Word, consulta [docs/README.md](docs/README.md).

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
- Registro de vendedor es abierto por solicitud; **antes de lanzar** es recomendable aprobar vendedores manualmente, definir aprobación de vendedores, protección antiabuso, auditoría con panel, política de privacidad y términos. El registro de clientes y vendedores crea la cuenta directamente, sin confirmar el correo.
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

La revisión incluye código y pruebas automatizadas; no reemplaza una prueba de penetración. Las pruebas de integración usan PostgreSQL real aislado y correos interceptados; la entrega real requiere configurar el proveedor y su remitente. El registro de vendedores sigue abierto por diseño: para una tienda pública, define aprobación de vendedores y MFA para el administrador. Usa credenciales de base de datos con privilegios mínimos, copias de seguridad y protección antiabuso del hosting.

## Store de tecnología
El enlace **Store**, después de Combos, abre `/store`. La página permite explorar y usar el carrito sin iniciar sesión; comprar requiere una cuenta. Comparte saldo, pedidos y permisos con el catálogo digital. Añade búsqueda y filtros para Computadores, Periféricos, Audio, Accesorios y Redes.

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
- Para Streaming, añade perfiles en **Inventario privado de streaming**; el stock es automático. En otros productos digitales se mantiene **Guardar acceso privado** y stock manual. Un producto nuevo debe guardarse primero para obtener su ID.
- Un producto de Streaming sin accesos individuales disponibles no se puede comprar. Cada unidad recibe un perfil distinto, asignado una sola vez desde el inventario privado del producto.

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

Inicio omite los enlaces Productos y Beneficios del menú y la sección Beneficios. Inicio comienza mostrando los planes de Streaming, incluidos los agotados. Incluye filtros Todos, Streaming, Música, Productividad y Combos para cambiar de categoría sin salir; Todos muestra el catálogo digital completo. Tienda y Segunda mantienen sus páginas separadas. Streaming y Ver catálogo llevan a los planes en Inicio. Combos y las demás categorías digitales también están disponibles en `/catalogo`. Tienda, Segunda y administración conservan sus catálogos.

Optimización de carga: `/api/storefront` reúne usuario, catálogo y últimos 10 pedidos en una petición; las consultas se ejecutan en paralelo y la lista de usuarios solo se entrega a administradores. El historial completo sigue en Pedidos. El banner prioriza la primera imagen y prepara la siguiente después de 1,5 segundos; el resto se carga al necesitarlo. Las imágenes subidas usan ETag y revalidación con ETag (304 si no cambiaron), también disponible para visitantes, sin caché pública. Se omiten las consultas de imágenes en acceso y las actualizaciones periódicas de stock mientras la pestaña está oculta. Para medir velocidad real usa `npm run build` y `npm run start`; el servidor de desarrollo compila páginas bajo demanda.

El administrador puede habilitar o deshabilitar Tienda y Segunda por separado en Perfil → Administrar productos, stock e imágenes → Secciones disponibles para clientes. Las opciones se guardan en StoreSettings y comienzan habilitadas. Ejecuta `npm run db:push` al actualizar. Afecta a visitantes y CLIENTE: oculta los enlaces, redirige las páginas deshabilitadas a Inicio, excluye esos productos de los catálogos del cliente y bloquea compras nuevas (incluyendo carritos antiguos) sin descontar saldo ni stock. ADMIN y VENDEDOR conservan acceso; los pedidos anteriores permanecen visibles. Las pestañas abiertas actualizan las opciones con el sondeo de stock cada 15 segundos mientras están visibles.

Prueba de integración opcional: `node tests/store-options.integration.mjs`, usando los mismos DATABASE_URL, AUTH_SECRET e INVENTORY_TEST_URL de la prueba de inventario local. Requiere una base aislada local llamada goat_inventory_test y restaura la configuración original al terminar.

El administrador puede pulsar Ordenar tarjetas en Inicio, el catálogo digital, Tienda, Segunda o administración. En ese modo puede arrastrar categorías y productos o usar las flechas (también en móvil y con teclado). Cada movimiento se guarda en CatalogOrder y se muestra a clientes y vendedores, que no tienen controles ni permisos para reordenar. Categorías y productos mantienen órdenes independientes; las tarjetas nuevas se añaden al final. Al mover dentro de un filtro se conserva el orden relativo de las tarjetas no visibles. Versiones de orden impiden sobrescribir cambios de otro administrador; si hay conflicto, recarga antes de continuar. Ejecuta `npm run db:push` al actualizar. Prueba opcional con base local aislada: `node tests/card-order.integration.mjs`, con las mismas variables de la prueba de inventario.

El catálogo de Streaming incluye Historias que enganchan: selección editorial de seis series para cada una de las nueve plataformas, selector horizontal de plataforma y tarjetas con desplazamiento horizontal táctil, teclado y flechas. Ver planes abre el catálogo de Streaming con el filtro de la plataforma correspondiente. La selección está en `lib/streaming-highlights.ts`; es editorial y la disponibilidad depende del país y del plan. Las ilustraciones y los iconos de las tarjetas son locales, sin peticiones a un proveedor de rankings.

En Streaming, Historias que enganchan aparece antes de las tarjetas de planes. Ver todo Streaming quita la búsqueda o el filtro para mostrar todos los planes de Streaming, incluidos los agotados. Los productos de otras categorías se mantienen en sus páginas.

El administrador puede cambiar las portadas de Historias que enganchan y los logos de sus plataformas: en Streaming, pulsa Editar imágenes de series, elige una plataforma y usa Cambiar imagen en la tarjeta correspondiente. JPG, PNG o WebP, máximo 2 MB. Restaurar imagen vuelve a la ilustración local. Se guardan en CatalogImageAsset con claves estables por plataforma y serie, se muestran en Streaming y se conservan al desplegar usando la misma base de datos. El endpoint de edición valida la serie/plataforma y permite únicamente ADMIN.

Las portadas de Historias que enganchan tienen 2 cm CSS adicionales de altura (aproximadamente 76 px; la medida física varía según la pantalla). Las imágenes nuevas subidas desde los controles de categorías, productos, series y logos se convierten a WebP y se redimensionan en el navegador cuando esto reduce su peso; ante falta de compatibilidad se conserva el archivo original. El servidor mantiene validación de formato, permisos y límite de 2 MB. Las imágenes existentes se conservan. La lista de imágenes se reutiliza durante 30 segundos al navegar; guardar o restaurar una imagen fuerza la actualización inmediata, y salir a acceso limpia la lista. Las revalidaciones con ETag coincidente consultan solo la fecha de modificación en lugar de leer los bytes completos de la imagen.

Los cinco filtros digitales están disponibles en Streaming. Cambiar de categoría limpia la búsqueda anterior; Inicio utiliza una búsqueda general para todos los departamentos habilitados.


## Registro directo sin confirmación de correo

Crear cuenta guarda inmediatamente el usuario con el correo normalizado y la contraseña cifrada con bcrypt. La pantalla vuelve al inicio de sesión con un mensaje de éxito; el usuario entra con su contraseña y conserva la animación de bienvenida. No se envía correo ni se necesita configurar Resend para registrarse. Los correos siguen siendo únicos, incluso con registros simultáneos, y el rol ADMIN no se puede elegir públicamente. Se mantienen la validación de contraseña y los límites de intentos.

La pantalla borra los tickets antiguos de sessionStorage y ya no muestra espera ni reenvío. Los endpoints anteriores de verificación devuelven 410 y no crean cuentas; las solicitudes pendientes no se convierten automáticamente en usuarios. Si alguien había quedado pendiente, debe registrarse de nuevo. Las cuentas existentes conservan sus contraseñas. La tabla PendingRegistration permanece para conservar datos y compatibilidad con la migración, pero ya no se usa para el registro.

`RESEND_API_KEY` y `EMAIL_FROM` solo se necesitan para recuperar contraseñas. `npm run email:check` comprueba esa configuración y la tabla PasswordReset sin enviar mensajes ni imprimir claves. Crear una cuenta funciona aunque el proveedor de correo no esté configurado o no permita envíos. Esta actualización no requiere cambios de esquema; despliega el último commit de password-reset para aplicarla.

Validación: `npm test`, `npm run build` y `node --import tsx tests/registration.integration.mjs` con una base aislada local llamada goat_inventory_test y un servidor local con correo sin configurar. Cubre registro inmediato, contraseña cifrada, login, unicidad concurrente, solicitudes antiguas y bloqueo del rol ADMIN y de otros orígenes.

Las compras guardan todos los productos, cantidades, comprobantes y un solo descuento de saldo en una transacción. El carrito muestra progreso y errores, y conserva una clave de solicitud para recuperar el mismo pedido tras una respuesta perdida sin cobrar otra vez. Ejecuta `npm run db:push` al actualizar para crear la tabla `CheckoutAttempt`. La prueba `node --import tsx tests/multi-item-checkout.integration.mjs`, con la misma base local aislada y secreto del servidor de pruebas de inventario, comprueba compras múltiples como cliente, persistencia, reintentos concurrentes y fallos sin cambios parciales.


## Inventario individual de streaming

Actualiza con `npm run db:push` para crear `StreamingAccess` antes de arrancar la nueva versión. Los comprobantes anteriores se conservan. El antiguo acceso compartido del producto deja de entregarse; no se importa automáticamente porque podría haber sido vendido. Hasta añadir perfiles disponibles, esos productos muestran Agotado aunque antes tuvieran stock manual.

Como administrador abre **Administración → Editar producto → Inventario privado de streaming**. Añade una fila por acceso sin vender: plataforma, encabezado, correo, clave, perfil y PIN. Usa la misma plataforma en todos sus planes (por ejemplo `netflix` para Netflix x28 y x33 días). El stock se calcula por filas disponibles; no se escribe manualmente. Puedes corregir clave, PIN y encabezado de una fila disponible o retirarla. Plataforma, correo y perfil identifican una fila y no se cambian al editarla. Retirar un acceso es definitivo; su identidad permanece registrada para evitar una venta accidental posterior.

La identidad plataforma/correo/perfil se protege con HMAC y es única entre productos, incluso si cambian clave o PIN. Las credenciales se guardan cifradas. Las filas vendidas quedan vinculadas a su línea de pedido, no se pueden editar o retirar y no vuelven al inventario. El administrador ve cantidades disponibles/vendidas; los compradores solo ven sus comprobantes. Las compras de varias unidades incluyen un comprobante por acceso dentro del pedido. La asignación, stock, saldo, comprobantes y pedido se guardan en una transacción; los reintentos conservan la asignación original. Al añadir accesos también se comprueban los comprobantes antiguos de streaming para impedir reutilizar perfiles ya entregados.

Mantén estables `DELIVERY_SECRET` y su alternativa `AUTH_SECRET`: son necesarios tanto para descifrar accesos como para comprobar identidades. Incluye la nueva tabla en los respaldos. Esta actualización cambia los productos de categoría Streaming; los demás tipos de producto conservan su flujo.

Validación: `npm test`, `npm run build` y `npm run test:streaming` con la base aislada local `goat_inventory_test`, el servidor local y el mismo `AUTH_SECRET` de pruebas. Cubre permisos, perfiles únicos entre planes, cantidades múltiples, ventas concurrentes, recibos privados, reintentos, retiros, historial anterior y fallos sin débito ni asignación parcial.


### Login con dominios de Vercel
`APP_URL` sigue siendo la URL canónica para los enlaces de correo. Las escrituras aceptan el origen real de la petición y, en Vercel, sus direcciones exactas `VERCEL_URL`, `VERCEL_BRANCH_URL` y `VERCEL_PROJECT_PRODUCTION_URL`. Esto permite abrir el mismo despliegue por su dominio público o dirección de rama sin recibir un rechazo de origen al iniciar sesión. No se aceptan otros proyectos por compartir `vercel.app`, ni se confía en cabeceras `Host`/`X-Forwarded-Host` añadidas por el cliente. Las peticiones marcadas como cross-site se rechazan. Tras actualizar hay que desplegar el nuevo commit; no cambia la base de datos.

## Copiar los datos de Supabase a Neon (destino vacío)

`db:push` crea tablas; no transfiere registros. La herramienta de migración copia las tablas de la aplicación: usuarios y hashes de contraseña, saldos y movimientos, productos, pedidos y comprobantes, imágenes binarias, configuración, orden del catálogo, solicitudes de registro, recuperación de contraseña, claves de checkout y accesos individuales. No migra servicios internos de Supabase (Auth, Storage, roles, extensiones) que esta aplicación no utiliza. Los contadores temporales `RateLimit` de Neon se conservan y los del origen no se copian.

1. Mantén una copia de seguridad de Supabase. Detén las escrituras en la tienda antigua durante la migración (incluido el servidor local si apunta a Supabase) para no generar registros después de la instantánea. No registres usuarios, compres ni ejecutes seed en Neon todavía.
2. Actualiza la rama `password-reset` con `git pull origin password-reset` y ejecuta `npm install`. En `.env`, deja `DATABASE_URL` apuntando a Neon y conserva exactamente el `AUTH_SECRET` y `DELIVERY_SECRET` originales (si este último no existía, sigue sin configurarlo). Vercel debe usar esos mismos secretos.
3. Ejecuta `npm run db:push` para actualizar las tablas vacías de Neon. Este comando usa `DATABASE_URL` de `.env`; comprueba que no estás apuntando por error a otra base.
4. Copia `.env.migration.example` a `.env.migration` en tu ordenador. Este archivo privado se ignora en Git. Configura `SOURCE_DATABASE_URL` con la conexión PostgreSQL original de Supabase y `TARGET_DATABASE_URL` con la conexión de Neon. No son claves de API. Usa conexiones directas para la migración; si Supabase directo requiere IPv6 y tu red no lo admite, usa su **Session pooler**. No publiques ni pegues estas conexiones en el chat.
5. Ejecuta `npm run db:migrate:check`. Comprueba el origen, que Neon no contiene registros de la tienda, y que los accesos cifrados se pueden abrir con los secretos originales. Solo imprime nombres de tablas y conteos; no escribe datos.
6. Si la comprobación pasa, ejecuta `npm run db:migrate:apply`. Copia en una única transacción y verifica contenido y conteos. Un error durante la copia cancela la transacción completa. Si se pierde la conexión justo al confirmar, verifica los registros de Neon antes de repetir: la respuesta podría haberse perdido después del commit. La conexión de Supabase se abre en una transacción de solo lectura; no se borra ni actualiza el origen. Si ya existen registros de la tienda en Neon, se detiene sin borrar ni sobrescribir nada.
7. Espera el mensaje de éxito. Con Vercel apuntando a Neon, prueba el inicio de sesión con una cuenta anterior; las contraseñas y saldos se conservan. No necesitas desplegar de nuevo solo por copiar datos, pero sí si has cambiado variables de Vercel. Guarda `.env.migration` de forma segura o elimínalo cuando ya no lo necesites.

Las tablas nuevas que aún no existían en Supabase se dejan vacías; los campos nuevos con valores por defecto reciben esos valores. Los campos existentes se comprueban antes de copiar. Si el contador de pedidos antiguo está desactualizado o no existe, se ajusta al mayor número `P...` copiado para evitar referencias repetidas. Los comprobantes y accesos cifrados no se reescriben. El antiguo acceso compartido del producto no se convierte en perfiles disponibles automáticamente: añade solo accesos sin vender en el inventario individual.

La comprobación y la copia son pasos separados: no asumas que una comprobación antigua garantiza que el destino sigue vacío; la copia vuelve a comprobarlo y bloquea escrituras en sus tablas durante la operación. El programa no genera archivos con datos privados ni imprime contraseñas, claves, tokens o conexiones. No lo conectes al arranque o build de Vercel; es una operación única desde un ordenador con acceso a ambas bases. Para grandes volúmenes o esquemas modificados, planifica una migración específica antes de usarlo.

Prueba: `npm run test:migration` requiere dos bases desechables locales con el esquema actual, llamadas `goat_migration_source_test` y `goat_migration_target_test`. Las conexiones opcionales `MIGRATION_TEST_SOURCE_URL` y `MIGRATION_TEST_TARGET_URL` solo aceptan esos nombres en localhost. Cubre copia íntegra, inicio de sesión con el hash anterior, imágenes/JSON, comprobantes cifrados, secretos incorrectos, esquema antiguo, destino ocupado y rollback tras un fallo a mitad de la copia. No uses bases con datos reales para esta prueba.


## Duplicar un producto

En las tarjetas administrables aparece **Duplicar**, junto a Editar y Agotar. ADMIN puede duplicar cualquier producto y VENDEDOR únicamente los propios. Se crea inmediatamente un producto con ID independiente y nombre terminado en `(copia)`, perteneciente a la cuenta que realiza la acción; se abre su editor para ajustar nombre, precio u otros detalles. Cerrar el editor no borra la copia ya creada.

Se copian categoría, precio, descripción, marca, fondo y la imagen personalizada del producto si existe. La imagen es independiente de la original. Toda copia comienza con stock cero, sin credenciales compartidas, perfiles individuales, asignaciones, pedidos ni movimientos de saldo. Para Streaming hay que añadir accesos nuevos sin vender en el inventario de la copia; para otras categorías hay que introducir disponibilidad real. No se modifica el original. La creación del producto y su imagen se realiza en una transacción; si falla la imagen, no queda una copia parcial.

Prueba: `npm run test:duplicate` con el mismo entorno PostgreSQL local aislado de inventario. Verifica permisos, propiedad, imagen independiente, ausencia de datos privados, nombres Unicode, stock cero y rollback.

### Cursos

La sección `/cursos` incluye un catálogo independiente y un enlace en la navegación principal y de cuenta. Como administrador, abre **Cursos → Cargar / actualizar cursos** para añadir cinco propuestas: Office 365, Prime Video, YouTube, tarjetas temporales e ingresos extra. La operación añade registros faltantes y sustituye los títulos originales de ejemplo; conserva títulos personalizados, precios, stock e imágenes.

También puedes ejecutar `npm run db:seed:courses` usando el `DATABASE_URL` del entorno correspondiente. No requiere cambios de esquema. Los ejemplos empiezan activos y sin stock: revisa descripción, precio, imagen y contenido real antes de habilitar ventas. Los cursos utilizan el carrito y saldo existentes; los pedidos quedan en **PENDIENTE_ENTREGA** para entregar el acceso manualmente y aparecen en el filtro **Cursos** de Pedidos. Esta sección no incluye un reproductor de lecciones ni una plataforma educativa.

### Compra directa

Todas las tarjetas de producto incluyen **Comprar ahora**, además de agregar al carrito. La compra directa pide confirmación y compra una unidad con saldo Goat, conserva el carrito existente y abre el comprobante en Pedidos. Usa el mismo endpoint transaccional de pedidos, con validación de stock/saldo e idempotencia para reintentos. Los productos agotados muestran el botón deshabilitado.

### Inventario automático de combos

En **Editar producto → Combos**, introduce una cantidad (por ejemplo, **10**) y el precio. No configures correo, clave, perfil ni PIN para el combo. Usa nombres como **Combo x2: Netflix + Prime Video**, **Combo x3: Netflix + Prime Video + Paramount** o **Combo x3: Netflix + ViX + Prime Video**. Las plataformas se identifican por el nombre; los nombres desconocidos, ambiguos o con cuentas completas quedan sin disponibilidad. El registro antiguo «Netflix individual» no es un combo: cámbialo a Streaming y carga su inventario individual si quieres venderlo.

Cada unidad vendida descuenta **un combo y un acceso individual por plataforma**. Netflix utiliza únicamente productos Streaming de **28 días**; no toma Netflix de 20/33 días ni cuentas completas. También se excluyen productos y perfiles identificados como completos, full, principales o titulares. Los accesos deben estar cargados en el inventario individual de Streaming con la plataforma correcta; una cantidad manual sin accesos registrados no abastece combos. La disponibilidad pública es el menor valor entre la cantidad configurada del combo y los perfiles elegibles de sus plataformas. Por ejemplo: 10 combos configurados, 7 Netflix x28 y 4 Prime elegibles muestran **4 disponibles**. Al reponer perfiles, la disponibilidad se actualiza hasta la cantidad restante del combo.

El pedido conserva el precio del combo y un comprobante con los accesos asignados de todas sus plataformas. La reserva de perfiles, los descuentos de stock, el débito y el pedido se guardan en una sola transacción. Los carritos mixtos comparten inventario y no pueden recibir el mismo perfil dos veces; los reintentos recuperan el pedido existente. Los accesos compartidos que antes estuvieran configurados en el combo ya no se entregan. Un combo de un vendedor solo utiliza sus propios productos; los combos de administración o del catálogo general pueden utilizar inventario de la tienda.

No requiere migración de esquema. Despliega el cambio, revisa los nombres/cantidades de los combos existentes y carga los perfiles en las plataformas individuales. Las pruebas con PostgreSQL local descartable se ejecutan con `npm run test:combos`, `DATABASE_URL`, `AUTH_SECRET` e `INVENTORY_TEST_URL` configurados para ese entorno de pruebas.

### Carruseles de Inicio

Inicio muestra cuatro carruseles horizontales: Streaming, Tienda, Segunda y Cursos. Cada uno selecciona hasta diez productos reales de su departamento, siguiendo el orden guardado por administración. Conserva imágenes personalizadas, disponibilidad, carrito, compra directa y herramientas de edición/ordenación. No repite productos ni inventa cursos para completar diez tarjetas: si una categoría tiene cinco productos, muestra cinco. Tienda y Segunda se ocultan a los clientes cuando sus opciones están deshabilitadas.

«Historias que enganchan» y la cuadrícula completa de Streaming se encuentran en `/catalogo?categoria=Streaming`. Los enlaces «Ver todo» de Inicio abren el catálogo correspondiente. Los carruseles admiten desplazamiento táctil, teclado y botones de flechas, y respetan la preferencia de movimiento reducido.


### Visitantes y compras con cuenta

Inicio, Streaming, Combos, Tienda, Segunda y Cursos pueden visitarse sin sesión. Los visitantes pueden buscar productos, ver imágenes personalizadas y añadir/quitar unidades del carrito, que se conserva en el navegador al ir a registrarse o iniciar sesión. Tienda y Segunda siguen respetando las secciones deshabilitadas por administración.

El saldo, menú de perfil, cierre de sesión y panel de pedidos/saldo solo se muestran con una sesión válida. Los visitantes ven «Ingresar / Registrarse». Tanto el carrito como Comprar ahora solicitan iniciar sesión o crear cuenta antes de comprar; la ruta de retorno admite únicamente páginas del catálogo. Tras el acceso, se reabre el carrito o la confirmación del producto, sin ejecutar una compra automáticamente. Registrarse mantiene el flujo de inicio de sesión posterior.

Los endpoints públicos devuelven únicamente datos del catálogo: los visitantes reciben usuario nulo y listas vacías de clientes y pedidos. Pedidos, perfil, comprobantes, compras y acciones administrativas conservan sus verificaciones en servidor. Las imágenes de productos/series y banners son públicas para mostrar el catálogo; subir, sustituir o eliminar imágenes sigue siendo una acción de administración. No hay cambios de esquema. Pruebas de acceso público: `npm run test:guests` en una base PostgreSQL local descartable.


### Inicio con diseño de marketplace

Inicio utiliza una cabecera morada con los colores de Goat, buscador destacado, accesos rápidos por departamento, paneles promocionales y carruseles de tarjetas blancas, con la marca Goat. La búsqueda de Inicio consulta nombres, categorías y descripciones de todos los productos disponibles para el visitante y muestra resultados o un estado vacío con opción de limpiar. Las cantidades disponibles, imágenes personalizadas, orden administrativo, carrito y Comprar ahora siguen usando los mismos componentes y servicios. El buscador y la navegación funcionan en escritorio, tablet y móvil. No incorpora descuentos, cuotas ni envíos gratuitos ficticios.

Los seis fondos de banner configurados por administración continúan rotando en Inicio. Los paneles y accesos de Tienda y Segunda respetan las opciones de visibilidad de visitantes/clientes. Las cuentas de administración conservan acceso a las secciones deshabilitadas.

El enlace Streaming abre `/catalogo?categoria=Streaming` y restaura allí la presentación anterior: banner, categorías digitales, Historias que enganchan, filtros y cuadrícula completa de productos. La selección editorial permanece visible al usar los filtros dentro de esa página. La navegación pública y la obligación de iniciar sesión para comprar se mantienen. No requiere cambios de esquema ni nuevos datos de producción.


### Panel exclusivo de administración y ventas

Abre el círculo de perfil → **Administración**, o el botón del perfil **Panel de ventas y administración**, para entrar a `/administracion/ventas`. Solo ADMIN puede consultar el panel, clientes, exportaciones y detalles privados. Visitantes deben iniciar sesión; CLIENTE y VENDEDOR regresan a su perfil. Los endpoints privados verifican el rol en servidor.

- Historial de todos los pedidos de la tienda, con referencia/ID, fecha, comprador, correo, productos, cantidades, importe y entrega. La lista se pagina en grupos de 20 y permite buscar por pedido, cliente/correo o producto, además de filtrar estado, categoría y fechas. Los días completos se interpretan en `America/Bogota`.
- Indicadores del conjunto filtrado: total vendido, pedidos, unidades y pendientes. Los filtros seleccionan pedidos completos; sus importes incluyen todos los artículos y no representan utilidad o ganancia.
- Detalle de pedido con información del comprador, saldo actual, fecha de registro, precios/cantidades históricos y accesos asignados. Los comprobantes privados se abren en el detalle administrativo; no se incluyen en la lista ni en CSV.
- Exportación CSV UTF-8 de los pedidos filtrados, con una fila por artículo y subtotal. Admite hasta 1000 pedidos por exportación; si se supera, el panel pide reducir los filtros. Los valores de usuarios se escapan y se neutralizan fórmulas de hojas de cálculo.
- Control de entrega entre PENDIENTE_ENTREGA y ENTREGADO, con comprobación del estado esperado para evitar sobrescribir cambios concurrentes. Cambiar la entrega no cobra, reembolsa, devuelve stock, modifica importes ni libera accesos. No ofrece cancelación ni borrado de ventas.
- `/administracion/clientes` muestra cuentas paginadas, búsqueda por nombre/correo, rol, registro, saldo, número y total de compras, y las últimas 20 recargas que coinciden con la búsqueda. «Ver compras» filtra las ventas del cliente y «Recargar saldo» preselecciona la cuenta en el formulario existente.
- Accesos a productos/inventario, perfiles de streaming y combos, recargas, visibilidad de secciones e imágenes/banners en el administrador de catálogo existente. El menú de perfil admite hover, clic, toque y teclado.

No requiere tablas ni migraciones nuevas. Validación: `npm test`, `npm run build` y `npm run test:admin` en PostgreSQL local descartable, con `DATABASE_URL`, `AUTH_SECRET` e `INVENTORY_TEST_URL` del entorno de pruebas. La prueba de integración comprueba autorización, filtros/fechas, exactitud de importes, privacidad de comprobantes, CSV, paginación y cambios de estado sin alterar saldo, stock o movimientos de billetera.

### Productos personalizados

Inicio muestra «¡Personaliza a tu manera!» después de Streaming, con hasta diez tarjetas alternadas de Vasos y Camisetas. Respeta la visibilidad de Tienda para clientes e invitados. «Ver personalizados» abre Tienda con ambas categorías filtradas.

Como ADMIN, usa «Añadir 10 productos personalizados» en Inicio, Tienda o administración para guardar cinco vasos y cinco camisetas en la base de datos. También puedes ejecutar `npm run db:seed:personalized` con la conexión del entorno elegido. La carga utiliza IDs estables: repetirla no duplica productos ni sobrescribe precios, stock, nombres o imágenes editados. Los precios son ejemplos (vasos: 25.000 COP; camisetas: 45.000 COP), con stock cero. Ajusta precios, disponibilidad y condiciones de personalización antes de vender. No se necesita cambiar el esquema.

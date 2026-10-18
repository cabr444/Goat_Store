# Goat Store
## 01. Control documental y propósito
Este manual describe Goat Store según la revisión de código 56f7f83 de la rama password-reset. Es una referencia operativa y técnica para el propietario del negocio, administradores, personal de soporte, desarrolladores y responsables del despliegue. Versión del paquete de la aplicación: 2.0.0. Versión de la documentación: 1.1. Fecha de revisión: 18 de octubre de 2026.

El documento distingue el funcionamiento implementado de las recomendaciones operativas y las mejoras futuras. No afirma que una base de datos de producción, remitente de correo, dominio o política de respaldos específicos estén configurados. Estos valores deben comprobarse en los paneles de los proveedores. No contiene registros de clientes, contraseñas, conexiones ni claves de API.

| Control | Valor |
|---|---|
| Repositorio | github.com/cabr444/Goat_Store |
| Código de referencia | password-reset / 56f7f83 |
| Responsable documental | Administrador del proyecto Goat Store |
| Uso previsto | Administración, soporte, despliegue y mantenimiento |
| Formatos maestros | Documento Word editable y fuente Markdown versionada |
| Motivos de revisión | Cambios en flujos, permisos, esquema, dependencias o alojamiento |

El archivo Word puede editarse en Microsoft Word, LibreOffice Writer u otra aplicación compatible con DOCX. Para actualizarlo de forma reproducible, modifica la fuente Markdown correspondiente, actualiza el registro de revisiones y regenera el documento. Las pantallas, políticas y configuraciones de producción pueden cambiar después de esta versión.

## 02. Resumen ejecutivo y alcance
Goat Store es una tienda web en español para planes de streaming y otros productos digitales, con catálogos opcionales de tecnología y segunda mano. Los clientes compran con un saldo interno prepagado en pesos colombianos (COP). Los administradores gestionan el catálogo, inventario de accesos, recargas, imágenes, orden de presentación y disponibilidad de secciones para clientes.

La prioridad comercial actual es la venta de streaming. Los productos tecnológicos de Tienda y los artículos usados de Segunda siguen implementados como módulos que pueden deshabilitarse para cuentas CLIENTE. Deshabilitarlos no elimina productos, no oculta compras históricas ni retira el acceso de administradores y vendedores.

La protección principal del streaming es el inventario individual. Cada unidad vendida de un producto Streaming recibe una entrada disponible de cuenta/perfil. Esa entrada se asigna al pedido y no puede venderse de nuevo. Las compras de varias unidades reciben accesos diferentes. El comprobante conserva los datos entregados al comprar, en lugar de consultar posteriormente credenciales modificables del producto.

El registro crea la cuenta inmediatamente y no exige confirmación de correo ni una cuenta de Resend. La recuperación de contraseña es un servicio independiente que sí utiliza correo. La aplicación desplegada funciona sin depender del computador del desarrollador; únicamente el entorno local requiere que ese equipo permanezca encendido.

Los módulos implementados incluyen autenticación, filtros, selección editorial de series, carrito persistente, compra transaccional, perfil e historial, herramientas administrativas, permisos por rol y migración de datos de la aplicación. No están implementados los pagos bancarios automáticos, reembolsos, integraciones de transporte ni liquidaciones a vendedores.

## 03. Roles y modelo de permisos
Los permisos se comprueban en el servidor. Ocultar un botón es una medida de interfaz y no sustituye la autorización de la API. ADMIN se crea de forma privada mediante el proceso seed y no puede elegirse en el registro público. CLIENTE y VENDEDOR sí pueden seleccionarse al registrarse.

| Función | CLIENTE | VENDEDOR | ADMIN |
|---|---|---|---|
| Consultar catálogo permitido y comprar con saldo | Sí | Sí | Sí |
| Consultar perfil, compras y comprobantes propios | Sí | Sí | Sí |
| Publicar productos | No | Productos propios | Sí |
| Cambiar precio, descripción y stock manual | No | Productos propios | Cualquier producto |
| Gestionar accesos privados de streaming e imágenes | No | No | Sí |
| Recargar saldos de usuarios | No | No | Sí |
| Ordenar tarjetas de productos/categorías | No | No | Sí |
| Habilitar o deshabilitar Tienda y Segunda | No | No | Sí |
| Entrar al panel de administración | No | No | Sí |
| Acceder a secciones deshabilitadas para clientes | No | Sí | Sí |

El registro de vendedores es abierto; todavía no existe un flujo de aprobación. La propiedad del producto limita las modificaciones de un vendedor. El perfil puede mostrar ventas recientes, pero una compra no acredita automáticamente saldo al vendedor ni liquida comisiones. Estas son funciones comerciales futuras e independientes.

Los administradores deben utilizar una cuenta privada, contraseña exclusiva y acceso restringido a los paneles de base de datos y alojamiento. Se recomienda autenticación multifactor en los proveedores; la aplicación no incorpora actualmente su propio flujo de MFA.

## 04. Navegación y experiencia del cliente
La tienda ofrece Inicio, Streaming, Combos y accesos opcionales a Tienda y Segunda, junto con funciones de contacto y cuenta. Las secciones Productos y Beneficios retiradas no forman parte del menú principal actual. El inicio y los catálogos requieren iniciar sesión; todavía no constituyen un catálogo SEO de consulta anónima.

| Ruta | Propósito y acceso |
|---|---|
| /acceso | Inicio de sesión, registro directo y entrada a recuperación de contraseña |
| / | Inicio autenticado con banner, selección editorial y filtros digitales |
| /catalogo | Catálogo digital autenticado; filtros por categoría y plataforma |
| /store | Catálogo tecnológico; redirige al cliente si está deshabilitado |
| /segunda | Catálogo de segunda mano; redirige al cliente si está deshabilitado |
| /perfil | Perfil privado, saldo, gasto y actividad reciente |
| /pedidos | Historial privado paginado y comprobantes |
| /administracion | Gestión de catálogo y operaciones exclusiva de ADMIN |
| /restablecer-contrasena | Formulario de cambio mediante token recibido por correo |
| /confirmar-correo | Aviso de compatibilidad; ya no se exige confirmar correo |

El círculo junto al saldo abre Perfil, Pedidos, Soporte y Recargas. Funciona mediante mouse, clic, teclado y toque. Los enlaces de soporte y recarga abren WhatsApp con un mensaje preparado al +57 3223037790. El usuario decide si lo envía.

La disponibilidad de secciones para clientes también se aplica al encabezado de Perfil/Pedidos y al acceso de compra cuando no hay pedidos. Los filtros históricos pueden seguir mostrando departamentos comprados anteriormente: deshabilitar una sección de ventas no elimina el historial.

## 05. Registro, acceso y recuperación de contraseña
Para registrarse, abre Registrarse, escribe nombre, correo, contraseña y tipo de cuenta, y pulsa Crear cuenta. Si la operación es correcta se crea inmediatamente el User y el formulario vuelve al inicio de sesión con un mensaje de éxito. La contraseña del formulario se borra. Después se utiliza Entrar a Goat con las nuevas credenciales; la bienvenida animada solo aparece tras un acceso válido.

Los correos se recortan y convierten a minúsculas en registro e inicio de sesión. Una restricción única en base de datos impide duplicados, incluso cuando dos solicitudes llegan simultáneamente. La contraseña de registro debe tener entre 10 y 128 caracteres y no superar 72 bytes UTF-8, evitando el truncamiento de bcrypt. Se guarda un hash bcrypt, no la contraseña legible. Un control permite mostrar u ocultar la contraseña introducida.

Los tickets del antiguo flujo de espera se eliminan del almacenamiento de sesión del navegador. Los endpoints de verificación, reenvío y estado se retiraron y responden HTTP 410. Las solicitudes pendientes no se convierten automáticamente en cuentas; esos usuarios deben registrarse otra vez. PendingRegistration se conserva en el esquema para compatibilidad histórica y migraciones.

La recuperación utiliza ¿Olvidaste tu contraseña? y requiere una API de Resend y un EMAIL_FROM autorizado. Los tokens vencen a los 30 minutos, son de un solo uso y se guardan como hashes SHA-256. Un cambio correcto incrementa sessionVersion para invalidar sesiones anteriores. El mensaje de solicitud no confirma si el correo está registrado; si no llega el mensaje, revisa los registros del proveedor.

Para enviar recuperación a clientes reales se necesita un dominio remitente verificado. El remitente de pruebas de Resend está limitado al correo del propietario de la cuenta. Quitar la confirmación de registro no elimina este requisito del servicio de recuperación.

## 06. Catálogo, búsqueda y contenido editorial
Inicio comienza con Streaming seleccionado. Los filtros digitales son Todos, Streaming, Música, Productividad y Combos. Todos se refiere al catálogo digital, no a todos los departamentos físicos. La búsqueda compara nombres de productos. Los enlaces de plataforma de la selección editorial pueden abrir Streaming filtrado por esa plataforma.

Tienda agrupa tecnología en Computadores, Periféricos, Audio, Accesorios y Redes. Segunda contiene Tecnología usada, Ropa usada y Calzado usado. Los scripts de ejemplo aportan 50 productos tecnológicos y 50 usados. Son registros demostrativos y no prueban disponibilidad real, condición, licencias o stock. Sustituye sus datos comerciales antes de ofrecerlos a la venta.

Historias que enganchan es un componente editorial de descubrimiento en Inicio/Streaming, anterior a las tarjetas de planes. Ofrece desplazamiento horizontal, flechas y selección para Netflix, Prime Video, Disney+, HBO Max, Apple TV+, Paramount+, Crunchyroll, ViX y YouTube. Sus títulos y géneros se mantienen en lib/streaming-highlights.ts; no consulta un servicio de popularidad o disponibilidad en tiempo real.

Cada tarjeta tiene una imagen representativa y disponibilidad. Los productos con cero unidades siguen visibles con Agotado y no pueden agregarse al carrito. El stock positivo aparece en verde. El catálogo consulta actualizaciones aproximadamente cada 15 segundos mientras la pestaña está visible; la compra siempre valida el estado actual del servidor.

El banner de Inicio utiliza seis fondos que cambian cada siete segundos, manteniendo texto y botones fijos. Incluye pausa y adaptación a movimiento reducido. El acceso incorpora un fondo animado local y una mascota; la bienvenida respeta la preferencia de movimiento reducido.

## 07. Carrito, compra e integridad financiera
El carrito guarda identificadores y cantidades en el almacenamiento local del navegador bajo goat-cart-v3. No contiene precios autorizados ni concede acceso a credenciales. Las filas repetidas se consolidan por producto. La API admite hasta 50 filas de entrada y hasta 50 unidades agregadas de un mismo producto, siempre sujetas a inventario y saldo.

Al comprar se muestra el progreso y se impiden envíos simultáneos accidentales desde el navegador. El servidor comprueba precios, cantidades, permisos de sección, existencias y saldo. El saldo almacenado temporalmente en pantalla es informativo y no sustituye la consulta a la base de datos.

| Etapa | Comportamiento del servidor |
|---|---|
| 1. Identificar solicitud | Autenticar al usuario, validar carrito y recuperar una compra coincidente ya guardada |
| 2. Validar condiciones | Comprobar secciones habilitadas, productos, cantidades y accesos disponibles |
| 3. Reservar inventario | Seleccionar perfiles individuales y descontar stock de forma condicionada |
| 4. Descontar saldo | Reducir el saldo únicamente cuando sea suficiente |
| 5. Guardar compra | Crear pedido, líneas, comprobantes, asignaciones y WalletEvent |
| 6. Finalizar | Confirmar una transacción y devolver la referencia |

La transacción usa aislamiento Serializable y reintentos limitados para conflictos reconocidos. Una transacción rechazada no cambia saldo, stock ni asignaciones. Las referencias usan P seguida de un consecutivo, comenzando en P1 cuando el contador es nuevo. Las referencias anteriores se conservan.

Una clave de compra se guarda en session storage y se vincula al pedido mediante CheckoutAttempt. Reintentar el mismo carrito del mismo usuario puede recuperar ese pedido sin un segundo descuento ni otra asignación. Un carrito distinto u otra cuenta no pueden reutilizar la solicitud como una compra propia. Si se pierde la respuesta, conserva el carrito, revisa Mis pedidos y, si corresponde, reintenta la solicitud original; un error de red no significa necesariamente que el pago falló.

## 08. Inventario de streaming y entrega privada
En un producto Streaming, el stock corresponde al número de filas StreamingAccess disponibles. La cantidad manual del producto no sustituye el inventario real de accesos. El antiguo Product.deliveryCipher compartido ya no se entrega para Streaming. Por eso un producto anterior puede mostrar Agotado hasta que se agreguen perfiles sin vender.

Procedimiento del administrador:
1. Abre Perfil y después Administrar productos, stock e imágenes.
2. Crea o busca el producto de streaming y pulsa Editar.
3. Abre Inventario privado de streaming.
4. Añade una fila por perfil sin vender: plataforma, encabezado, correo, clave, perfil y PIN opcional.
5. Usa una identidad de plataforma consistente entre planes; Netflix x28 y x33, por ejemplo, pertenecen a netflix.
6. Comprueba que aumente la cantidad disponible. Primero hay que guardar un producto nuevo para poder asociarle accesos.

La identidad se obtiene de plataforma, correo y perfil normalizados, protegidos con HMAC y una restricción única. Cambiar la clave o el PIN no convierte un perfil ya registrado en una identidad nueva vendible. Los duplicados se bloquean entre productos y también respecto a filas vendidas o retiradas. Al añadir inventario se comprueban además los comprobantes históricos de streaming.

En filas disponibles se pueden corregir clave, PIN y encabezado. Plataforma/correo/perfil son una identidad inmutable en el editor. Retirar una fila es definitivo en el flujo actual y la excluye del stock. Los accesos vendidos quedan vinculados a su línea de pedido y no se pueden editar, retirar ni revender. No existe renovación automática, reposición por vencimiento ni reasignación de perfiles.

Si se compran varias unidades, el comprobante guardado incluye una sección por acceso. Las filas se asignan de forma atómica junto con el pedido y el descuento. El administrador ve cantidades disponibles/vendidas y las primeras 100 filas disponibles que devuelve la API. Las otras categorías digitales conservan la entrega manual/antigua; la garantía de inventario individual descrita corresponde a la categoría Streaming.

## 09. Pedidos, comprobantes y perfil
Al terminar la compra se abre Pedidos y aparece un comprobante centrado del pedido completado. Cerrarlo no elimina la compra ni su contenido. Los comprobantes siguen disponibles únicamente en el historial del comprador propietario. Conocer o adivinar otro identificador no da acceso a los comprobantes de otra cuenta.

| Contenido | Significado |
|---|---|
| Encabezado y plataforma | Encabezado configurado por ADMIN y nombre del producto comprado |
| Correo, clave, perfil y PIN | Acceso de plataforma asignado al momento de comprar |
| Referencia y fecha | Referencia guardada y momento de la compra |
| Cantidad e importe | Información por unidad o línea, según el tipo de entrega |
| Aviso de uso | Instrucción de no modificar cuenta o perfil de la plataforma |

El comprobante se cifra como una copia inmutable de la entrega. Cambiar precios o credenciales posteriormente no reescribe comprobantes anteriores. Los asteriscos de énfasis se presentan como negrita; no se interpreta HTML arbitrario. Es un registro de entrega de acceso y no una factura electrónica tributaria integrada.

Los pedidos con entrega configurada en todas las líneas reciben ENTREGADO. Los pedidos físicos, manuales o mixtos pueden permanecer en PENDIENTE_ENTREGA. La aplicación no implementa todavía un flujo administrativo completo de despacho, cancelación o reembolso.

El historial ofrece 20 pedidos por página, filtros de departamento y subtotales agrupados para compras mixtas. La API de resumen devuelve una lista reciente limitada; la página privada ofrece el historial paginado completo. Las fechas de cuenta/comprobantes se presentan en America/Bogota. Los importes son valores enteros COP.

Perfil muestra nombre, correo, rol, saldo, gasto registrado, fecha de registro, número de pedidos y hasta diez productos comprados recientemente. Vendedores y administradores pueden ver también ventas recientes según propiedad. El gasto corresponde a la suma de compras guardadas y no se ajusta mediante un subsistema de reembolsos, porque dicho subsistema no existe.

## 10. Procedimientos de administración
El panel se abre desde Perfil → Administrar productos, stock e imágenes o /administracion. Una cuenta no administrativa se redirige. La creación y edición se validan en el servidor; los permisos de API del vendedor se limitan a productos propios.

| Tarea | Procedimiento y resultado |
|---|---|
| Duplicar producto | Pulsar Duplicar; se crea inmediatamente una copia y se abre su editor |
| Cambiar precio | Editar → Precio (COP) → Guardar producto; el valor nuevo se usa en compras futuras |
| Editar nombre/descripción | Cambiar datos y guardar; las líneas históricas mantienen lo registrado |
| Reponer Streaming | Añadir accesos individuales sin vender; la disponibilidad es automática |
| Ajustar otro stock | Introducir cantidad real; un cambio concurrente puede exigir reabrir el editor |
| Marcar agotado | Agotar lleva el stock manual a cero; retira accesos disponibles de streaming |
| Recargar saldo | Seleccionar usuario e importe; comprobar el pago real por separado y registrar el crédito |
| Cambiar acceso a secciones | Secciones disponibles para clientes → Tienda y Segunda por separado |
| Ordenar tarjetas | Activar orden administrativo, arrastrar o usar flechas; se guarda para todos |

Duplicar copia nombre (con sufijo copia), categoría, precio, descripción, marca, fondo e imagen personalizada. El registro pertenece a la cuenta que lo crea y su imagen es independiente. ADMIN puede duplicar cualquier producto; VENDEDOR solo los propios. Cada copia comienza con stock cero y sin credenciales compartidas, accesos individuales, asociaciones a pedidos ni movimientos de saldo. Añade inventario real antes de venderla. Cerrar el editor no elimina la copia ya creada. El original permanece intacto; un fallo al copiar la imagen revierte la creación.

Una recarga es un crédito administrativo, no una transacción bancaria ni confirmación de pasarela. La API permite un entero positivo de hasta COP 10.000.000 por solicitud y guarda un WalletEvent RECARGA con referencia al administrador en la nota. Las compras guardan eventos COMPRA. No existe conciliación automática de pagos ni liquidación a vendedores.

Cuando no hay configuración guardada, ambas secciones comienzan habilitadas. Para CLIENTE, los interruptores ocultan enlaces de tienda/cuenta, redirigen páginas deshabilitadas, excluyen productos y bloquean compras nuevas, incluso desde carritos antiguos. ADMIN y VENDEDOR conservan acceso. Las compras anteriores siguen visibles.

Los cambios de orden incluyen una versión para detectar edición concurrente. Si hay conflicto, recarga antes de continuar. Las modificaciones de producto también comprueban el stock esperado. No eludas estas protecciones restaurando cantidades antiguas directamente en la base.

## 11. Imágenes, marca y mantenimiento de interfaz
ADMIN puede reemplazar fondos del banner, imágenes de productos/categorías y contenido visual de series/plataformas. Las cargas JPEG, PNG y WebP admiten hasta 2 MB por archivo; se comprueban el tamaño real del flujo y su firma. No se aceptan SVG subidos. Las ilustraciones y ejemplos integrados son archivos locales.

| Recurso | Ubicación | Método de edición |
|---|---|---|
| Seis fondos de Inicio | BannerImage en PostgreSQL | Controles de banner; Restaurar elimina la sustitución |
| Imágenes de productos/categorías | CatalogImageAsset | Cargas de imagen de administración |
| Series y plataformas | CatalogImageAsset con claves lógicas | Editar imágenes de series en la selección editorial |
| Recursos predeterminados | public/images y helpers de selección | Cambio en repositorio y nuevo despliegue |

Las imágenes cargadas en base de datos permanecen tras desplegar si se conserva esa base y sus registros. Un archivo del computador del administrador no queda publicado al escribir su ruta local; utiliza el control de carga. Los archivos versionados en public se despliegan con la aplicación.

Algunas cargas nuevas se redimensionan y convierten a WebP en el navegador si resulta conveniente; la validación del servidor sigue siendo obligatoria. Los endpoints autenticados usan revalidación privada y ETags. Los metadatos se actualizan con un intervalo corto y se usan imágenes predeterminadas cuando no hay una sustitución.

Utiliza recursos representativos con permiso de uso, descripciones útiles y fotografías reales del estado de los productos usados. Para el banner se recomiendan aproximadamente 1600 × 700 píxeles. Revisa el resultado en móvil y escritorio. Las dimensiones de estantes y tarjetas se definen en código; no hay un editor administrativo general de tamaños.

## 12. Arquitectura y organización del repositorio
Goat Store utiliza Next.js App Router con React y TypeScript. Los manejadores del servidor controlan identidad, permisos, validación y operaciones financieras. Prisma accede a PostgreSQL. El estado del navegador mejora la experiencia, pero nunca autoriza saldos, precios o asignaciones de acceso.

| Capa | Responsabilidad e implementación |
|---|---|
| Navegador | Pantallas React, almacenamiento de carrito, filtros, animaciones y controles de ADMIN |
| Servidor Next.js | Páginas, endpoints, sesiones, permisos y validación |
| Servicios de negocio | Inventario, comprobantes, historial, orden del catálogo y migración |
| PostgreSQL | Usuarios, productos, stock, pedidos, movimientos, inventario privado e imágenes |
| Correo opcional | Resend para recuperar contraseñas, no para registrarse |
| Contacto externo | Enlaces de WhatsApp; no envíos automáticos de mensajes de soporte |

Las dependencias principales son Next.js 15, React 19, Prisma 6, Zod 4, bcryptjs, jose y lucide-react; package-lock.json fija las versiones instaladas. package.json declara rangos compatibles. Usa una versión de Node.js con soporte y compatible con las dependencias; los scripts con archivo de entorno necesitan Node.js 20.6 o superior.

| Directorio/archivo | Responsabilidad de mantenimiento |
|---|---|
| app/ | Páginas, metadatos, endpoints y CSS global |
| components/ | Acceso, catálogo, menú, imágenes, comprobantes e inventario |
| lib/ | Autenticación, seguridad, catálogo, helpers y migración |
| prisma/schema.prisma | Modelo de datos autorizado de la aplicación |
| prisma/seed*.ts | Inicialización administrativa y catálogos de ejemplo |
| scripts/ | Comprobación de correo y entrada de migración |
| tests/ | Pruebas unitarias e integración PostgreSQL aislada |
| public/ | Recursos visuales estáticos versionados |
| .env / .env.migration | Configuración privada local; no se publica en Git |

## 13. Modelo de datos y relaciones
El esquema contiene 15 modelos de aplicación. Los identificadores son generalmente cadenas; BannerImage utiliza una posición numérica. Los importes COP son enteros. Las restricciones PostgreSQL garantizan unicidad de correo, identidad de acceso y relaciones entre registros. El anexo A enumera los campos.

| Relación | Significado de negocio |
|---|---|
| User → Product | Vendedor/propietario opcional de un producto |
| User → Order → OrderItem | Comprador, compra y detalle inmutable |
| Product → StreamingAccess | Accesos individuales disponibles, vendidos o retirados |
| OrderItem → StreamingAccess | Accesos vendidos que cumplieron una línea |
| Order → CheckoutAttempt | Recuperación de una solicitud idempotente |
| User → WalletEvent | Recargas y descuentos registrados |
| User → PasswordReset | Autorizaciones temporales de recuperación |

La descripción, precio y configuración de credenciales del producto pueden cambiar; OrderItem conserva nombre, precio unitario, cantidad, categoría y vendedor registrados al comprar. El comprobante cifrado guarda el contenido entregado por separado. Esta diferencia es fundamental al investigar una compra anterior.

BannerImage y CatalogImageAsset guardan archivos binarios en PostgreSQL y deben incluirse en respaldos. CatalogOrder contiene el orden en JSON y su versión. StoreSettings conserva la disponibilidad para clientes. RateLimit guarda contadores de autenticación con vencimiento; es estado operativo, no un libro financiero.

PendingRegistration se mantiene únicamente por compatibilidad con datos antiguos y migración. No es una cola activa de registros. La existencia de una tabla no significa que una función anterior siga habilitada.

## 14. Controles de seguridad y límites
Las contraseñas utilizan bcrypt con costo 12. Las sesiones JWT emplean HS256, vencen en siete días y se transportan en la cookie goat_session con HttpOnly y SameSite=Lax; Secure se habilita en producción. El servidor compara la versión de sesión del token con User. Recuperar la contraseña o volver a ejecutar seed para cambiar la del administrador invalida sesiones anteriores mediante sessionVersion.

Los accesos y comprobantes se protegen con AES-256-GCM, cifrado autenticado y datos de inicialización aleatorios. La clave se deriva de DELIVERY_SECRET o, si falta, de AUTH_SECRET. Las identidades de streaming utilizan HMAC con clave. Conserva los secretos originales efectivos junto al respaldo correspondiente. Cambiar o añadir una clave de entrega después de guardar datos no es un procedimiento de rotación compatible y puede impedir leer registros existentes.

Las modificaciones JSON limitan el cuerpo a aproximadamente 16 KiB, comprueban el origen y validan el tipo de contenido. Las imágenes tienen su límite separado de 2 MB. Se permiten el origen real de la petición y los alias exactos suministrados por Vercel; otros proyectos vercel.app no quedan autorizados mediante comodines. Se rechazan peticiones Fetch Metadata cross-site. APP_URL sigue definiendo la base canónica de los enlaces de recuperación.

El control de intentos reside en la base: login y restablecimiento permiten 20 intentos por acción/identidad cada 15 minutos; registro y solicitud de recuperación permiten cinco. El límite global de autenticación es 1.000 por ventana. HTTP 429 indica limitación. Estas ventanas fijas no sustituyen el firewall o la protección contra abuso del alojamiento.

Las respuestas incorporan protección contra framing, interpretación MIME y filtrado de referencias, una CSP que restringe objetos/formularios/frames y HSTS en producción. La CSP no es una política completa de scripts con nonces. La implementación no constituye una prueba de penetración, certificación normativa, sistema MFA o servicio integral de monitoreo de seguridad.

## 15. Variables de entorno y elección de base de datos
Una conexión de base no es una clave de API de correo. Las conexiones PostgreSQL comienzan por postgres:// o postgresql://. Las claves de Resend suelen comenzar por re_. Nunca incluyas valores reales en documentación, repositorio, capturas o mensajes de soporte.

| Variable | Propósito y regla operativa |
|---|---|
| DATABASE_URL | Base PostgreSQL utilizada por ese entorno; conserva parámetros TLS necesarios |
| AUTH_SECRET | Secreto obligatorio de sesión, mínimo 32 caracteres; alternativa de cifrado |
| DELIVERY_SECRET | Secreto opcional independiente de entrega/HMAC; conserva la clave efectiva original |
| APP_URL | Origen HTTPS canónico de producción; HTTP local se admite para localhost |
| RESEND_API_KEY | No se necesita para registrarse; sí para recuperar contraseña por correo |
| EMAIL_FROM | Remitente autorizado en dominio verificado para recuperación a clientes |
| ADMIN_EMAIL | Correo privado del administrador inicial para seed |
| ADMIN_PASSWORD | Contraseña privada de seed; mínimo 12 caracteres y máximo 72 bytes UTF-8 |
| SOURCE_DATABASE_URL | Origen Supabase de la utilidad de migración única |
| TARGET_DATABASE_URL | Destino Neon vacío para dicha utilidad |

Supabase y Neon son alternativas para PostgreSQL. La aplicación no necesita ambos. Supabase Auth y Storage no son los sistemas de autenticación e imágenes utilizados por la tienda. El despliegue puede conectarse directamente a Supabase; selecciona una conexión directa o de sesión compatible con el entorno.

El desarrollo local lee .env; Vercel utiliza las variables configuradas en su panel. Si las conexiones apuntan a bases distintas, usuarios, saldos, stock y pedidos son independientes. Compartir una base también comparte el impacto de los cambios locales. Siempre que sea posible, separa los datos de desarrollo y prueba.

No se han inspeccionado independientemente para este manual el proveedor activo, la rama de producción ni los secretos. Durante la configuración se utilizó https://goat-goat-8011.vercel.app; verifica el dominio vigente en Vercel antes de cambiar APP_URL.

## 16. Instalación local y administrador inicial
Clona o abre el repositorio, selecciona la rama prevista e instala las dependencias fijadas por el archivo de bloqueo. Crea .env a partir de .env.example y proporciona las conexiones y secretos en privado. Aplica el esquema únicamente sobre la base correcta. db:push crea o actualiza estructura; no copia registros desde Supabase a Neon.

```sh
npm install
npx prisma generate
npm run db:push
npm run dev
```

Para una base nueva que deba recibir administrador y catálogo digital de ejemplo, configura ADMIN_EMAIL y ADMIN_PASSWORD y ejecuta seed cargando el entorno explícitamente:

```sh
node --env-file=.env --import tsx prisma/seed.ts
```

El seed rechaza promover un correo que ya pertenezca a una cuenta no administrativa. Al ejecutarlo para un administrador existente actualiza la contraseña e incrementa sessionVersion. Añade productos de ejemplo faltantes sin duplicar nombres coincidentes de la tienda. No lo ejecutes antes de migrar a un destino vacío: la migración rechaza destinos con registros del negocio.

Los catálogos opcionales se cargan con npm run db:seed:technology y npm run db:seed:secondhand. No interpretes cantidades o descripciones de ejemplo como inventario comercial verificado.

Para probar producción localmente, ejecuta npm run build y después npm run start. El desarrollo compila páginas bajo demanda y no representa el rendimiento de producción. Nunca publiques .env, sus conexiones o las credenciales administrativas.

## 17. Despliegue Vercel y operación de dominios
La versión de referencia está en password-reset. Desplegar un main antiguo puede impedir detectar Next.js u omitir funciones recientes. Comprueba rama y commit de cada despliegue; volver a desplegar una ejecución antigua reutiliza su código anterior.

1. Importa cabr444/Goat_Store en Vercel.
2. Configura la rama de producción mantenida, actualmente password-reset.
3. Selecciona Next.js, directorio raíz ./ y comando npm run build.
4. Configura las variables del entorno Production/Preview correspondiente.
5. Aplica el esquema Prisma sobre PostgreSQL y decide si inicializar o migrar datos.
6. Crea un despliegue con la referencia Git correcta y espera Ready.
7. Define APP_URL con la dirección HTTPS pública canónica; vuelve a desplegar al cambiar variables.
8. Comprueba registro, acceso, secciones, saldo, inventario, compra y comprobantes privados.

Vercel aloja la aplicación y el proveedor PostgreSQL aloja la base; la web publicada no depende de que el PC del propietario permanezca encendido. localhost:3000 es una dirección local. Para clientes externos, verifica que la protección del despliegue no exija una cuenta de Vercel. Comparte la dirección pública, no un enlace del panel.

El dominio propio es opcional. Configúralo en Vercel y en su proveedor DNS y actualiza APP_URL. Tener una página vercel.app no permite verificar vercel.app como dominio remitente de Resend. Correo y alojamiento web son configuraciones independientes.

La visibilidad en buscadores no es automática. El catálogo que exige sesión limita la indexación pública. Un catálogo abierto, sitemap/robots y alta en buscadores son mejoras posibles; desplegar no garantiza posición o indexación en Google.

## 18. Migración de datos de Supabase a Neon
El repositorio incluye una herramienta de copia única de datos hacia Neon vacío. A diferencia de db:push, transfiere registros. Conserva hashes bcrypt y saldos; incluye productos, pedidos, movimientos, imágenes, configuración, inventario privado y comprobantes cifrados. Auth/Storage/roles internos de Supabase quedan fuera del alcance de datos de la aplicación. Los contadores RateLimit del destino se conservan y los del origen no se importan.

Antes de copiar, respalda el origen, detén escrituras de la tienda anterior o servidor local y conserva los secretos de cifrado originales. Comprueba que el destino Neon sea el mismo que utiliza Vercel. No registres cuentas ni ejecutes seed primero en el destino. La herramienta no fusiona dos tiendas activas.

Crea .env.migration privado a partir de .env.migration.example:

```env
SOURCE_DATABASE_URL="<conexión PostgreSQL de Supabase>"
TARGET_DATABASE_URL="<conexión PostgreSQL de Neon vacío>"
```

Mantén DATABASE_URL de .env apuntando al destino para actualizar el esquema y ejecuta:

```sh
npm run db:push
npm run db:migrate:check
npm run db:migrate:apply
```

Check lee sin escribir. Apply repite la comprobación de destino vacío, bloquea las tablas de aplicación, copia en una transacción del destino y verifica conteos y sumas de comprobación del contenido. Supabase se consulta mediante una instantánea de solo lectura. Las tablas nuevas reconocidas que no existían en un origen anterior quedan vacías; ciertos campos nuevos reciben su valor predeterminado. El contador se ajusta si hace falta para no repetir referencias P existentes.

Un fallo durante la copia cancela la transacción. Si se pierde conexión al confirmar, inspecciona Neon antes de asumir reversión o repetir. Un destino con datos se rechaza y no se vacía. Si Neon ya contiene registros comerciales, planifica una conciliación/fusión independiente. Se prefieren conexiones directas; puede utilizarse Session pooler de Supabase cuando la red no admite el acceso directo IPv6.

## 19. Operación, respaldos e incidentes
La aplicación no programa respaldos de base de datos por sí misma. Configura copias o recuperación a un punto en el tiempo con el proveedor PostgreSQL y prueba la restauración en un entorno separado. Restaurar correctamente exige datos y secretos de cifrado originales. Volver a desplegar el código no recupera registros borrados.

| Frecuencia | Actividad operativa |
|---|---|
| Antes de abrir ventas | Revisar acceso público, dominio, precios reales e inventario individual |
| Durante la operación diaria | Revisar errores, eventos de saldo/recarga, perfiles disponibles y soporte |
| Antes de una versión | Respaldar, verificar rama/commit, revisar esquema y ejecutar pruebas pertinentes |
| Después de una versión | Validar registro/acceso, secciones, compra, comprobantes e imágenes |
| Periódicamente | Probar restauración y revisar permisos, dependencias, remitente y secretos |

Ante una reclamación de compra, localiza primero el pedido y WalletEvent. Un error de red puede ocurrir después de confirmar una compra. Verifica lo guardado antes de acreditar saldo manualmente o pedir otra compra. Siempre que corresponda, utiliza la recuperación de la solicitud original.

Si una clave de cifrado se pierde o cambia por accidente, restaura la clave efectiva original antes de modificar registros. No reemplaces contenido cifrado con datos supuestos. Si se expuso una credencial o contraseña de base, revoca o rota esa credencial externa y coordina la configuración; rotar la clave de cifrado requiere un plan independiente de recifrado.

Ante una caída, identifica si falla el despliegue, conexión/esquema, origen, permiso, límite de intentos, inventario o correo. Recoge registros sin secretos, hora, ruta y commit. No solicites contraseñas de clientes o accesos privados de streaming mediante capturas.

## 20. Pruebas, diagnóstico y límites conocidos
Las pruebas unitarias se ejecutan con npm test; los tipos se verifican con npx tsc --noEmit; la compilación de producción usa npm run build. npm audit --omit=dev informa vulnerabilidades conocidas en el momento de ejecución, no una garantía permanente. No se repitieron pruebas únicamente para redactar este manual; ejecútalas para la versión que se vaya a publicar.

Las pruebas PostgreSQL cubren inventario, asignación única, compras múltiples/reintentos, registro directo y acceso, secciones, orden y migración. Las relacionadas con inventario requieren una base local desechable goat_inventory_test y servidor coincidente. Las de migración necesitan dos bases locales desechables de origen/destino. Nunca ejecutes datos sintéticos de integración sobre bases de clientes.

| Síntoma | Investigación o acción |
|---|---|
| NEXT_NO_VERSION | Verificar rama/commit, raíz ./ y Next.js en package.json |
| Solicitud no autorizada | Revisar versión desplegada, origen, APP_URL y alias; desplegar la corrección de orígenes |
| No fue posible procesar la solicitud | Revisar logs sin secretos, conexión y tablas como RateLimit |
| Correo o contraseña incorrectos | Comprobar la cuenta en la base exacta activa; recuperar contraseña, no editar passwordHash |
| Faltan usuarios al cambiar base | Cambiar URL no copia datos; migrar o registrar deliberadamente en la nueva base |
| Remitente no autorizado | Afecta a recuperación: verificar dominio EMAIL_FROM y Resend; el registro ya no envía correo |
| Streaming muestra Agotado | Agregar perfiles individuales; credenciales compartidas/stock manual no reponen Streaming |
| Conflicto de stock/orden | Recargar versión actual; no sobrescribir ventas recientes con valores anteriores |
| No aparece código nuevo | Comprobar commit Ready, dominio público correcto y actualizar página |
| Tienda/Segunda visibles al cliente | Revisar interruptores y corrección de encabezado 42fd1ce o posterior |

Entre los límites están registro abierto de vendedores, ausencia de MFA propia, pasarela automática, motor de reembolsos, panel completo de cumplimiento y liquidación a vendedores, renovación/reciclaje de perfiles y catálogo público anónimo. Las series son editoriales, no un ranking en vivo. Tecnología y segunda mano exigen gestión operativa manual. Las mejoras deben priorizar las necesidades reales del negocio, soporte y obligaciones aplicables.

## 21. Mantenimiento y gobierno documental
El esquema y la implementación del repositorio son la referencia técnica. Actualiza este manual si cambia una ruta, permiso, formulario, regla de inventario, variable, requisito de migración o procedimiento. Mantén sincronizadas las ediciones inglesa y española.

| Tipo de cambio | Documentación que debe revisarse |
|---|---|
| Registro/autenticación | Guía del cliente, seguridad, API y requisitos de correo |
| Producto/streaming | Procedimientos, compra, diccionario y pruebas |
| Procesamiento financiero | Movimientos/pedidos, soporte y límites |
| Alojamiento/base de datos | Configuración, despliegue, migración e incidentes |
| Esquema/API | Anexos, validación, compatibilidad y respaldos |

La versión documental 1.0 es la referencia inicial. Incrementa la revisión, registra commit y fecha, describe el cambio y conserva la edición aprobada anterior. Word es editable; para regenerar documentos de manera consistente, transfiere los cambios finales también a la fuente Markdown.

El paquete fuente incluye ambos Markdown y un generador DOCX en Python. Generarlos es una tarea documental opcional, separada de npm build y de la ejecución de la aplicación. Revisar este manual no exige desplegar ni modificar datos de clientes.

## Anexo A. Diccionario de datos
Los campos describen el esquema actual. El signo de interrogación indica un valor nullable; los corchetes indican colecciones de relaciones. Las relaciones principales se resumen en la sección 13.

| Modelo | Campos almacenados principales | Propósito |
|---|---|---|
| User | id, email (único), name, passwordHash, role, balance, sessionVersion, createdAt | Identidad, permisos y saldo prepagado |
| Product | id, name, category, price, description, mark, gradient, active, stock, ownerId?, deliveryCipher?, createdAt | Catálogo y entrega antigua no streaming |
| OrderCounter | id, value | Asignación de referencias consecutivas |
| Order | id, reference? (único), userId, total, status, createdAt | Cabecera de compra |
| OrderItem | id, orderId, productId, name, category, sellerId?, quantity, unitPrice, receiptCipher? | Línea y copia cifrada de la entrega |
| WalletEvent | id, userId, amount, type, note, createdAt | Registro de recargas/descuentos |
| PasswordReset | tokenHash (clave primaria), userId, expiresAt, createdAt | Autorización de recuperación de un uso |
| BannerImage | slot (clave primaria), data (bytes), contentType, updatedAt | Seis sustituciones del banner en base de datos |
| RateLimit | key (clave primaria), count, expiresAt | Contadores de autenticación con vencimiento |
| CatalogImageAsset | key (clave primaria), data (bytes), contentType, updatedAt | Imágenes de producto/categoría/editorial |
| StoreSettings | id, tiendaEnabled, segundaEnabled | Interruptores para clientes |
| CatalogOrder | kind (clave primaria), ids (JSON), version | Orden compartido y control de conflictos |
| PendingRegistration | email (clave primaria), name, passwordHash, role, tokenHash (único), statusHash (único), createdAt, expiresAt, confirmedAt? | Confirmaciones históricas; flujo inactivo |
| CheckoutAttempt | key (clave primaria), orderId (único) | Recuperación idempotente de compra |
| StreamingAccess | id, productId, fingerprint (único), platform, cipher, createdAt, version, soldAt?, retiredAt?, orderItemId? | Inventario individual de streaming de una sola venta |

Un StreamingAccess disponible tiene soldAt y retiredAt en null. Los vendidos se asocian a una línea; los retirados conservan su identidad reservada. La disponibilidad pública de Streaming se calcula con las filas disponibles. Existe Product.active, pero Agotar mantiene deliberadamente el producto visible con cero disponibilidad y no funciona como un interruptor general de publicación.

## Anexo B. Referencia de API
Las rutas son relativas al origen de la aplicación. Las modificaciones ordinarias requieren JSON; las imágenes usan su tipo binario admitido. Se mantienen los límites y permisos pertinentes. Esta referencia es un mapa de la implementación, no sustituye la validación de cada endpoint.

| Método y endpoint | Autorización | Propósito / entrada importante |
|---|---|---|
| POST /api/auth/register | Público, limitado | name, email, password, role; crea cuenta con HTTP 201 |
| POST /api/auth/login | Público, limitado | email, password; cookie de sesión al acceder |
| POST /api/auth/logout | Relacionado con sesión | Eliminar cookie de sesión |
| POST /api/auth/forgot-password | Público, limitado | email; solicitar recuperación |
| POST /api/auth/reset-password | Público con token válido | token, password; consumir token e invalidar sesiones |
| POST /api/auth/verify-email | Retirado | HTTP 410; no crea cuentas |
| POST /api/auth/resend-verification | Retirado | HTTP 410; no envía confirmaciones |
| POST /api/auth/registration-status | Retirado | HTTP 410; flujo pendiente deshabilitado |
| GET /api/me | Público | Usuario actual o null |
| GET /api/storefront | Autenticado | Usuario, productos permitidos, compras recientes, opciones y orden; lista de usuarios solo ADMIN |
| GET /api/products | Autenticado | Campos públicos de productos permitidos y configuración |
| POST /api/products | ADMIN / VENDEDOR | Crear producto validado con propiedad del usuario actual |
| PATCH /api/products/[id] | ADMIN / VENDEDOR propietario | Datos y expectedStock; actualización protegida |
| POST /api/products/[id]/duplicate | ADMIN / VENDEDOR propietario | Crear copia independiente de catálogo/imagen, sin stock ni datos privados de entrega |
| DELETE /api/products/[id] | ADMIN / VENDEDOR propietario | Agotar; retirar streaming disponible |
| GET /api/orders | Autenticado | Últimos 50 pedidos propios y líneas seguras |
| POST /api/orders | Autenticado | items[{id,qty}], checkoutKey opcional; compra/recuperación transaccional |
| GET /api/admin/users | ADMIN | Listado de identidad, rol y saldo |
| POST /api/admin/recharge | ADMIN | userId, amount, note; crédito administrativo registrado |
| GET, PUT /api/admin/store-options | ADMIN | Consultar opciones; actualizar department y enabled |
| PUT /api/admin/card-order | ADMIN | kind, id, target, position, version |
| GET, PUT /api/admin/products/[id]/delivery | ADMIN | Entrega digital antigua; PUT rechazado para Streaming |
| GET /api/admin/products/[id]/inventory | ADMIN | Filas disponibles, cantidades, plataforma e indicador antiguo |
| POST, PATCH, DELETE /api/admin/products/[id]/inventory | ADMIN | Añadir, editar o retirar perfiles; comprobar versión al cambiar |
| GET /api/banners | Autenticado | Metadatos del banner |
| GET /api/banners/[slot] | Autenticado | Bytes de imagen y revalidación privada ETag |
| POST, DELETE /api/banners/[slot] | ADMIN | Cargar o eliminar sustitución del banner |
| GET /api/catalog-images | Autenticado | Metadatos de imágenes del catálogo |
| GET /api/catalog-images/file | Autenticado | Bytes de imagen por clave lógica |
| POST, DELETE /api/admin/images | ADMIN | Cargar/eliminar imagen de categoría, producto, serie o plataforma |

Las respuestas importantes son 400 para validación/rechazo de negocio, 401 para falta de sesión o acceso incorrecto, 403 para permisos/origen, 409 para conflictos, 410 para confirmación retirada, 413/415 para tamaño/tipo, 429 para exceso de intentos y 503 para fallos temporales. Un pedido nuevo devuelve 201; recuperar una compra coincidente puede devolver 200. Los comprobantes descifrados se muestran al comprador en páginas privadas, no en el catálogo público de productos.

## Anexo C. Comandos, publicación y glosario
| Comando | Propósito |
|---|---|
| npm install | Instalar dependencias |
| npm run dev | Servidor local de desarrollo |
| npm run build | Generar cliente Prisma y compilación de producción |
| npm run start | Servir la aplicación compilada |
| npm run db:push | Sincronizar esquema; no transferir registros |
| node --env-file=.env --import tsx prisma/seed.ts | Inicializar/restablecer administrador configurado y añadir ejemplos digitales faltantes |
| npm run db:seed:technology | Añadir catálogo tecnológico de ejemplo |
| npm run db:seed:secondhand | Añadir catálogo usado de ejemplo |
| npm run db:studio | Abrir Prisma Studio; acceso sensible a datos |
| npm run email:check | Comprobar recuperación por correo sin enviar mensajes |
| npm run db:migrate:check | Comprobación de migración sin escrituras |
| npm run db:migrate:apply | Copiar a destino vacío y verificar |
| npm test / npx tsc --noEmit | Pruebas unitarias / validación de tipos |
| npm run test:inventory / npm run test:streaming | Integración aislada de inventario/asignación |
| npm run test:duplicate | Pruebas aisladas de copia, propiedad, imagen y rollback |
| npm run test:migration | Pruebas con dos bases desechables |

Lista de publicación: comprobar rama/commit; proteger datos y secretos; aplicar solo cambios de esquema revisados; configurar entorno y correo si corresponde; ejecutar controles; esperar Ready; verificar dominio público; probar recorrido de cliente; confirmar secciones ocultas; revisar privacidad de comprobantes y monitorizar registros sin secretos.

Glosario: COP significa peso colombiano; saldo es el crédito interno prepagado; pedido es una compra; perfil puede ser el panel de cuenta o un perfil de plataforma según contexto; agotado indica cero disponibilidad; checkout key identifica una intención de compra recuperable; ciphertext es contenido cifrado; la conexión selecciona una base y una clave API autoriza un servicio.

Registro de revisión: 1.0 — 17 de octubre de 2026 — Primera edición española basada en 42fd1ce; incluye registro directo, inventario individual, migración y corrección de visibilidad en cuenta. Actualiza esta entrada y la edición inglesa al cambiar el comportamiento.


1.1 — 18 de octubre de 2026 — Actualización a 56f7f83: duplicación de productos, imagen independiente, stock cero, protección de datos privados, permisos de propiedad y guía dentro del editor móvil.

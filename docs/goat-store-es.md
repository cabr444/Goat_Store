# Goats Store
## 01. Control documental y propósito
Este manual describe Goats Store según la revisión de código 22cd272 de la rama password-reset. Es una referencia operativa y técnica para el propietario del negocio, administradores, personal de soporte, desarrolladores y responsables del despliegue. Versión del paquete de la aplicación: 2.0.0. Versión de la documentación: 2.0. Fecha de revisión: 26 de octubre de 2026.

El documento distingue el funcionamiento implementado de las recomendaciones operativas y las mejoras futuras. No afirma que una base de datos de producción, remitente de correo, dominio o política de respaldos específicos estén configurados. Estos valores deben comprobarse en los paneles de los proveedores. No contiene registros de clientes, contraseñas, conexiones ni claves de API.

| Control | Valor |
|---|---|
| Repositorio | github.com/cabr444/Goat_Store |
| Código de referencia | password-reset / 22cd272 |
| Responsable documental | Administrador del proyecto Goats Store |
| Uso previsto | Administración, soporte, despliegue y mantenimiento |
| Formatos maestros | Documento Word editable y fuente Markdown versionada |
| Motivos de revisión | Cambios en flujos, permisos, esquema, dependencias o alojamiento |

El archivo Word puede editarse en Microsoft Word, LibreOffice Writer u otra aplicación compatible con DOCX. Para actualizarlo de forma reproducible, modifica la fuente Markdown correspondiente, actualiza el registro de revisiones y regenera el documento. Las pantallas, políticas y configuraciones de producción pueden cambiar después de esta versión.

## 02. Resumen ejecutivo y alcance
Goats Store es una tienda en español para planes de streaming, servicios digitales, cursos y departamentos opcionales de productos físicos. Los clientes pagan con saldo interno prepagado en pesos colombianos (COP). Los visitantes pueden navegar y llenar el carrito sin registrarse; comprar requiere una cuenta autenticada.

Inicio utiliza una presentación de marketplace con marca Goats, buscador, banners y carruseles por departamento. Streaming tiene una experiencia de descubrimiento y catálogo propia. ADMIN gestiona productos, precios, imágenes, orden, saldos, ventas e inventario privado. Tienda y Segunda pueden ocultarse para visitantes y CLIENTE sin eliminar compras anteriores.

El inventario de streaming usa un registro único por acceso. Un perfil individual puede ofrecerse en varios planes de una misma plataforma. Al venderse en cualquiera, se descuenta de todos sus planes vinculados. La cuenta completa es un modo separado de una sola unidad y no puede registrarse también como perfiles vendibles independientes. Los combos reservan perfiles individuales elegibles del mismo inventario.

El registro es inmediato y no exige confirmar correo. La recuperación de contraseña usa un servicio de correo separado. La aplicación funciona en su alojamiento independientemente del PC del desarrollador. La conciliación bancaria automática, los reembolsos, la integración de envíos, el alojamiento de cursos y los pagos a vendedores quedan fuera del alcance implementado.

## 03. Roles y modelo de permisos
Los permisos se comprueban en el servidor. Ocultar un botón es una medida de interfaz y no sustituye la autorización de la API. ADMIN se crea de forma privada mediante el proceso seed y no puede elegirse en el registro público. CLIENTE y VENDEDOR sí pueden seleccionarse al registrarse. Los visitantes pueden navegar el catálogo público permitido y llenar el carrito local, pero no comprar, ver datos privados ni administrar.

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
La navegación pública incluye Inicio, Streaming, Combos, Tienda, Segunda, Cursos y contacto, según la visibilidad configurada. Productos y Beneficios ya no son secciones independientes de Inicio. Los visitantes ven el acceso para ingresar/registrarse; saldo, perfil y cierre de sesión aparecen solo a usuarios autenticados.

| Ruta | Propósito y acceso |
|---|---|
| / | Inicio público de marketplace, buscador y carruseles |
| /catalogo?categoria=Streaming | Descubrimiento de streaming, selección editorial y filtros digitales públicos |
| /catalogo?categoria=Combos | Catálogo público de combos |
| /store | Tienda pública; redirige a visitantes/clientes si está deshabilitada |
| /store?personalizados=1 | Tienda filtrada a Vasos y Camisetas |
| /segunda | Catálogo usado público; redirige a visitantes/clientes si se deshabilita |
| /cursos | Catálogo público de cursos |
| /acceso | Inicio de sesión, registro inmediato y recuperación |
| /perfil | Perfil autenticado, saldo, gasto y actividad reciente |
| /pedidos | Compras paginadas y comprobantes privados |
| /administracion/ventas | Panel de ventas y accesos operativos ADMIN |
| /administracion/ventas/[id] | Detalle ADMIN de pedido y comprobantes privados |
| /administracion/clientes | Usuarios, saldos, compras y recargas recientes para ADMIN |
| /administracion | Catálogo, cuentas de streaming, imágenes y opciones ADMIN |
| /restablecer-contrasena | Recuperación mediante token enviado por correo |
| /confirmar-correo | Aviso de compatibilidad; confirmación retirada |

El círculo de perfil funciona con hover, clic, toque y teclado. Perfil y Pedidos abren páginas privadas; ADMIN también ve Administración. Soporte y Recargas abren WhatsApp al +57 3223037790 con mensajes preparados según la opción. El usuario decide enviarlos.

El carrito del visitante se conserva durante el registro/acceso. Comprar como visitante abre autenticación y devuelve al carrito o a la confirmación de compra directa; autenticarse no cobra automáticamente. Los interruptores de Tienda/Segunda se aplican a enlaces/carruseles de Inicio, cabeceras de cuenta, respuestas del catálogo, páginas y checkout. Las compras anteriores siguen disponibles en el historial privado.

## 05. Registro, acceso y recuperación de contraseña
Para registrarse, abre Registrarse, escribe nombre, correo, contraseña y tipo de cuenta, y pulsa Crear cuenta. Si la operación es correcta se crea inmediatamente el User y el formulario vuelve al inicio de sesión con un mensaje de éxito. La contraseña del formulario se borra. Después se utiliza Entrar a Goats con las nuevas credenciales; la bienvenida animada solo aparece tras un acceso válido.

Los correos se recortan y convierten a minúsculas en registro e inicio de sesión. Una restricción única en base de datos impide duplicados, incluso cuando dos solicitudes llegan simultáneamente. La contraseña de registro debe tener entre 10 y 128 caracteres y no superar 72 bytes UTF-8, evitando el truncamiento de bcrypt. Se guarda un hash bcrypt, no la contraseña legible. Un control permite mostrar u ocultar la contraseña introducida.

Los tickets del antiguo flujo de espera se eliminan del almacenamiento de sesión del navegador. Los endpoints de verificación, reenvío y estado se retiraron y responden HTTP 410. Las solicitudes pendientes no se convierten automáticamente en cuentas; esos usuarios deben registrarse otra vez. PendingRegistration se conserva en el esquema para compatibilidad histórica y migraciones.

La recuperación utiliza ¿Olvidaste tu contraseña? y requiere una API de Resend y un EMAIL_FROM autorizado. Los tokens vencen a los 30 minutos, son de un solo uso y se guardan como hashes SHA-256. Un cambio correcto incrementa sessionVersion para invalidar sesiones anteriores. El mensaje de solicitud no confirma si el correo está registrado; si no llega el mensaje, revisa los registros del proveedor.

Para enviar recuperación a clientes reales se necesita un dominio remitente verificado. El remitente de pruebas de Resend está limitado al correo del propietario de la cuenta. Quitar la confirmación de registro no elimina este requisito del servicio de recuperación.

## 06. Catálogo, búsqueda y contenido editorial
Inicio muestra su banner de seis imágenes y estos carruseles, en orden: Streaming (hasta 10), ¡Personaliza a tu manera! (hasta 20), Tienda (hasta 10), Segunda (hasta 10) y Cursos (hasta 10; actualmente se suministran seis cursos). Si hay menos registros, se muestran menos tarjetas, sin inventar duplicados. Tienda y personalizados respetan el interruptor de Tienda; Segunda respeta el suyo.

El carrusel de personalizados alterna Vasos y Camisetas. Su cargador opcional aporta diez diseños de vasos y diez de camisetas: nombre, foto, frase, mascota, diseño propio, estilo anime, parejas, cumpleaños, gamer y logo empresarial. Son ejemplos editables con precios de muestra y stock inicial cero. Diseño, tallas, preparación y entrega se coordinan con soporte; el checkout no incluye carga/configuración de arte del cliente ni motor de envíos.

La búsqueda de Inicio compara nombre, categoría y descripción en los departamentos visibles para el visitante. Los filtros digitales son Todos, Streaming, Música, Productividad y Combos. Búsqueda y Todos se limitan al catálogo actual y no permiten acceder a departamentos deshabilitados.

Las categorías de Tienda son Tecnología, Periféricos, Audio, Accesorios, Juguetes, Vasos y Camisetas, con carrusel horizontal, deslizamiento y flechas. Los nombres anteriores Computadores y Redes mantienen compatibilidad mediante alias. Se conservan los productos existentes; no se sustituyen automáticamente por inventario real de juguetes. Segunda contiene Tecnología usada, Ropa usada y Calzado usado. Los seeds de tecnología y usados aportan 50 ejemplos cada uno; verifica nombres, stock, condición y precios antes de vender.

Los seis cursos suministrados son Aprende a activar office 365 x siempre; Aprende a Sacar cuentas Prime Video; Aprende a Sacar cuentas youtube; Aprende a generar tarjetas temporales; Aprende a generar ingresos extra; y Aprende a activar Windows. Sus títulos están en español y son editables. Los seeds crean fichas comerciales, no lecciones, videos, suscripciones ni licencias. Confirma materiales legítimos, licencias requeridas, condiciones de acceso y entrega antes de habilitar stock.

Historias que enganchan pertenece a Streaming, no a Inicio. Ofrece pestañas, desplazamiento horizontal y flechas para selecciones de Netflix, Prime Video, Disney+, HBO Max, Apple TV+, Paramount+, Crunchyroll, ViX y YouTube. Series y géneros son editoriales, no un ranking en tiempo real. ADMIN puede cambiar sus imágenes.

Las tarjetas mantienen productos con stock cero y Agotado, muestran cantidades positivas en verde y permiten carrito y Comprar ahora cuando hay disponibilidad. Precios y botones se alinean por fila aunque los textos tengan distinta longitud. ADMIN controla el orden de tarjetas/categorías. El stock se consulta aproximadamente cada 15 segundos mientras la pestaña esté visible y no se esté ordenando; el checkout vuelve a validar el servidor.

El fondo de Inicio cambia cada siete segundos manteniendo texto y acciones. Hay pausa y adaptación a movimiento reducido. El acceso incluye fondo animado, mascota y bienvenida tras un inicio de sesión válido; la pestaña del navegador usa la cara de la cabrita. La marca pública es Goats.; rutas técnicas del repositorio e identificadores existentes goat-* no se renombran.

## 07. Carrito, compra e integridad financiera
Comprar ahora abre una confirmación separada de una unidad y conserva el carrito existente. Usa su propia intención de checkout. Agregar al carrito admite productos/cantidades múltiples. Los visitantes pasan por autenticación y regresan a su compra prevista; cobrar requiere confirmar explícitamente el checkout.

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
La disponibilidad de Streaming se calcula con StreamingAccess disponibles, no con una cantidad manual ni con el antiguo Product.deliveryCipher. Cada fila tiene una identidad única de plataforma/cuenta/perfil. productId es el producto principal y productIds contiene planes adicionales. Son vínculos a una unidad, no copias. Cambiar clave, PIN o etiqueta no reactiva identidades vendidas/retiradas.

### Perfiles individuales compartidos
1. Ingresa como ADMIN y abre Perfil → Administración → Cuentas de streaming, o /administracion#cuentas-streaming.
2. En Una cuenta, varios planes selecciona planes de perfiles individuales de una misma plataforma, por ejemplo Netflix x20, x28 y x33. Se permiten hasta 20 planes distintos.
3. Introduce un identificador de cuenta y su clave en campos separados. El identificador admite correo o solo dígitos, hasta 190 caracteres; se quitan espacios exteriores y se conservan ceros iniciales. El registro de usuarios de la tienda sigue requiriendo correo.
4. Añade de uno a siete perfiles con nombre/número distinto y PIN opcional para cada uno. Cada envío corresponde a una cuenta, no a una lista de correos y claves diferentes.
5. Pulsa Guardar cuenta y vincular planes y revisa el resultado visible. Los errores aparecen en rojo junto a Guardar, reciben foco y se desplazan a la vista sin borrar los valores rechazados.

Ejemplo: siete perfiles vinculados a x20/x28/x33 muestran siete disponibles en cada plan, pero solo existen siete accesos reales. Si una compra x20 recibe el perfil 1, los tres planes quedan en seis; los perfiles 2–7 continúan disponibles. Un carrito con planes distintos debe recibir perfiles canónicos distintos, y dos compradores concurrentes no pueden obtener el mismo registro.

Para vincular un perfil sin vender a más planes, envía su mismo identificador, perfil, clave y PIN. Se reutiliza el registro existente; si sus credenciales difieren, corrígelas primero en el editor de inventario. Las identidades vendidas o retiradas no se reincorporan.

### Cuentas completas
Selecciona un producto Streaming llamado, por ejemplo, Prime Video cuenta completa. El formulario cambia a una unidad con el perfil fijo Cuenta completa. Introduce correo/ID numérico y clave, con PIN opcional. Los otros productos vinculados deben ser planes de cuenta completa de la misma plataforma. Otra cuenta requiere otro envío.

Una cuenta completa no puede registrarse simultáneamente como perfiles individuales independientes con el mismo identificador/plataforma. Las altas comprueban inventario e historial mediante transacciones serializables. Las cuentas completas siguen excluidas de los combos. Revisa registros manuales antiguos antes de ofrecerlos como inventario de cuentas completas; esta actualización no convierte automáticamente credenciales compartidas antiguas del producto en unidades nuevas.

### Edición individual y retiro
Editar producto → Inventario privado de streaming permite gestionar perfiles y unidades de cuenta completa. ADMIN ve conteos y los primeros 100 registros disponibles. La identidad de identificador/plataforma/perfil es inmutable en el editor; se pueden corregir encabezado, clave o PIN de accesos disponibles. Corregir una fila compartida afecta esa fila en todos sus planes, sin cambiar comprobantes guardados.

Retirar elimina la disponibilidad del perfil en todos sus planes. Agotar un producto quita sus vínculos disponibles compartidos sin vaciar los demás planes; el acceso sin planes restantes se retira. Los retirados y vendidos conservan su identidad reservada. No existe renovación, reciclaje ni reposición automática por vencimiento.

### Combos
Configura cantidad y precio del combo sin copiarle credenciales. Ejemplos reconocidos: Combo x2: Netflix + Prime Video y Combo x3: Netflix + Prime Video + Paramount. Cada combo vendido consume un perfil individual elegible por plataforma y una unidad de la cantidad configurada. Netflix debe ofrecer x28 días; se excluyen cuentas completas. Un perfil cuyo producto principal sea x20 puede abastecer un combo solo si también está vinculado a un plan x28 elegible.

El stock del combo es el mínimo entre cantidad configurada y cada inventario requerido. Diez combos con siete Netflix y cuatro Prime muestran cuatro disponibles. Si Netflix no está disponible, Prime solo no permite completar la compra: falla toda la transacción sin cobro ni reserva parcial. Los combos de vendedor usan fuentes elegibles del propietario; los generales/ADMIN pueden usar inventario de tienda. Las compras individuales y los combos comparten un conjunto de exclusión de perfiles dentro del checkout.

## 09. Pedidos, comprobantes y perfil
Al terminar la compra se abre Pedidos y aparece un comprobante centrado del pedido completado. Cerrarlo no elimina la compra ni su contenido. Los comprobantes siguen disponibles en el historial privado del comprador y en el detalle autorizado para ADMIN. Conocer o adivinar otro identificador no da acceso a los comprobantes de otra cuenta.

| Contenido | Significado |
|---|---|
| Encabezado y plataforma | Encabezado configurado por ADMIN y nombre del producto comprado |
| Correo/ID numérico, clave, perfil y PIN | Acceso de plataforma asignado al momento de comprar |
| Referencia y fecha | Referencia guardada y momento de la compra |
| Cantidad e importe | Información por unidad o línea, según el tipo de entrega |
| Aviso de uso | Instrucción de no modificar cuenta o perfil de la plataforma |

El comprobante se cifra como una copia inmutable de la entrega. Cambiar precios o credenciales posteriormente no reescribe comprobantes anteriores. Los asteriscos de énfasis se presentan como negrita; no se interpreta HTML arbitrario. Es un registro de entrega de acceso y no una factura electrónica tributaria integrada.

Los pedidos con entrega configurada en todas las líneas reciben ENTREGADO. Los pedidos físicos, manuales o mixtos pueden permanecer en PENDIENTE_ENTREGA. ADMIN puede cambiar el estado de entrega desde el panel de ventas. No hay cancelación, reembolso, envío ni reversión financiera automatizados.

El historial ofrece 20 pedidos por página, filtros de departamento y subtotales agrupados para compras mixtas. La API de resumen devuelve una lista reciente limitada; la página privada ofrece el historial paginado completo. Las fechas de cuenta/comprobantes se presentan en America/Bogota. Los importes son valores enteros COP.

Perfil muestra nombre, correo, rol, saldo, gasto registrado, fecha de registro, número de pedidos y hasta diez productos comprados recientemente. Vendedores y administradores pueden ver también ventas recientes según propiedad. El gasto corresponde a la suma de compras guardadas y no se ajusta mediante un subsistema de reembolsos, porque dicho subsistema no existe.

## 10. Procedimientos de administración
Abre el círculo de perfil → Administración para entrar a /administracion/ventas. Los accesos operativos llevan a productos/inventario, Cuentas de streaming, clientes, recargas, secciones e imágenes. /administracion es el espacio de catálogo. Las páginas y modificaciones administrativas comprueban ADMIN en el servidor.

### Ventas y clientes
El panel muestra total vendido registrado, pedidos, unidades y entregas pendientes. Permite buscar referencia/pedido, nombre/correo del comprador y producto, con filtros de estado, categoría y fechas de Bogotá. Hay 20 pedidos por página. Los filtros seleccionan pedidos completos: los totales incluyen todas las líneas de un pedido mixto coincidente. Total vendido no significa utilidad.

El detalle incluye identidad del comprador, fecha de registro, saldo actual, líneas/precios históricos y comprobantes privados. El control de entrega cambia ENTREGADO/PENDIENTE_ENTREGA comprobando el estado esperado. No cobra, reembolsa, repone stock, recicla accesos ni cambia el registro financiero.

La exportación CSV respeta filtros, usa una fila por línea, excluye claves/PIN/comprobantes cifrados de plataformas y neutraliza prefijos de fórmulas de hojas de cálculo. Se limita a 1.000 pedidos; reduce los filtros si se supera ese límite. Nombres/correos de clientes siguen siendo datos personales y requieren manejo controlado.

Clientes permite buscar y muestra 25 usuarios por página, con rol, fecha de alta, saldo, cantidad de compras y gasto registrado. Incluye los últimos 20 movimientos RECARGA coincidentes y accesos a historial/recarga. Las recargas son créditos administrativos, no confirmaciones bancarias: verifica el pago externo antes de registrarlas. La API admite enteros positivos hasta COP 10.000.000 y anota la referencia al administrador. No hay liquidación automática de comisiones a vendedores.

### Operación de catálogo
| Tarea | Procedimiento y resultado |
|---|---|
| Precio/nombre/descripción | Editar → cambiar valores → Guardar producto; las líneas históricas no cambian |
| Duplicar | Duplicar crea inmediatamente una copia independiente con stock cero y abre el editor |
| Streaming compartido | Cuentas de streaming → elegir planes de igual plataforma/modo → guardar cuenta/accesos |
| Inventario individual | Editar producto → Inventario privado de streaming |
| Otro stock | Introducir cantidad real; recargar ante conflicto del stock esperado |
| Agotar | Agotar lleva stock manual a cero o desvincula/retira accesos de streaming disponibles |
| Habilitar departamentos | Secciones disponibles para clientes → Tienda/Segunda por separado |
| Ordenar | Ordenar tarjetas arriba del catálogo → arrastrar/flechas → Terminar de ordenar |
| Cursos de ejemplo | Cursos → Cargar / actualizar cursos |
| Personalizados de ejemplo | Cargar / añadir productos personalizados en Inicio, Tienda o administración |
| Comprimir imágenes guardadas | Espacio administrativo → Comprimir imágenes existentes |

Los movimientos se guardan automáticamente para todos los visitantes. El orden es global, incluido Inicio; personalizados conserva la alternancia vaso/camiseta. El orden utiliza versión para conflictos concurrentes: recarga si ocurre uno. En pantallas táctiles utiliza las flechas.

Duplicar copia campos públicos e imagen personalizada de manera independiente, sin credenciales, inventario de accesos, pedidos ni movimientos. La copia pertenece a su creador. ADMIN puede copiar cualquier producto; VENDEDOR solo los propios. Cerrar el editor no deshace la creación ya guardada.

Los cargadores de cursos/personalizados conservan IDs existentes, precios, stock y cambios administrativos; pueden actualizar nombres antiguos de cursos de muestra que aún no se hayan personalizado. Personalizados aporta 20 fichas y Cursos seis. Los ejemplos comienzan con stock cero. No entregan lecciones, generan cuentas ni fabrican productos.

Tienda/Segunda comienzan habilitadas si no hay configuración. Para visitantes/CLIENTE los interruptores ocultan navegación y carruseles afectados, excluyen productos y bloquean checkout de esos artículos. ADMIN/VENDEDOR conservan acceso. Las compras anteriores permanecen visibles.

## 11. Imágenes, marca y mantenimiento de interfaz
La marca visible es Goats., con tonos morados/ciruela, buscador redondeado e icono de pestaña con la cabrita. Las rutas técnicas, claves de almacenamiento y nombre del repositorio conservan compatibilidad. ADMIN puede sustituir seis fondos, imágenes de productos/categorías y series/plataformas editoriales.

Se admiten JPEG, PNG, WebP y AVIF de hasta 2 MB por archivo seleccionado. El servidor comprueba bytes reales, tipo declarado y firma; rechaza SVG/HTML subidos. El optimizador limita la entrada decodificada a 40 millones de píxeles. Las ilustraciones SVG integradas siguen siendo recursos estáticos versionados.

| Recurso | Almacenamiento / control |
|---|---|
| Seis fondos | BannerImage; controles de carga/restauración del banner |
| Sustituciones de producto/categoría/serie/plataforma | CatalogImageAsset; controles ADMIN correspondientes |
| Imágenes predeterminadas e icono | public/images y app/icon.svg; despliegue del repositorio |

Las imágenes de base de datos sobreviven a despliegues si se conserva la base y sus registros. Una ruta local no es una URL pública: carga el archivo o versiona el recurso adecuado. Los GET de imágenes son públicos y usan ETag/revalidación privada. Las credenciales privadas de streaming nunca forman parte de esos metadatos.

### Compresión automática
Las cargas nuevas se optimizan en servidor con Sharp. El navegador puede reducir primero entradas grandes. El servidor corrige orientación, conserva transparencia, elimina metadatos originales y compara AVIF calidad 45 con WebP calidad 65 para elegir la codificación menor. Sustituye el archivo solo si el candidato pesa más de un 5% menos; conserva originales pequeños. Se mantienen imágenes animadas admitidas y versiones marcadas como optimizadas para evitar romper animaciones o degradar repetidamente.

| Uso | Lado mayor máximo del candidato redimensionado |
|---|---|
| Producto | 900 px |
| Categoría o serie | 700 px |
| Logo de plataforma | 128 px |
| Banner de Inicio | 1600 px |

La compresión tiene pérdida y el ahorro depende del original. No se garantiza un porcentaje fijo ni un mínimo matemático de bytes. Conserva originales fuera de la aplicación si necesitas editarlos/restaurarlos después. Para banner se recomienda una composición aproximada de 1600 × 700; revisa legibilidad de textos/logos en móvil y escritorio.

### Optimizar imágenes ya subidas
1. Entra como ADMIN a /administracion y busca Optimizar imágenes.
2. Pulsa Comprimir imágenes existentes y mantén la pestaña abierta.
3. Se procesa un archivo guardado por solicitud y se muestran progreso, cantidad modificada y ahorro de bytes. Se conservan versiones menores/ya optimizadas.
4. Revisa fallos y reintenta si hace falta. Las cargas/eliminaciones concurrentes se protegen comprobando updatedAt y no se sobrescriben.


## 12. Arquitectura y organización del repositorio
Goats Store utiliza Next.js App Router con React y TypeScript. Los manejadores del servidor controlan identidad, permisos, validación y operaciones financieras. Prisma accede a PostgreSQL. El estado del navegador mejora la experiencia, pero nunca autoriza saldos, precios o asignaciones de acceso.

| Capa | Responsabilidad e implementación |
|---|---|
| Navegador | Pantallas React, almacenamiento de carrito, filtros, animaciones y controles de ADMIN |
| Servidor Next.js | Páginas, endpoints, sesiones, permisos y validación |
| Servicios de negocio | Inventario, comprobantes, historial, orden del catálogo y migración |
| PostgreSQL | Usuarios, productos, stock, pedidos, movimientos, inventario privado e imágenes |
| Correo opcional | Resend para recuperar contraseñas, no para registrarse |
| Contacto externo | Enlaces de WhatsApp; no envíos automáticos de mensajes de soporte |

Las dependencias principales son Next.js 15, React 19, Prisma 6, Zod 4, bcryptjs, jose, lucide-react y Sharp; package-lock.json fija las versiones instaladas. package.json declara rangos compatibles. Usa una versión de Node.js con soporte y compatible con las dependencias; Sharp requiere Node.js 20.9 o superior. Utiliza una versión LTS con soporte que cumpla todos los requisitos de dependencias.

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

StreamingAccess.productIds es un array PostgreSQL de strings con índice GIN. Las consultas cuentan una fila canónica una vez por plan vinculado. Es una lista de vínculos lógicos, no una relación Prisma con clave foránea por cada ID adicional; las operaciones administrativas validan productos y sincronizan stock.

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

El proyecto utiliza goats.win como dominio público y Vercel + Neon en su flujo de despliegue. Comprueba proveedores, secretos, DNS y despliegue activo en sus paneles: esta revisión de código no es una auditoría de infraestructura en vivo.

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

Los ejemplos opcionales se cargan con npm run db:seed:technology, npm run db:seed:secondhand, npm run db:seed:courses y npm run db:seed:personalized. Los últimos dos también tienen controles ADMIN. No interpretes cantidades o descripciones de ejemplo como inventario comercial verificado.

Para probar producción localmente, ejecuta npm run build y después npm run start. El desarrollo compila páginas bajo demanda y no representa el rendimiento de producción. Nunca publiques .env, sus conexiones o las credenciales administrativas.

## 17. Despliegue Vercel y operación de dominios
La rama mantenida es password-reset. Confirma el commit real en Vercel: volver a desplegar una ejecución antigua no descarga código nuevo. El dominio público del proyecto es https://goats.win; comprueba DNS, certificado, entorno y rama actuales en los proveedores, sin asumir que el manual verifica su estado en vivo.

1. Importa cabr444/Goat_Store y selecciona rama correcta, preset Next.js, raíz ./ y npm run build.
2. Configura variables privadas para Production/Preview. DATABASE_URL debe seleccionar la base PostgreSQL prevista y APP_URL el origen HTTPS canónico.
3. Respalda datos pertinentes y aplica cambios de esquema revisados antes de exponer código que los necesite. Los perfiles compartidos requieren StreamingAccess.productIds y su índice GIN.
4. Ejecuta controles, sube la versión, espera Ready y verifica el commit del despliegue.
5. Prueba navegación/carrito anónimos, acceso, administración, una compra controlada, stock compartido y privacidad de comprobantes.

Los comandos de esquema pueden ejecutarse en la terminal de VS Code del PC del propietario. Actualizan la base seleccionada por DATABASE_URL; ejecutarlos localmente no implica que la base sea local. Con la conexión de Neon prevista configurada privadamente en .env, utiliza:

```sh
git switch password-reset
git pull origin password-reset
npm install
npm run db:push
```

Esto sincroniza estructura, no registros. npm run build genera Prisma Client pero no aplica el esquema. Cambiar .env local no modifica variables de Vercel. Un cambio solo de esquema normalmente requiere recargar; cambiar variables de Vercel exige nuevo despliegue. Conserva los secretos de cifrado originales.

### Dominio y descubrimiento
Añade goats.win y el alias www deseado en Domains del proyecto. En Cloudflare utiliza el registro/destino exacto indicado por Vercel y DNS only cuando se solicite; no copies una IP antigua de un ejemplo. Espera configuración válida y certificado HTTPS. Conectar dominio no exige recompilar por sí mismo; cambiar APP_URL sí exige desplegar la nueva configuración. SSL web y autorización del remitente de correo son independientes.

Vercel aloja la aplicación, PostgreSQL los datos y Cloudflare registra/administra dominio y DNS. La web pública no depende del PC encendido. Revisa protección de acceso para visitantes, renovaciones, consumo y condiciones comerciales del alojamiento. Este manual no establece garantías de capacidad ni de un año de alojamiento gratuito.

Un catálogo público permite descubrimiento, pero comprar dominio no garantiza indexación ni posición en Google para «goats». Verificar Search Console, implementar sitemap/robots, redactar descripciones útiles y facilitar descubrimiento externo requieren trabajo/configuración propios. Esta referencia no tiene rutas implementadas de sitemap/robots; no deben comunicarse como ya enviadas.

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
Utiliza npm test, npx tsc --noEmit y npm run build para pruebas unitarias, tipos y compilación. Durante la implementación también se probaron PostgreSQL aislado y navegador para perfiles compartidos, cuentas completas, IDs numéricos, combos, checkout de visitantes, optimización de imágenes y administración. Esta revisión documental no certifica el estado de producción ni repite una auditoría de carga/seguridad.

Las pruebas de integración deben usar bases locales desechables y un servidor local coincidente. Los suites compartido/streaming/combos utilizan goat_inventory_test, DATABASE_URL, AUTH_SECRET y la URL de pruebas correspondiente. Migración usa origen/destino desechables separados. No apuntes estos fixtures a registros de clientes de Neon.

| Síntoma | Revisión / acción |
|---|---|
| NEXT_NO_VERSION | Comprobar rama, commit, raíz ./ y Next.js en package.json |
| JSON vacío / Unexpected end of JSON input | Revisar estado HTTP y registros sin secretos; puede fallar el catálogo después del acceso y no las credenciales |
| Falta actualizar el esquema de la base de datos | Descargar código y ejecutar db:push contra la misma base Neon usada por Vercel; verificar productIds |
| Catálogo temporalmente no disponible | Revisar conexión/esquema/despliegue; visitantes reciben error genérico y ADMIN una indicación útil si falta esquema |
| Solicitud no autorizada | Verificar origen, APP_URL, alias del despliegue y revisión actual |
| Correo o ID numérico inválido | Un correo válido o solo dígitos; clave en campo separado; no pegar varias cuentas en un campo |
| Perfiles repetidos / PIN inválido | Usar nombres/números distintos; PIN opcional de máximo 40 caracteres; revisar error rojo enfocado junto a Guardar |
| Rechazo de cuenta completa | Comprobar versión, producto cuenta completa/full, un acceso y planes completos de la misma plataforma |
| Cuenta vendida/retirada o modos mezclados | Revisar inventario; cambiar credenciales/etiqueta no recicla identidades ni divide una cuenta completa en perfiles |
| Streaming / combo agotado | Reponer accesos elegibles sin vender; deben existir todas las plataformas del combo, incluido Netflix x28 |
| Correo o contraseña incorrectos | Verificar usuario en la base activa; recuperar en vez de editar passwordHash |
| Remitente de recuperación no autorizado | Revisar dominio verificado Resend y EMAIL_FROM; el registro no envía confirmación |
| Conflicto de stock/estado/orden | Recargar versión y revisar pedido/movimientos confirmados antes de repetir |
| Imagen rechazada | Comprobar firma/tipo, 2 MB, dimensiones decodificadas y permisos ADMIN |
| Función nueva ausente | Verificar commit/Ready y recargar; un commit local no está publicado hasta subir/desplegar correctamente |

Límites: registro abierto de vendedores; sin MFA propio, pagos/reembolsos automáticos, liquidación a vendedores, envíos, alojamiento de cursos, configurador de arte ni reciclaje de perfiles. Navegación pública y estado manual de entrega sí están implementados. Indexación, capacidad y retención requieren verificación independiente.

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
| StreamingAccess | id, productId, productIds[] (GIN), fingerprint (único), platform, cipher, createdAt, version, soldAt?, retiredAt?, orderItemId? | Unidad de perfil o cuenta completa de una venta con planes vinculados opcionales |

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
| GET /api/storefront | Público | Productos/opciones/orden permitidos; visitante user null sin datos privados; usuarios solo ADMIN |
| GET /api/products | Público | Campos públicos de productos permitidos y configuración |
| POST /api/products | ADMIN / VENDEDOR | Crear producto validado con propiedad del usuario actual |
| PATCH /api/products/[id] | ADMIN / VENDEDOR propietario | Datos y expectedStock; actualización protegida |
| POST /api/products/[id]/duplicate | ADMIN / VENDEDOR propietario | Crear copia independiente de catálogo/imagen, sin stock ni datos privados de entrega |
| DELETE /api/products/[id] | ADMIN / VENDEDOR propietario | Agotar; desvincular planes compartidos y retirar accesos sin planes restantes |
| GET /api/orders | Autenticado | Últimos 50 pedidos propios y líneas seguras |
| POST /api/orders | Autenticado | items[{id,qty}], checkoutKey opcional; compra/recuperación transaccional |
| GET /api/admin/users | ADMIN | Listado de identidad, rol y saldo |
| POST /api/admin/recharge | ADMIN | userId, amount, note; crédito administrativo registrado |
| GET, PUT /api/admin/store-options | ADMIN | Consultar opciones; actualizar department y enabled |
| PUT /api/admin/card-order | ADMIN | kind, id, target, position, version |
| GET, PUT /api/admin/products/[id]/delivery | ADMIN | Entrega digital antigua; PUT rechazado para Streaming |
| GET /api/admin/products/[id]/inventory | ADMIN | Filas disponibles, cantidades, plataforma e indicador antiguo |
| POST, PATCH, DELETE /api/admin/products/[id]/inventory | ADMIN | Añadir/editar/retirar perfiles o cuentas completas; identidad inmutable y comprobación de versión |
| GET /api/banners | Público | Metadatos del banner |
| GET /api/banners/[slot] | Público | Bytes de imagen y revalidación privada ETag |
| POST, DELETE /api/banners/[slot] | ADMIN | Cargar o eliminar sustitución del banner |
| GET /api/catalog-images | Público | Metadatos de imágenes del catálogo |
| GET /api/catalog-images/file | Público | Bytes de imagen por clave lógica |
| POST, DELETE /api/admin/images | ADMIN | Cargar/eliminar imagen de categoría, producto, serie o plataforma |
| POST /api/admin/streaming-accounts | ADMIN | productIds, account{brand,email,password}, profiles[{profile,pin}]; perfiles compartidos o una cuenta completa |
| POST /api/admin/courses/seed | ADMIN | Añadir cursos faltantes y actualizaciones compatibles de ejemplos sin personalizar |
| POST /api/admin/personalized/seed | ADMIN | Añadir vasos/camisetas personalizados faltantes sin sobrescribir registros |
| GET /api/admin/images/optimize | ADMIN | Listar identificadores de imágenes de catálogo/banner guardadas |
| POST /api/admin/images/optimize | ADMIN | type: catalog/banner, id; optimizar un archivo protegiendo cambios concurrentes |
| GET /api/admin/sales/export | ADMIN | CSV filtrado, máximo 1.000 pedidos, sin credenciales de plataformas |
| PATCH /api/admin/orders/[id]/status | ADMIN | expectedStatus y status; solo estado manual de entrega |

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
| npm run db:seed:courses | Cargar seis fichas editables de cursos |
| npm run db:seed:personalized | Cargar 20 productos personalizados editables |
| npm run test:courses | Pruebas aisladas de catálogo/compra de cursos |
| npm run test:combos | Elegibilidad, asignación, concurrencia y rollback de combos |
| npm run test:guests | Navegación pública, retorno de carrito/acceso y visibilidad |
| npm run test:admin | Ventas/clientes, privacidad CSV y conflictos de estado |
| npm run test:shared-streaming | Perfiles compartidos, IDs numéricos, cuentas completas y concurrencia |
| python scripts/build-documentation.py --output-dir docs/exports | Regenerar ambos Word editables y su ZIP de fuentes |

Lista de publicación: comprobar rama/commit; proteger datos y secretos; aplicar solo cambios de esquema revisados; configurar entorno y correo si corresponde; ejecutar controles; esperar Ready; verificar dominio público; probar recorrido de cliente; confirmar secciones ocultas; revisar privacidad de comprobantes y monitorizar registros sin secretos.

### Glosario y registro de revisiones
Glosario: COP significa peso colombiano; saldo es el crédito interno prepagado; pedido es una compra; perfil puede ser el panel de cuenta o un perfil de plataforma según contexto; agotado indica cero disponibilidad; checkout key identifica una intención de compra recuperable; ciphertext es contenido cifrado; la conexión selecciona una base y una clave API autoriza un servicio.

Registro de revisión: 1.0 — 17 de octubre de 2026 — Primera edición española basada en 42fd1ce; incluye registro directo, inventario individual, migración y corrección de visibilidad en cuenta. Actualiza esta entrada y la edición inglesa al cambiar el comportamiento.


1.1 — 18 de octubre de 2026 — Actualización a 56f7f83: duplicación de productos, imagen independiente, stock cero, protección de datos privados, permisos de propiedad y guía dentro del editor móvil.

2.0 — 26 de octubre de 2026 — Código 22cd272: marca/dominio Goats, compras públicas, cursos/personalizados, ventas/clientes ADMIN, compra directa, perfiles compartidos, cuentas completas, IDs numéricos, combos, AVIF/compresión y diagnóstico de esquema/validación.

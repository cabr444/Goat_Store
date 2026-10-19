export const courseCategories = ["Cursos"] as const;
export const courseProducts = [
  { id: "goat-course-web", name: "Aprende a activar office 365 x siempre", price: 59900, mark: "OFFICE", description: "Curso sobre activación y administración de Office 365. Consulta con soporte las licencias requeridas, el temario y las condiciones de acceso." },
  { id: "goat-course-design", name: "Aprende a Sacar cuentas Prime Video", price: 39900, mark: "PRIME", description: "Curso sobre creación y configuración de cuentas Prime Video. Consulta con soporte el temario, las suscripciones requeridas y la modalidad de entrega." },
  { id: "goat-course-marketing", name: "Aprende a Sacar cuentas youtube", price: 49900, mark: "YOUTUBE", description: "Curso sobre creación y configuración de cuentas de YouTube. Consulta con soporte el temario y la modalidad de acceso." },
  { id: "goat-course-finance", name: "Aprende a generar tarjetas temporales", price: 34900, mark: "TARJETAS", description: "Curso sobre tarjetas virtuales temporales de proveedores autorizados. Consulta con soporte los requisitos del proveedor y el temario." },
  { id: "goat-course-english", name: "Aprende a generar ingresos extra", price: 69900, mark: "INGRESOS", description: "Curso sobre ideas y herramientas para desarrollar fuentes de ingresos adicionales. Consulta el temario con soporte; los resultados dependen de cada persona." },
].map(product => ({ ...product, category: "Cursos" as const, stock: 0, active: true, gradient: "linear-gradient(135deg,#241453,#6d42db,#45b6d4)" }));

// Only migrate untouched sample titles; preserve administrator customizations.
export const previousCourseNames: Record<string, string> = {"goat-course-web": "Desarrollo web desde cero", "goat-course-design": "Diseño digital con Canva", "goat-course-marketing": "Marketing digital para emprendedores", "goat-course-finance": "Finanzas personales inteligentes", "goat-course-english": "Inglés básico A1"};

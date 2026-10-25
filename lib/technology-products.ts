import { courseCategories } from "./course-products";
import { secondhandCategories } from "./secondhand-products";
export const technologyCategories = [
  "Computadores",
  "Periféricos",
  "Audio",
  "Accesorios",
  "Redes",
] as const;
export const digitalCategories = [
  "Streaming",
  "Música",
  "Productividad",
  "Combos",
] as const;
export const allCategories = [
  ...digitalCategories,
  ...courseCategories,
  ...technologyCategories,
  ...secondhandCategories,
] as const;
const groups: {
  category: (typeof technologyCategories)[number];
  rows: [string, number, string][];
}[] = [
  {
    category: "Computadores",
    rows: [
      [
        "Portátil Essential 14",
        1499000,
        "Pantalla de 14 pulgadas, 8 GB RAM y SSD de 256 GB.",
      ],
      [
        "Portátil Everyday 15",
        1899000,
        "Pantalla de 15,6 pulgadas, 16 GB RAM y SSD de 512 GB.",
      ],
      [
        "Portátil Pro 14",
        2699000,
        "Pantalla de 14 pulgadas, 16 GB RAM y SSD de 1 TB.",
      ],
      [
        "Portátil Creator 16",
        3899000,
        "Pantalla de 16 pulgadas y 32 GB RAM para creación de contenido.",
      ],
      [
        "Portátil Gaming 15",
        4299000,
        "Pantalla de 144 Hz, 16 GB RAM y gráficos dedicados.",
      ],
      [
        "Mini PC Compact",
        1199000,
        "Equipo compacto con 8 GB RAM y SSD de 256 GB.",
      ],
      [
        "Mini PC Pro",
        2199000,
        "Equipo compacto con 16 GB RAM y SSD de 512 GB.",
      ],
      [
        "PC de escritorio Office",
        1699000,
        "Torre de escritorio con 16 GB RAM y SSD de 512 GB.",
      ],
      [
        "PC de escritorio Gaming",
        4599000,
        "Torre con 32 GB RAM, SSD de 1 TB y gráficos dedicados.",
      ],
      [
        "Todo en uno 24",
        2899000,
        "Equipo todo en uno con pantalla de 24 pulgadas y SSD de 512 GB.",
      ],
    ],
  },
  {
    category: "Periféricos",
    rows: [
      [
        "Monitor Full HD 24",
        499000,
        "Panel de 24 pulgadas, resolución Full HD y conexión HDMI.",
      ],
      ["Monitor QHD 27", 999000, "Panel de 27 pulgadas con resolución QHD."],
      [
        "Monitor Gaming 165 Hz",
        1199000,
        "Pantalla de 27 pulgadas con frecuencia de 165 Hz.",
      ],
      [
        "Teclado mecánico compacto",
        189000,
        "Formato compacto con interruptores mecánicos.",
      ],
      [
        "Teclado inalámbrico",
        99000,
        "Diseño de perfil bajo con conexión inalámbrica.",
      ],
      ["Mouse ergonómico", 119000, "Diseño vertical para el trabajo diario."],
      ["Mouse Gaming RGB", 149000, "Sensor ajustable e iluminación RGB."],
      ["Webcam Full HD", 169000, "Vídeo 1080p para reuniones y videollamadas."],
      ["Tableta gráfica", 259000, "Área de dibujo digital con lápiz incluido."],
      ["Mousepad XL", 59000, "Superficie amplia con base antideslizante."],
    ],
  },
  {
    category: "Audio",
    rows: [
      [
        "Audífonos inalámbricos ANC",
        299000,
        "Audífonos de diadema con cancelación activa de ruido.",
      ],
      [
        "Audífonos de estudio",
        219000,
        "Diseño cerrado con conexión por cable.",
      ],
      [
        "Audífonos Gaming",
        189000,
        "Diadema con micrófono integrado para juegos.",
      ],
      [
        "Earbuds Bluetooth",
        149000,
        "Audífonos compactos con estuche de carga.",
      ],
      [
        "Earbuds deportivos",
        179000,
        "Diseño de ajuste seguro para entrenamiento.",
      ],
      [
        "Parlante Bluetooth mini",
        89000,
        "Parlante portátil compacto para uso diario.",
      ],
      [
        "Parlante Bluetooth Pro",
        249000,
        "Sonido estéreo y batería recargable.",
      ],
      ["Barra de sonido", 399000, "Audio para escritorio o televisor."],
      [
        "Micrófono USB",
        199000,
        "Micrófono de escritorio para llamadas y grabación.",
      ],
      [
        "Interfaz de audio USB",
        349000,
        "Interfaz de dos entradas para grabación doméstica.",
      ],
    ],
  },
  {
    category: "Accesorios",
    rows: [
      [
        "SSD externo 500 GB",
        249000,
        "Almacenamiento portátil de 500 GB con conexión USB.",
      ],
      ["SSD externo 1 TB", 399000, "Almacenamiento portátil de 1 TB."],
      ["Memoria USB 64 GB", 39000, "Memoria portátil USB de 64 GB."],
      ["Tarjeta microSD 128 GB", 69000, "Tarjeta de almacenamiento de 128 GB."],
      [
        "Hub USB-C 7 en 1",
        159000,
        "Adaptador multipuerto para escritorio y portátil.",
      ],
      [
        "Cargador USB-C 65 W",
        129000,
        "Cargador compacto compatible con USB-C Power Delivery.",
      ],
      ["Power bank 20000 mAh", 139000, "Batería portátil con salida USB."],
      [
        "Soporte para portátil",
        79000,
        "Soporte ajustable para elevar la pantalla.",
      ],
      [
        "Cable HDMI 2 metros",
        35000,
        "Cable HDMI de dos metros para vídeo y audio.",
      ],
      [
        "Cable USB-C 2 metros",
        45000,
        "Cable USB-C de dos metros para carga y datos.",
      ],
    ],
  },
  {
    category: "Redes",
    rows: [
      [
        "Router Wi-Fi 6",
        299000,
        "Router de doble banda para la red del hogar.",
      ],
      [
        "Router Wi-Fi compacto",
        119000,
        "Router compacto para conexiones domésticas.",
      ],
      [
        "Sistema Mesh 2 nodos",
        499000,
        "Dos unidades para ampliar la cobertura inalámbrica.",
      ],
      [
        "Sistema Mesh 3 nodos",
        699000,
        "Tres unidades para espacios más amplios.",
      ],
      [
        "Repetidor Wi-Fi",
        99000,
        "Extensor de cobertura para una red existente.",
      ],
      [
        "Adaptador Wi-Fi USB",
        59000,
        "Conexión inalámbrica para equipos de escritorio.",
      ],
      [
        "Adaptador USB-C Ethernet",
        89000,
        "Adaptador de red cableada para puerto USB-C.",
      ],
      [
        "Switch Gigabit 5 puertos",
        119000,
        "Cinco puertos Ethernet Gigabit para la red local.",
      ],
      [
        "Switch Gigabit 8 puertos",
        179000,
        "Ocho puertos Ethernet Gigabit para la red local.",
      ],
      ["Cable Ethernet Cat 6", 29000, "Cable de red Cat 6 de cinco metros."],
    ],
  },
];
export const technologyProducts = groups.flatMap((group, index) =>
  group.rows.map(([name, price, description]) => ({
    name,
    price,
    category: group.category,
    description,
    mark: "GOATS TECH",
    gradient: [
      "linear-gradient(135deg,#e7ddff,#c3a5ff)",
      "linear-gradient(135deg,#dcf4ff,#9dc9fb)",
      "linear-gradient(135deg,#ffe2ed,#e7a6df)",
      "linear-gradient(135deg,#e1faee,#9edcce)",
      "linear-gradient(135deg,#ffeddc,#f9cb93)",
    ][index],
  })),
);

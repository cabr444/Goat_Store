export const secondhandCategories = [
  "Tecnología usada",
  "Ropa usada",
  "Calzado usado",
] as const;
const groups: {
  category: (typeof secondhandCategories)[number];
  rows: [string, number, string][];
}[] = [
  {
    category: "Tecnología usada",
    rows: [
      [
        "Portátil 14 usado",
        750000,
        "8 GB RAM, SSD de 256 GB. Marcas leves en la carcasa.",
      ],
      [
        "Portátil 15 usado",
        990000,
        "16 GB RAM, SSD de 512 GB. Desgaste en el teclado.",
      ],
      [
        "Mini PC usado",
        650000,
        "8 GB RAM, SSD de 256 GB. Incluye adaptador de corriente.",
      ],
      [
        "Monitor 24 usado",
        250000,
        "Pantalla Full HD. Rayones leves en la base.",
      ],
      [
        "Monitor 27 usado",
        450000,
        "Pantalla QHD. Incluye cable de alimentación.",
      ],
      [
        "Teclado mecánico usado",
        95000,
        "Formato compacto. Marcas de uso en las teclas.",
      ],
      [
        "Teclado inalámbrico usado",
        45000,
        "Conexión inalámbrica. Incluye receptor USB.",
      ],
      [
        "Mouse Gaming usado",
        70000,
        "Sensor ajustable. Desgaste leve en la superficie.",
      ],
      [
        "Mouse ergonómico usado",
        65000,
        "Diseño vertical. Incluye receptor USB.",
      ],
      [
        "Webcam Full HD usada",
        85000,
        "Vídeo 1080p. Incluye soporte para monitor.",
      ],
      [
        "Audífonos de diadema usados",
        120000,
        "Conexión Bluetooth. Desgaste leve en las almohadillas.",
      ],
      [
        "Audífonos de estudio usados",
        95000,
        "Conexión por cable. Almohadillas con marcas de uso.",
      ],
      [
        "Parlante Bluetooth usado",
        90000,
        "Batería recargable. Marcas leves en el exterior.",
      ],
      [
        "Micrófono USB usado",
        110000,
        "Micrófono de escritorio. Incluye cable USB.",
      ],
      [
        "Tableta gráfica usada",
        130000,
        "Incluye lápiz. Marcas leves en la superficie.",
      ],
      [
        "SSD externo 500 GB usado",
        140000,
        "Almacenamiento portátil. Incluye cable USB.",
      ],
      [
        "Hub USB-C usado",
        75000,
        "Adaptador multipuerto. Marcas leves en la carcasa.",
      ],
      [
        "Router Wi-Fi 6 usado",
        150000,
        "Doble banda. Incluye adaptador de corriente.",
      ],
      [
        "Switch 5 puertos usado",
        55000,
        "Puertos Gigabit. Marcas leves en el exterior.",
      ],
      [
        "Soporte para portátil usado",
        35000,
        "Soporte ajustable. Rayones superficiales.",
      ],
    ],
  },
  {
    category: "Ropa usada",
    rows: [
      [
        "Camiseta básica usada · M",
        18000,
        "Talla M, algodón. Color negro con desgaste leve.",
      ],
      [
        "Camiseta estampada usada · L",
        22000,
        "Talla L. Estampado con desgaste leve.",
      ],
      [
        "Camiseta oversized usada · XL",
        28000,
        "Talla XL, corte amplio. Color gris.",
      ],
      ["Camisa de lino usada · M", 45000, "Talla M. Color beige, manga larga."],
      [
        "Camisa a cuadros usada · L",
        38000,
        "Talla L. Manga larga, tonos azules.",
      ],
      ["Polo usado · M", 30000, "Talla M. Color azul oscuro."],
      [
        "Buzo con capucha usado · L",
        55000,
        "Talla L. Color negro, desgaste leve en los puños.",
      ],
      [
        "Buzo crewneck usado · M",
        42000,
        "Talla M. Color gris, cuello redondo.",
      ],
      [
        "Chaqueta denim usada · M",
        65000,
        "Talla M. Denim azul con desgaste visible.",
      ],
      [
        "Chaqueta impermeable usada · L",
        75000,
        "Talla L. Color verde, cierre frontal.",
      ],
      ["Jeans rectos usados · 32", 48000, "Talla 32. Denim azul, corte recto."],
      [
        "Jeans slim usados · 30",
        45000,
        "Talla 30. Denim negro, desgaste leve.",
      ],
      [
        "Pantalón cargo usado · 34",
        55000,
        "Talla 34. Color oliva con bolsillos laterales.",
      ],
      ["Jogger usado · M", 35000, "Talla M. Color gris, cintura elástica."],
      [
        "Short deportivo usado · L",
        25000,
        "Talla L. Color negro, corte deportivo.",
      ],
    ],
  },
  {
    category: "Calzado usado",
    rows: [
      [
        "Tenis blancos usados · 38",
        65000,
        "Talla EU 38. Marcas visibles en suela y exterior.",
      ],
      [
        "Tenis urbanos usados · 39",
        75000,
        "Talla EU 39. Color negro, desgaste leve.",
      ],
      [
        "Tenis clásicos usados · 40",
        80000,
        "Talla EU 40. Color blanco y azul.",
      ],
      [
        "Tenis de lona usados · 41",
        50000,
        "Talla EU 41. Lona negra, marcas de uso.",
      ],
      [
        "Tenis deportivos usados · 42",
        95000,
        "Talla EU 42. Color gris, desgaste en la suela.",
      ],
      [
        "Tenis running usados · 43",
        110000,
        "Talla EU 43. Color azul, marcas de uso.",
      ],
      [
        "Tenis de básquet usados · 42",
        120000,
        "Talla EU 42. Caña alta, desgaste en la suela.",
      ],
      [
        "Botines casuales usados · 40",
        105000,
        "Talla EU 40. Color café, marcas en el exterior.",
      ],
      [
        "Botas urbanas usadas · 41",
        130000,
        "Talla EU 41. Color negro, desgaste leve.",
      ],
      [
        "Botas de senderismo usadas · 42",
        140000,
        "Talla EU 42. Desgaste visible en la suela.",
      ],
      [
        "Mocasines usados · 39",
        70000,
        "Talla EU 39. Color café, marcas superficiales.",
      ],
      [
        "Zapatos formales usados · 40",
        85000,
        "Talla EU 40. Color negro, marcas de uso.",
      ],
      [
        "Sandalias usadas · 38",
        35000,
        "Talla EU 38. Color beige, correas ajustables.",
      ],
      [
        "Sandalias deportivas usadas · 41",
        45000,
        "Talla EU 41. Color negro, desgaste en la suela.",
      ],
      [
        "Tenis retro usados · 37",
        65000,
        "Talla EU 37. Color blanco y verde, marcas de uso.",
      ],
    ],
  },
];
export const secondhandProducts = groups.flatMap((group, index) =>
  group.rows.map(([name, price, detail]) => ({
    name,
    price,
    category: group.category,
    description: `Segunda mano · Buen estado. ${detail}`,
    mark: "SEGUNDA",
    gradient: [
      "linear-gradient(135deg,#d9ecff,#b6c3ff)",
      "linear-gradient(135deg,#f1e0ff,#e4b5ef)",
      "linear-gradient(135deg,#e0f5df,#a7dacf)",
    ][index],
  })),
);

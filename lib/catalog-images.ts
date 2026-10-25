type ImageProduct = { name: string; category: string };
const asset = (name: string) => "/images/catalog/" + name;
const normalized = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export function categoryImage(category: string): string {
  const images: Record<string, string> = {
    Streaming: "streaming.svg",
    Cursos: "course-study.svg",
    Música: "music.svg",
    Productividad: "office.svg",
    Combos: "combos.svg",
    Computadores: "laptop.jpg",
    Periféricos: "keyboard.jpg",
    Audio: "headphones.jpg",
    Accesorios: "hub.svg",
    Redes: "router.jpg",
    Vasos: "generic.svg",
    Camisetas: "tshirt.jpg",
    "Tecnología usada": "desktop.jpg",
    "Ropa usada": "clothes.jpg",
    "Calzado usado": "sneakers.jpg",
  };
  return asset(images[category] || "generic.svg");
}
export function productImage(product: ImageProduct): string {
  const name = normalized(product.name),
    category = product.category;
  if (category === "Cursos") {
    const topics: [RegExp, string][] = [[/office/, "office"], [/prime/, "prime"], [/youtube/, "youtube"], [/tarjetas/, "finance"], [/ingresos/, "marketing"], [/desarrollo web/, "web"], [/canva|diseno/, "design"], [/marketing/, "marketing"], [/finanzas/, "finance"], [/ingles/, "english"]];
    const topic = topics.find(([pattern]) => pattern.test(name))?.[1] || "study";
    return asset((["office", "prime", "youtube"].includes(topic) ? topic : "course-" + topic) + ".svg");
  }
  if (category === "Combos") return asset("combos.svg");
  const brands: [RegExp, string][] = [
    [/netflix/, "netflix.svg"],
    [/prime/, "prime.svg"],
    [/disney/, "disney.svg"],
    [/hbo|max/, "max.svg"],
    [/youtube/, "youtube.svg"],
    [/paramount/, "paramount.svg"],
    [/apple tv/, "apple-tv.svg"],
    [/crunchyroll/, "crunchyroll.svg"],
    [/vix/, "vix.svg"],
    [/plex/, "plex.svg"],
    [/deezer/, "deezer.svg"],
    [/tidal/, "tidal.svg"],
    [/spotify/, "spotify.svg"],
    [/office|microsoft/, "office.svg"],
  ];
  if (["Streaming", "Música", "Productividad"].includes(category)) {
    return asset(
      brands.find(([pattern]) => pattern.test(name))?.[1] || "streaming.svg",
    );
  }
  const kinds: [RegExp, string][] = [
    [/sandalia/, "sandals.svg"],
    [/mocasin|formal/, "dress-shoes.svg"],
    [/bota|botin/, "boots.jpg"],
    [/tenis|calzado/, "sneakers.jpg"],
    [/camiseta|polo/, "tshirt.jpg"],
    [/camisa/, "shirt.svg"],
    [/chaqueta/, "jacket.jpg"],
    [/buzo/, "hoodie.jpg"],
    [/jeans|cargo|jogger/, "jeans.jpg"],
    [/short/, "shorts.svg"],
    [/soporte/, "stand.svg"],
    [/portatil/, "laptop.jpg"],
    [/mini pc|escritorio/, "desktop.jpg"],
    [/monitor|todo en uno/, "monitor.jpg"],
    [/teclado/, "keyboard.jpg"],
    [/mousepad/, "mousepad.svg"],
    [/mouse/, "mouse.jpg"],
    [/webcam/, "webcam.svg"],
    [/tableta/, "tablet.svg"],
    [/earbud/, "earbuds.svg"],
    [/audifono/, "headphones.jpg"],
    [/parlante|barra de sonido/, "speaker.jpg"],
    [/microfono|interfaz de audio/, "microphone.jpg"],
    [/ssd/, "ssd.svg"],
    [/memoria usb/, "usb.svg"],
    [/microsd/, "card.svg"],
    [/hub|adaptador/, "hub.svg"],
    [/cargador/, "charger.svg"],
    [/power bank/, "powerbank.svg"],
    [/soporte/, "stand.svg"],
    [/cable/, "cable.svg"],
    [/router|mesh|repetidor|switch/, "router.jpg"],
  ];
  const image = kinds.find(([pattern]) => pattern.test(name));
  return image ? asset(image[1]) : categoryImage(category);
}

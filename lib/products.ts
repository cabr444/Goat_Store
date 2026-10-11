export type Category = "Streaming" | "Música" | "Productividad";
export type Product = {
  id: number;
  name: string;
  category: Category;
  price: number;
  badge?: string;
  description: string;
  gradient: string;
  mark: string;
  accent: string;
};
export const products: Product[] = [
  {id:1,name:"Netflix x28 días",category:"Streaming",price:13000,badge:"Popular",description:"Opción de Netflix con duración anunciada de 28 días. Consulta las condiciones antes de comprar.",gradient:"linear-gradient(135deg,#170707,#420b18 65%,#9a1228)",mark:"N",accent:"#e50914"},
  {id:2,name:"Netflix x33 días",category:"Streaming",price:14000,description:"Opción de Netflix con duración anunciada de 33 días. Consulta las condiciones antes de comprar.",gradient:"linear-gradient(135deg,#18080c,#570b18 65%,#c72035)",mark:"N",accent:"#e50914"},
  {id:3,name:"Amazon Prime Video",category:"Streaming",price:7000,badge:"Favorito",description:"Servicio de entretenimiento Prime Video. Confirma modalidad y vigencia antes de comprar.",gradient:"linear-gradient(135deg,#061e31,#103f63,#087cba)",mark:"prime video",accent:"#18bcf7"},
  {id:4,name:"Disney+",category:"Streaming",price:10000,description:"Entretenimiento de Disney+. Confirma modalidad y vigencia antes de comprar.",gradient:"linear-gradient(135deg,#09124e,#183499,#426dff)",mark:"Disney+",accent:"#88b8ff"},
  {id:5,name:"HBO Max",category:"Streaming",price:7000,description:"Películas y series en HBO Max. Confirma modalidad y vigencia antes de comprar.",gradient:"linear-gradient(135deg,#1b0751,#48209d,#956aff)",mark:"HBO max",accent:"#bb9aff"},
  {id:6,name:"YouTube Premium",category:"Streaming",price:7000,description:"Servicio YouTube Premium. Confirma modalidad y vigencia antes de comprar.",gradient:"linear-gradient(135deg,#25060a,#67191e,#e02d35)",mark:"▶",accent:"#ff404a"},
  {id:7,name:"Apple TV+",category:"Streaming",price:6000,description:"Películas y series de Apple TV+. Confirma modalidad y vigencia antes de comprar.",gradient:"linear-gradient(135deg,#14171c,#3a4759,#757f96)",mark:"tv+",accent:"#fafafa"},
  {id:8,name:"Paramount+",category:"Streaming",price:7000,description:"Películas y series de Paramount+. Confirma modalidad y vigencia antes de comprar.",gradient:"linear-gradient(135deg,#082861,#0b57b6,#38a6ff)",mark:"Paramount+",accent:"#bddfff"},
  {id:9,name:"ViX",category:"Streaming",price:5000,description:"Entretenimiento de ViX. Confirma modalidad y vigencia antes de comprar.",gradient:"linear-gradient(135deg,#25084e,#7330b4,#ec5e4c)",mark:"ViX",accent:"#ffae7d"},
  {id:10,name:"Crunchyroll",category:"Streaming",price:5000,description:"Anime y entretenimiento de Crunchyroll. Confirma modalidad y vigencia antes de comprar.",gradient:"linear-gradient(135deg,#2b1306,#784015,#fe8706)",mark:"crunchyroll",accent:"#ffae35"},
  {id:11,name:"Plex",category:"Streaming",price:6000,description:"Servicio Plex. Confirma las características y condiciones antes de comprar.",gradient:"linear-gradient(135deg,#181818,#34302b,#65501f)",mark:"PLEX",accent:"#e5b72b"},
  {id:12,name:"Deezer Premium",category:"Música",price:7000,description:"Servicio de música Deezer Premium. Confirma modalidad y vigencia antes de comprar.",gradient:"linear-gradient(135deg,#141429,#44318c,#b755dc)",mark:"deezer",accent:"#cf87fc"},
  {id:13,name:"Tidal",category:"Música",price:5000,description:"Servicio de música Tidal. Confirma modalidad y vigencia antes de comprar.",gradient:"linear-gradient(135deg,#0b1018,#253746,#255e6e)",mark:"TIDAL",accent:"#a6f9fb"},
  {id:14,name:"Office 365",category:"Productividad",price:30000,description:"Producto de productividad Office 365. Consulta tipo de licencia, vigencia y condiciones antes de comprar.",gradient:"linear-gradient(135deg,#37100d,#b33712,#f78a39)",mark:"Office",accent:"#ffb48e"},
];
export const categories = ["Todos", "Streaming", "Música", "Productividad"] as const;
export const money = (value: number) => "$" + new Intl.NumberFormat("es-CO", {maximumFractionDigits:0}).format(value);

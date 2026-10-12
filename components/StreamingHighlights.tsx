"use client";
import { useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import ImageUploadButton from "@/components/ImageUploadButton";
import { useCatalogOverrides } from "@/components/CatalogImageProvider";
import { streamingHighlights, seriesImageKey } from "@/lib/streaming-highlights";

export default function StreamingHighlights({ admin = false }: { admin?: boolean }) {
  const images = useCatalogOverrides();
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<string>(streamingHighlights[0].id);
  const rail = useRef<HTMLDivElement>(null);
  const platform = streamingHighlights.find(item => item.id === selected)!;
  function scroll(direction: number) {
    rail.current?.scrollBy({ left: direction * rail.current.clientWidth * .8, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }
  return <section className="container streaming-highlights" aria-labelledby="highlights-title">
    <div className="section-heading">
      <div><span className="overline">TU PRÓXIMA SERIE</span><h2 id="highlights-title">Historias que enganchan <span>✳</span></h2><p>Explora nuestra selección de series por plataforma.</p></div>
      {admin && <button type="button" className="button violet" onClick={() => setEditing(!editing)}>{editing ? "Terminar de editar imágenes" : "Editar imágenes de series"}</button>}
      <span className="highlights-hint">Desliza para descubrir →</span>
    </div>
    <div className="highlights-platforms" role="group" aria-label="Elegir plataforma">
      {streamingHighlights.map(item => <button key={item.id} type="button" aria-pressed={selected === item.id} onClick={() => { setSelected(item.id); rail.current?.scrollTo({left: 0}); }}>
        <img src={images["platform:" + item.id] || "/images/catalog/" + item.image + ".svg"} onError={event => { const fallback = "/images/catalog/" + item.image + ".svg"; if (!event.currentTarget.src.endsWith(fallback)) event.currentTarget.src = fallback; }} alt="" loading="lazy" decoding="async" />{item.name}
      </button>)}
    </div>
    <div className="highlights-shelf" style={{"--platform-accent": platform.color} as CSSProperties}>
      <header><div><span>SELECCIÓN GOAT</span><h3>{platform.name}</h3></div>
        <div className="highlights-arrows"><button type="button" onClick={() => scroll(-1)} aria-label="Ver series anteriores"><ArrowLeft size={19} /></button><button type="button" onClick={() => scroll(1)} aria-label="Ver más series"><ArrowRight size={19} /></button></div>
      </header>
      {admin && editing && <div className="highlights-image-editor"><p>Logo de {platform.name} · JPG, PNG o WebP, máximo 2 MB.</p><ImageUploadButton kind="platform" imageKey={platform.id} /></div>}
      <div ref={rail} className="highlights-rail" tabIndex={0} aria-label={"Series de " + platform.name}>
        {platform.shows.map(([title, genre, symbol], index) => <article className="series-card" key={platform.id + title}>
          <SeriesArt src={images["series:" + seriesImageKey(platform.id, title)]} title={title} genre={genre} symbol={symbol} index={index} />
          <div className="series-card-copy"><span>{genre}</span><h4>{title}</h4></div>
          {admin && editing && <div className="highlights-image-editor"><ImageUploadButton kind="series" imageKey={seriesImageKey(platform.id, title)} /></div>}
        </article>)}
      </div>
      <footer><p>Selección editorial. La disponibilidad puede variar según el país y el plan.</p><Link className="button" href={"/catalogo?categoria=Streaming&plataforma=" + encodeURIComponent(platform.id) + "#catalogo"}>Ver planes de {platform.name}<ArrowRight size={16} /></Link></footer>
    </div>
  </section>;
}

function SeriesArt({src, title, genre, symbol, index}: {src?: string; title: string; genre: string; symbol: string; index: number}) {
  const [failed, setFailed] = useState<string>();
  return <div className={"series-art series-art-" + (index % 3)}>
    {src && failed !== src ? <img className="series-poster" src={src} alt={title} loading="lazy" decoding="async" onError={() => setFailed(src)} /> : <><span className="series-art-symbol" aria-hidden="true">{symbol}</span><span className="series-art-orbit" aria-hidden="true" /><span className="series-art-caption">{genre}</span></>}
  </div>;
}

"use client";
import { useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { streamingHighlights } from "@/lib/streaming-highlights";

export default function StreamingHighlights() {
  const [selected, setSelected] = useState<string>(streamingHighlights[0].id);
  const rail = useRef<HTMLDivElement>(null);
  const platform = streamingHighlights.find(item => item.id === selected)!;
  function scroll(direction: number) {
    rail.current?.scrollBy({ left: direction * rail.current.clientWidth * .8, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }
  return <section className="container streaming-highlights" aria-labelledby="highlights-title">
    <div className="section-heading">
      <div><span className="overline">TU PRÓXIMA SERIE</span><h2 id="highlights-title">Historias que enganchan <span>✳</span></h2><p>Explora nuestra selección de series por plataforma.</p></div>
      <span className="highlights-hint">Desliza para descubrir →</span>
    </div>
    <div className="highlights-platforms" role="group" aria-label="Elegir plataforma">
      {streamingHighlights.map(item => <button key={item.id} type="button" aria-pressed={selected === item.id} onClick={() => { setSelected(item.id); rail.current?.scrollTo({left: 0}); }}>
        <img src={"/images/catalog/" + item.image + ".svg"} alt="" loading="lazy" decoding="async" />{item.name}
      </button>)}
    </div>
    <div className="highlights-shelf" style={{"--platform-accent": platform.color} as CSSProperties}>
      <header><div><span>SELECCIÓN GOAT</span><h3>{platform.name}</h3></div>
        <div className="highlights-arrows"><button type="button" onClick={() => scroll(-1)} aria-label="Ver series anteriores"><ArrowLeft size={19} /></button><button type="button" onClick={() => scroll(1)} aria-label="Ver más series"><ArrowRight size={19} /></button></div>
      </header>
      <div ref={rail} className="highlights-rail" tabIndex={0} aria-label={"Series de " + platform.name}>
        {platform.shows.map(([title, genre, symbol], index) => <article className="series-card" key={platform.id + title}>
          <div className={"series-art series-art-" + (index % 3)} aria-hidden="true"><span className="series-art-symbol">{symbol}</span><span className="series-art-orbit" /><span className="series-art-caption">{genre}</span></div>
          <div className="series-card-copy"><span>{genre}</span><h4>{title}</h4></div>
        </article>)}
      </div>
      <footer><p>Selección editorial. La disponibilidad puede variar según el país y el plan.</p><Link className="button" href={"/catalogo?categoria=Streaming&plataforma=" + encodeURIComponent(platform.id) + "#catalogo"}>Ver planes de {platform.name}<ArrowRight size={16} /></Link></footer>
    </div>
  </section>;
}

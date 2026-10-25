"use client";
import { useRef, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
export default function ProductCarousel({ id, title, href, count, loading, children }: { id: string; title: string; href: string; count: number; loading: boolean; children: ReactNode }) {
  const rail = useRef<HTMLDivElement>(null);
  function scroll(direction: number) {
    rail.current?.scrollBy({ left: direction * Math.max(280, rail.current.clientWidth * .8), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }
  return <section className="container home-product-carousel" aria-labelledby={'home-' + id + '-title'} data-department={id}>
    <div className="section-heading"><div><span className="overline">DESCUBRE GOATS</span><h2 id={'home-' + id + '-title'}>{title} <span>✳</span></h2><p>{loading ? 'Cargando productos…' : `${count} productos para explorar`}</p></div><Link className="button outline" href={href}>{id === "personalizados" ? "Ver personalizados" : `Ver todo ${title}`} <ArrowRight size={16} /></Link></div>
    <div className="home-carousel-shelf"><header><span>SELECCIÓN GOATS</span><div className="highlights-arrows"><button type="button" disabled={!count} onClick={() => scroll(-1)} aria-label={'Ver productos anteriores de ' + title}><ArrowLeft size={19} /></button><button type="button" disabled={!count} onClick={() => scroll(1)} aria-label={'Ver más productos de ' + title}><ArrowRight size={19} /></button></div></header>
      <div ref={rail} className="home-products-rail" tabIndex={0} role="region" aria-label={'Productos de ' + title}>{children}</div>
      {!loading && count === 0 && <p className="home-carousel-empty">Próximamente encontrarás productos en esta sección.</p>}
      <p className="home-carousel-hint">Desliza para descubrir →</p>
    </div>
  </section>;
}

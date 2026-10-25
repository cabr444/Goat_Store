"use client";
import Link from 'next/link';
import { ArrowRight, Headphones, Laptop, Play, Shirt, GraduationCap, Layers, Wallet, ShieldCheck, MessageCircle } from 'lucide-react';
import { BannerBackground } from './BannerImages';
import CatalogImage from './CatalogImage';
import { supportLink } from '@/lib/account-links';
type Preview = { id: string; name: string; category: string };
export default function MarketplaceHome({ tienda, segunda, signedIn, featured }: { tienda: boolean; segunda: boolean; signedIn: boolean; featured: Preview[] }) {
  const categories = [
    { title:'Streaming', text:'Series y películas', href:'/catalogo?categoria=Streaming', Icon:Play },
    { title:'Combos', text:'Tus plataformas juntas', href:'/catalogo?categoria=Combos', Icon:Layers },
    ...(tienda ? [{ title:'Tienda', text:'Tecnología para tu día', href:'/store', Icon:Laptop }] : []),
    ...(segunda ? [{ title:'Segunda', text:'Dales otra oportunidad', href:'/segunda', Icon:Shirt }] : []),
    { title:'Cursos', text:'Aprende algo nuevo', href:'/cursos', Icon:GraduationCap },
    { title:'Música', text:'Dale play a tu día', href:'/catalogo?categoria=M%C3%BAsica', Icon:Headphones },
  ];
  return <>
    <section className="container marketplace-promo" aria-labelledby="marketplace-title">
      <BannerBackground />
      <div className="marketplace-promo-copy"><span className="marketplace-kicker">MUCHO POR DESCUBRIR. TODO EN GOAT.</span><h1 id="marketplace-title">Lo que buscas,<br /><em>está aquí.</em></h1><p>Entretenimiento, aprendizaje{tienda ? ' y tecnología' : ''}. Explora tu próximo favorito en un solo lugar.</p><div className="marketplace-promo-actions"><a className="button violet" href="#catalogo">Explorar productos <ArrowRight size={17} /></a><Link href="/catalogo?categoria=Streaming">Descubrir Streaming →</Link></div></div>
      <div className="marketplace-preview" aria-hidden="true">{featured.slice(0,3).map((product,index)=><div className={'marketplace-preview-card preview-'+index} key={product.id}><CatalogImage productId={product.id} name={product.name} category={product.category} /><span>{product.name}</span></div>)}</div>
    </section>
    <section className="container marketplace-services" aria-label="Cómo comprar en Goat">
      <Link href={signedIn ? '/perfil' : '/acceso'}><span className="marketplace-service-icon"><Wallet size={25} /></span><div><strong>Compra con saldo Goat</strong><small>{signedIn ? 'Consulta tu saldo en tu perfil' : 'Ingresa y prepara tu próxima compra'}</small></div><ArrowRight size={17} /></Link>
      <Link href={signedIn ? '/pedidos' : '/acceso'}><span className="marketplace-service-icon"><ShieldCheck size={25} /></span><div><strong>Tus compras, en un solo lugar</strong><small>Consulta tus pedidos y comprobantes</small></div><ArrowRight size={17} /></Link>
      <a href={supportLink} target="_blank" rel="noopener noreferrer"><span className="marketplace-service-icon"><MessageCircle size={25} /></span><div><strong>Estamos para ayudarte</strong><small>Habla con nuestro equipo por WhatsApp</small></div><ArrowRight size={17} /></a>
    </section>
    <section className="container marketplace-categories" aria-labelledby="marketplace-categories-title"><div className="marketplace-section-title"><h2 id="marketplace-categories-title">¿Qué estás buscando?</h2><span>Encuentra tu próxima buena compra</span></div><div className="marketplace-category-grid">{categories.map(({title,text,href,Icon})=><Link key={title} href={href}><span className="marketplace-category-icon"><Icon size={29} strokeWidth={1.5}/></span><strong>{title}</strong><small>{text}</small></Link>)}</div></section>
    <section className="container marketplace-discover" aria-label="Descubre más en Goat"><Link href="/catalogo?categoria=Streaming"><div><span>TU TIEMPO. TUS HISTORIAS.</span><h2>Hoy se queda<br />el plan en casa.</h2><strong>Explorar Streaming <ArrowRight size={16}/></strong></div><img src="/images/catalog/netflix.svg" alt="" loading="lazy" decoding="async" /></Link><Link href={tienda ? '/store' : '/cursos'}><div><span>{tienda ? 'TECNOLOGÍA PARA TU DÍA' : 'HAZ ESPACIO PARA APRENDER'}</span><h2>{tienda ? <>Conecta con<br />lo que sigue.</> : <>Tu próxima<br />habilidad empieza aquí.</>}</h2><strong>{tienda ? 'Explorar Tienda' : 'Explorar Cursos'} <ArrowRight size={16}/></strong></div><img src={tienda ? '/images/catalog/headphones.jpg' : '/images/catalog/course-study.svg'} alt="" loading="lazy" decoding="async" /></Link></section>
  </>;
}

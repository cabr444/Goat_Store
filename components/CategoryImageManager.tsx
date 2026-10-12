"use client";
import { allCategories } from "@/lib/technology-products";
import CatalogImage from "./CatalogImage";
import ImageUploadButton from "./ImageUploadButton";
export default function CategoryImageManager() {
  return (
    <section className="container category-image-manager">
      <span className="overline">ADMINISTRACIÓN DE IMÁGENES</span>
      <h2>Imágenes de todas las categorías</h2>
      <p>Sube JPG, PNG o WebP de hasta 2 MB. Se guardan en la base de datos.</p>
      <div className="category-image-admin-grid">
        {allCategories.map((category) => (
          <article key={category}>
            <CatalogImage name={category} category={category} tile />
            <h3>{category}</h3>
            <ImageUploadButton kind="category" imageKey={category} />
          </article>
        ))}
      </div>
    </section>
  );
}

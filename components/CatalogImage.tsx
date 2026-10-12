"use client";
import { categoryImage, productImage } from "@/lib/catalog-images";
export default function CatalogImage({
  name,
  category,
  tile = false,
  className = "",
}: {
  name: string;
  category: string;
  tile?: boolean;
  className?: string;
}) {
  return (
    <img
      src={tile ? categoryImage(category) : productImage({ name, category })}
      alt={tile ? "" : name}
      loading="lazy"
      decoding="async"
      className={"catalog-image " + className}
      onError={(e) => {
        const fallback = "/images/catalog/generic.svg";
        if (!e.currentTarget.src.endsWith(fallback))
          e.currentTarget.src = fallback;
      }}
    />
  );
}

"use client";
import { useCatalogOverrides } from "@/components/CatalogImageProvider";
import { categoryImage, productImage } from "@/lib/catalog-images";
export default function CatalogImage({
  name,
  category,
  tile = false,
  className = "",
  productId,
}: {
  productId?: string;
  name: string;
  category: string;
  tile?: boolean;
  className?: string;
}) {
  const images = useCatalogOverrides();
  const override = tile
    ? images["category:" + category]
    : productId
      ? images["product:" + productId]
      : undefined;
  const fallback = tile
    ? categoryImage(category)
    : productImage({ name, category });
  return (
    <img
      src={override || fallback}
      alt={tile ? "" : name}
      loading="lazy"
      decoding="async"
      className={"catalog-image " + className}
      onError={(e) => {
        const fallbackImage = e.currentTarget.src.includes(
          "/api/catalog-images/file",
        )
          ? fallback
          : "/images/catalog/generic.svg";
        if (!e.currentTarget.src.endsWith(fallbackImage))
          e.currentTarget.src = fallbackImage;
      }}
    />
  );
}

import { useMemo } from "react";
import { brandSlugOf, citySlugOf, canonicalUrl } from "./canonical";
import { breadcrumbJsonLd } from "./SeoHead";

export function scopeVehicles(vehicles, brandSlug, citySlug) {
  return (vehicles || []).filter((vehicle) => {
    if (brandSlug && brandSlugOf(vehicle) !== brandSlug) return false;
    if (citySlug && citySlugOf(vehicle) !== citySlug) return false;
    return true;
  });
}

export function useListingScope(vehicles, brandSlug, citySlug) {
  return useMemo(
    () => scopeVehicles(vehicles, brandSlug, citySlug),
    [vehicles, brandSlug, citySlug]
  );
}

export function labelFromVehicles(vehicles, brandSlug, citySlug) {
  const first = vehicles[0];
  if (brandSlug) {
    return (
      first?.brandName ||
      first?.brand ||
      first?.BrandName ||
      brandSlug.replace(/-/g, " ")
    );
  }
  if (citySlug) {
    return (
      first?.cityName ||
      first?.city ||
      first?.CityName ||
      citySlug.replace(/-/g, " ")
    );
  }
  return "";
}

export function listingCollectionSeo({
  kind,
  brandSlug,
  citySlug,
  vehicles,
  t,
  searchActive,
}) {
  const rent = kind === "rent";
  const collection = rent ? "/vehicles-for-rent" : "/vehicles-for-sale";
  const label = labelFromVehicles(vehicles, brandSlug, citySlug);
  let path = collection;
  if (brandSlug) path = `${collection}/brand/${brandSlug}`;
  else if (citySlug) path = `${collection}/city/${citySlug}`;

  const breadcrumbs = [
    { name: "AutoMarket", path: "/" },
    {
      name: rent ? t("forRent") : t("forSale"),
      path: collection,
    },
  ];
  if (brandSlug || citySlug) {
    breadcrumbs.push({ name: label, path });
  }

  let title = rent ? t("seoRentTitle") : t("seoSaleTitle");
  let description = rent ? t("seoRentDesc") : t("seoSaleDesc");
  let h1 = rent ? t("forRent") : t("forSale");
  let lead = rent ? t("seoRentLead") : t("seoSaleLead");

  if (brandSlug) {
    title = rent
      ? t("seoBrandRentTitle", { brand: label })
      : t("seoBrandSaleTitle", { brand: label });
    description = rent
      ? t("seoBrandRentDesc", { brand: label })
      : t("seoBrandSaleDesc", { brand: label });
    h1 = title.replace(/\s*\|\s*AutoMarket$/i, "");
    lead = description;
  } else if (citySlug) {
    title = rent
      ? t("seoCityRentTitle", { city: label })
      : t("seoCitySaleTitle", { city: label });
    description = rent
      ? t("seoCityRentDesc", { city: label })
      : t("seoCitySaleDesc", { city: label });
    h1 = title.replace(/\s*\|\s*AutoMarket$/i, "");
    lead = description;
  }

  const empty = !vehicles.length;
  const noindex = Boolean(searchActive) || ((brandSlug || citySlug) && empty);

  const itemList = {
    "@type": "ItemList",
    name: h1,
    url: canonicalUrl(path),
    numberOfItems: vehicles.length,
    itemListElement: vehicles.slice(0, 30).map((vehicle, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: canonicalUrl(`/vehicles/${vehicle.id ?? vehicle.Id}`),
    })),
  };

  return {
    title,
    description,
    canonicalPath: path,
    noindex,
    h1,
    lead,
    breadcrumbs,
    related: {
      collection,
      brandSlug: brandSlug || brandSlugOf(vehicles[0]),
      citySlug: citySlug || citySlugOf(vehicles[0]),
      brand: brandSlug ? label : vehicles[0]?.brandName || vehicles[0]?.brand,
      city: citySlug ? label : vehicles[0]?.cityName || vehicles[0]?.city,
    },
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [itemList, breadcrumbJsonLd(breadcrumbs)].filter(Boolean),
    },
  };
}

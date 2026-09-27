import { isRentListing } from "../utils/listingType";
import { SITE_LOGO } from "../config/site";
import { breadcrumbJsonLd } from "./SeoHead";
import {
  brandSlugOf,
  canonicalUrl,
  citySlugOf,
} from "./canonical";

function pick(vehicle, ...keys) {
  for (const key of keys) {
    const value = vehicle?.[key];
    if (value != null && String(value).trim() !== "" && String(value) !== "-") {
      return String(value).trim();
    }
  }
  return "";
}

export function vehicleDisplayName(vehicle) {
  const brand = pick(vehicle, "brandName", "brand", "BrandName");
  const model = pick(vehicle, "modelName", "model", "ModelName");
  const year = pick(vehicle, "year", "Year");
  return [brand, model, year].filter(Boolean).join(" ") || "Vehicle";
}

export function vehicleImageAlt(vehicle, extra = "") {
  const name = vehicleDisplayName(vehicle);
  const city = pick(vehicle, "cityName", "city", "CityName");
  const rent = isRentListing(vehicle);
  const place = city ? ` ${city}` : "";
  const bit = extra ? ` ${extra}` : "";
  return rent
    ? `${name} me qira${place}${bit}`.trim()
    : `${name} në shitje${place}${bit}`.trim();
}

export function generateVehicleSEO(vehicle, images = []) {
  const name = vehicleDisplayName(vehicle);
  const city = pick(vehicle, "cityName", "city", "CityName");
  const rent = isRentListing(vehicle);
  const price = pick(vehicle, "price", "Price");
  const mileage = pick(vehicle, "mileage", "Mileage");
  const fuel = pick(vehicle, "fuelTypeName", "fuel", "FuelTypeName");
  const id = vehicle?.id ?? vehicle?.Id;
  const path = `/vehicles/${id}`;
  const kind = rent ? "me qira" : "në shitje";
  const place = city ? ` në ${city}` : "";
  const title = `${name} ${kind}${place} | AutoMarket`;
  const bits = [
    `${name} ${kind}${place} në AutoMarket.`,
    price ? `Çmimi ${price} €.` : "",
    mileage ? `${mileage} km.` : "",
    fuel ? `Karburant: ${fuel}.` : "",
    "Shiko fotot dhe kontakto shitësin.",
  ].filter(Boolean);
  const description = bits.join(" ");
  const image = images[0] || pick(vehicle, "imageUrl", "ImageUrl") || SITE_LOGO;
  const brand = pick(vehicle, "brandName", "brand");
  const model = pick(vehicle, "modelName", "model");
  const year = pick(vehicle, "year");
  const carLd = {
    "@type": "Car",
    name,
    url: canonicalUrl(path),
    brand: brand || undefined,
    model: model || undefined,
    vehicleModelDate: year || undefined,
    mileageFromOdometer: mileage
      ? {
          "@type": "QuantitativeValue",
          value: Number(String(mileage).replace(/[^\d.]/g, "")),
          unitCode: "KMT",
        }
      : undefined,
    fuelType: fuel || undefined,
    image: image || undefined,
    offers: price
      ? {
          "@type": "Offer",
          url: canonicalUrl(path),
          price: Number(String(price).replace(/[^\d.]/g, "")),
          priceCurrency: "EUR",
          availability: "https://schema.org/InStock",
        }
      : undefined,
  };
  const collection = rent ? "/vehicles-for-rent" : "/vehicles-for-sale";
  const brandSlug = brandSlugOf(vehicle);
  const citySlug = citySlugOf(vehicle);
  const breadcrumbs = [
    { name: "AutoMarket", path: "/" },
    { name: rent ? "Me qira" : "Në shitje", path: collection },
  ];
  if (brand && brandSlug) {
    breadcrumbs.push({
      name: brand,
      path: `${collection}/brand/${brandSlug}`,
    });
  }
  if (city && citySlug) {
    breadcrumbs.push({
      name: city,
      path: `${collection}/city/${citySlug}`,
    });
  }
  breadcrumbs.push({ name, path });
  const crumbs = breadcrumbJsonLd(breadcrumbs);
  return {
    title,
    description,
    canonicalPath: path,
    image,
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [carLd, crumbs].filter(Boolean),
    },
    breadcrumbs,
    collection,
    brandSlug,
    citySlug,
    brand,
    city,
    name,
  };
}

function listingName(vehicle) {
  return String(vehicle?.listingTypeName || vehicle?.listingType || "")
    .toLowerCase()
    .trim();
}

export function isRentListing(vehicle) {
  const name = listingName(vehicle);
  return name === "rent" || name.includes("rent") || name.includes("qira");
}

export function isSaleListing(vehicle) {
  if (isRentListing(vehicle)) return false;
  const name = listingName(vehicle);
  if (name === "sale" || name === "sell") return true;
  if (name.includes("sale") || name.includes("sell") || name.includes("shit")) {
    return true;
  }
  const id = vehicle?.listingTypeId;
  if (id == null || id === "") return true;
  return Number(id) === 1;
}

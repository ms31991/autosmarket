function listingName(vehicle) {
  return String(vehicle?.listingTypeName || vehicle?.listingType || "")
    .toLowerCase()
    .trim();
}

export function listingTypeIdFromCatalog(types, filter) {
  const rows = Array.isArray(types) ? types : [];
  const nameOf = (row) =>
    String(row?.name || row?.Name || "")
      .toLowerCase()
      .trim();
  const idOf = (row) => row?.id ?? row?.Id ?? "";
  if (filter === "rent") {
    const row = rows.find((item) => {
      const name = nameOf(item);
      return name === "rent" || name.includes("rent") || name.includes("qira");
    });
    return idOf(row);
  }
  if (filter === "sale") {
    const row = rows.find((item) => {
      const name = nameOf(item);
      return (
        name === "sale" ||
        name === "sell" ||
        name.includes("sale") ||
        name.includes("sell") ||
        name.includes("shit")
      );
    });
    return idOf(row);
  }
  return "";
}

export function filterByListingType(vehicles, listingFilter) {
  const list = Array.isArray(vehicles) ? vehicles : [];
  if (listingFilter === "rent") return list.filter(isRentListing);
  if (listingFilter === "sale") return list.filter(isSaleListing);
  return list;
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

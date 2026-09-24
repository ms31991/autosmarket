export function isPromotedVehicle(vehicle) {
  const value = vehicle?.isPromoted ?? vehicle?.IsPromoted;
  if (value === true || value === 1 || value === "1" || value === "true") {
    return true;
  }
  return false;
}

export function adVehicleIds(ads) {
  return new Set(
    (Array.isArray(ads) ? ads : [])
      .map((ad) => Number(ad?.vehicleId))
      .filter((id) => Number.isFinite(id) && id > 0)
  );
}

export function markPromotedVehicles(list, ads) {
  const ids = ads instanceof Set ? ads : adVehicleIds(ads);
  return (Array.isArray(list) ? list : []).map((vehicle) => ({
    ...vehicle,
    isPromoted:
      isPromotedVehicle(vehicle) || ids.has(Number(vehicle.id)),
  }));
}

export function pinPromotedVehicles(list) {
  const vehicles = Array.isArray(list) ? list : [];
  const promoted = [];
  const rest = [];

  for (const vehicle of vehicles) {
    if (isPromotedVehicle(vehicle)) {
      promoted.push(vehicle);
    } else {
      rest.push(vehicle);
    }
  }

  return [...promoted, ...rest];
}

export function rankSearchVehicles(list, ads) {
  return pinPromotedVehicles(markPromotedVehicles(list, ads));
}

export function adFromVehicle(vehicle) {
  return {
    id: vehicle.id,
    vehicleId: vehicle.id,
    brandName: vehicle.brandName || vehicle.brand?.name || vehicle.brand,
    modelName: vehicle.modelName || vehicle.model?.name || vehicle.model,
    title: vehicle.title,
    vehicleImageUrl: vehicle.images?.[0] || vehicle.imageUrl,
    imageUrl: vehicle.images?.[0] || vehicle.imageUrl,
    vehiclePrice: vehicle.price,
    price: vehicle.price,
    fuelTypeName:
      vehicle.fuelTypeName || vehicle.fuelType?.name || vehicle.fuel,
    mileage: vehicle.mileage,
    year: vehicle.year,
    ownerId: vehicle.ownerId || vehicle.ownerClerkUserId,
    ownerName: vehicle.ownerName,
    ownerSurname: vehicle.ownerSurname,
    ownerProfileImage: vehicle.ownerProfileImage,
  };
}

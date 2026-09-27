import { query, queryOne } from "./db.js";

async function tryQuery(sql, params) {
  try {
    await query(sql, params);
  } catch {
    /* table or column may not exist */
  }
}

export async function deleteVehicleById(id) {
  const vehicleId = Number(id);
  if (!Number.isFinite(vehicleId) || vehicleId <= 0) {
    return { status: 400, message: "Invalid id." };
  }
  const existing = await queryOne(`SELECT Id FROM Vehicles WHERE Id = @id`, {
    id: vehicleId,
  });
  if (!existing) {
    return { status: 404, message: "Vehicle nuk u gjet." };
  }

  await tryQuery(
    `DELETE FROM Messages WHERE ConversationId IN (
       SELECT Id FROM Conversations WHERE VehicleId = @id
     )`,
    { id: vehicleId }
  );
  await tryQuery(`DELETE FROM Conversations WHERE VehicleId = @id`, {
    id: vehicleId,
  });
  await tryQuery(
    `UPDATE Conversations SET VehicleId = NULL WHERE VehicleId = @id`,
    { id: vehicleId }
  );
  await tryQuery(
    `DELETE FROM PurchaseAdvertisements
     WHERE VehicleId = @id
        OR AdvertisementId IN (SELECT Id FROM Advertisements WHERE VehicleId = @id)`,
    { id: vehicleId }
  );
  await tryQuery(`DELETE FROM Advertisements WHERE VehicleId = @id`, {
    id: vehicleId,
  });
  await tryQuery(`DELETE FROM VehicleFeatures WHERE VehicleId = @id`, {
    id: vehicleId,
  });
  await tryQuery(`DELETE FROM VehicleImages WHERE VehicleId = @id`, {
    id: vehicleId,
  });
  await tryQuery(`DELETE FROM Favourites WHERE VehicleId = @id`, {
    id: vehicleId,
  });
  await tryQuery(`DELETE FROM ListingReports WHERE VehicleId = @id`, {
    id: vehicleId,
  });
  await tryQuery(
    `DELETE FROM RentalBookings
     WHERE RentalDetailsId IN (SELECT Id FROM RentalDetails WHERE VehicleId = @id)`,
    { id: vehicleId }
  );
  await tryQuery(`DELETE FROM RentalDetails WHERE VehicleId = @id`, {
    id: vehicleId,
  });

  try {
    await query(`DELETE FROM Vehicles WHERE Id = @id`, { id: vehicleId });
  } catch (err) {
    return {
      status: 409,
      message: err.message || "Vetura nuk u fshi sepse ka të dhëna të lidhura.",
    };
  }
  return { status: 204 };
}

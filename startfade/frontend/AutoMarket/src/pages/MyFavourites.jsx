import "./MyFavourites.css";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { VehicleCard } from "./VehicleCard";
import { getClerkToken } from "../services/clerkToken";
import { API_BASE } from "../config/api";

export const MyFavourites = () => {
const [favourites, setFavourites] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

// =====================================================
// GET MY FAVOURITES
// =====================================================

const fetchFavourites = async () => {
const token = await getClerkToken();

if (!token) {
  setError(
    "Duhet të jesh i kyçur për të parë favourites."
  );

  setLoading(false);
  return;
}

try {
  setLoading(true);
  setError("");

  const response = await fetch(
    `${API_BASE}/Favourites`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  console.log(
    "FAVOURITES STATUS:",
    response.status
  );

  const responseText =
    await response.text();

  console.log(
    "FAVOURITES RESPONSE:",
    responseText
  );

  if (!response.ok) {
    let data = {};

    try {
      data = responseText
        ? JSON.parse(responseText)
        : {};
    } catch {
      data = {};
    }

    setError(
      data.message ||
      "Nuk mund të ngarkoheshin favourites."
    );

    return;
  }

  let data = [];

  try {
    data = responseText
      ? JSON.parse(responseText)
      : [];
  } catch {
    setError(
      "Response nga serveri nuk është JSON valid."
    );

    return;
  }

  console.log(
    "FAVOURITES DATA:",
    data
  );

  setFavourites(
    Array.isArray(data)
      ? data
      : []
  );

} catch (error) {

  console.error(
    "FAVOURITES ERROR:",
    error
  );

  setError(
    "Nuk mund të lidhemi me serverin."
  );

} finally {

  setLoading(false);

}

};

// =====================================================
// LOAD FAVOURITES
// =====================================================

useEffect(() => {

fetchFavourites();

}, []);

// =====================================================
// REMOVE FAVOURITE
// =====================================================

const removeFavourite = async (
vehicleId
) => {

const token =
  await getClerkToken();

if (!token) {
  setError(
    "Duhet të jesh i kyçur."
  );

  return;
}

try {

  const response = await fetch(
    `${API_BASE}/Favourites/${vehicleId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  console.log(
    "REMOVE FAVOURITE STATUS:",
    response.status
  );

  const responseText =
    await response.text();

  console.log(
    "REMOVE FAVOURITE RESPONSE:",
    responseText
  );

  if (!response.ok) {

    let data = {};

    try {

      data = responseText
        ? JSON.parse(responseText)
        : {};

    } catch {

      data = {};

    }

    alert(
      data.message ||
      "Nuk mund të hiqej favourite."
    );

    return;

  }


  // ==============================================
  // REMOVE FROM UI
  // ==============================================

  setFavourites((previous) =>
    previous.filter(
      (item) =>
        item.vehicleId !== vehicleId
    )
  );

} catch (error) {

  console.error(
    "REMOVE FAVOURITE ERROR:",
    error
  );

  alert(
    "Ndodhi një gabim gjatë heqjes."
  );

}

};

// =====================================================
// LOADING
// =====================================================

if (loading) {

return (

  <div
    style={{
      padding: "30px",
    }}
  >

    <h1>
      My Favourites
    </h1>

    <p>
      Loading favourites...
    </p>

  </div>

);

}

// =====================================================
// ERROR
// =====================================================

if (error) {

return (

  <div
    style={{
      padding: "30px",
    }}
  >

    <h1>
      My Favourites
    </h1>

    <p
      style={{
        color: "red",
      }}
    >
      {error}
    </p>

  </div>

);

}

// =====================================================
// EMPTY
// =====================================================

if (favourites.length === 0) {

return (

  <div
    style={{
      padding: "30px",
    }}
  >

    <h1>
      My Favourites
    </h1>

    <div
      style={{
        textAlign: "center",
        padding: "60px 20px",
      }}
    >

      <div
        style={{
          fontSize: "60px",
          marginBottom: "20px",
        }}
      >
        ♡
      </div>

      <h2>
        No favourites yet
      </h2>

      <p>
        Nuk ke ruajtur asnjë
        veturë në favourites.
      </p>

      <Link
        to="/vehicles"
        style={{
          display: "inline-block",
          marginTop: "20px",
          padding: "10px 18px",
          backgroundColor: "#111",
          color: "#fff",
          textDecoration: "none",
          borderRadius: "7px",
        }}
      >
        Browse Vehicles
      </Link>

    </div>

  </div>

);

}

// =====================================================
// FAVOURITES
// =====================================================

return (

<div className="my-favourites-page">


  {/* HEADER */}

  <div
    style={{
      marginBottom: "25px",
    }}
  >

    <h1>
      My Favourites
    </h1>

    <p
      style={{
        color: "#666",
      }}
    >

      {favourites.length}{" "}

      {favourites.length === 1
        ? "vehicle"
        : "vehicles"}{" "}

      saved

    </p>

  </div>


  {/* VEHICLE CARDS */}

  <div
    className="vehicle-grid"
  >

    {favourites.map((favourite) => {

      const vehicle = {

        id:
          favourite.vehicleId,

        categoryId:
          favourite.categoryId,

        categoryName:
          favourite.categoryName,

        brandId:
          favourite.brandId,

        brandName:
          favourite.brandName ||
          favourite.brand,

        modelId:
          favourite.modelId,

        modelName:
          favourite.modelName ||
          favourite.model,

        bodyTypeId:
          favourite.bodyTypeId,

        bodyTypeName:
          favourite.bodyTypeName,

        fuelTypeId:
          favourite.fuelTypeId,

        fuelTypeName:
          favourite.fuelTypeName,

        transmissionId:
          favourite.transmissionId,

        transmissionName:
          favourite.transmissionName,

        driveTypeId:
          favourite.driveTypeId,

        driveTypeName:
          favourite.driveTypeName,

        conditionId:
          favourite.conditionId,

        conditionName:
          favourite.conditionName,

        colorId:
          favourite.colorId,

        colorName:
          favourite.colorName,

        ownerId:
          favourite.ownerId,

        cityId:
          favourite.cityId,

        cityName:
          favourite.cityName ||
          favourite.city,

        price:
          favourite.price,

        year:
          favourite.year,

        mileage:
          favourite.mileage,

        engine:
          favourite.engine,

        engineCC:
          favourite.engineCC,

        powerHP:
          favourite.powerHP,

        powerKW:
          favourite.powerKW,

        cylinders:
          favourite.cylinders,

        doors:
          favourite.doors,

        seats:
          favourite.seats,

        vin:
          favourite.vin,

        createdDate:
          favourite.createdDate,

        images:
          favourite.images || [],
      };


      return (

        <div
          key={
            favourite.favouriteId ||
            favourite.vehicleId
          }
          style={{
            position: "relative",
          }}
        >

          <VehicleCard
            vehicle={vehicle}
          />


          <button
            type="button"
            onClick={() =>
              removeFavourite(
                favourite.vehicleId
              )
            }
            style={{
              width: "100%",
              marginTop: "10px",
              padding: "10px",
              border: "1px solid #ddd",
              borderRadius: "7px",
              backgroundColor: "#fff",
              color: "#d00",
              cursor: "pointer",
              fontWeight: "500",
            }}
          >
            ❤️ Remove from Favourites
          </button>

        </div>

      );

    })}

  </div>

</div>

);

};
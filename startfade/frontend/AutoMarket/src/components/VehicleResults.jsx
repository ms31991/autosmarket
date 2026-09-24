import React from "react";
import { FiArrowLeft } from "react-icons/fi";

import "./VehicleResults.css";
import { SearchVehicleItem } from "./SearchVehicleItem";
import { ListingAdsSidebar } from "./ListingAdsSidebar";
import { useLanguage } from "../i18n/LanguageContext";
import { useRankedSearchVehicles } from "../hooks/useRankedSearchVehicles";

export const VehicleResults = ({ data, onBack }) => {
  const { t } = useLanguage();
  // =====================================================
  // RESULTS
  // =====================================================

  // VehicleSearch currently sends an array:
  // onSearchResults(vehicles)
  //
  // But this also supports:
  // { items: [...] }

  const rawVehicles = Array.isArray(data) ? data : data?.items || [];
  const vehicles = useRankedSearchVehicles(rawVehicles);

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <section className="vehicle-results">

      {/* =================================================
          BACK BUTTON
      ================================================= */}

      <div className="results-back">
        <button
          type="button"
          className="back-button"
          onClick={onBack}
        >
          <FiArrowLeft />
          <span>{t("back")}</span>
        </button>
      </div>

      {/* =================================================
          RESULTS HEADER
      ================================================= */}

      <div className="results-header">
        <div>
          <span className="results-label">
            {t("resultsTitle")}
          </span>
          
         
        </div>
      </div>

      {/* =================================================
          RESULTS CONTENT + ADS
      ================================================= */}

        <div className="vehicles-content-layout">
          <div className="results-list-section">
            {vehicles.length === 0 ? (
              <div className="no-results">
                <h2>{t("noCars")}</h2>
                <p>{t("tryFilters")}</p>
              </div>
            ) : (
              <div className="vehicle-results-grid">
                {vehicles.map((vehicle) => (
                  <SearchVehicleItem
                    key={vehicle.id}
                    vehicle={vehicle}
                  />
                ))}
              </div>
            )}
          </div>

          <ListingAdsSidebar />
        </div>

    </section>
  );
};
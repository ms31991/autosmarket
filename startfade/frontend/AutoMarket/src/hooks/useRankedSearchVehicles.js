import { useEffect, useState } from "react";
import { rankSearchVehicles } from "../utils/promotedSearch";
import { API_BASE } from "../config/api";

export function useRankedSearchVehicles(list) {
  const [ads, setAds] = useState([]);

  useEffect(() => {
    let cancelled = false;

    fetch(`${API_BASE}/Advertisements/active`)
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => {
        if (!cancelled) {
          setAds(Array.isArray(data) ? data : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAds([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return rankSearchVehicles(list, ads);
}

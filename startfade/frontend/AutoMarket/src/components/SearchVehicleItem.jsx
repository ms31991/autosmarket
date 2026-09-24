import { VehicleCard } from "../pages/VehicleCard";

export const SearchVehicleItem = ({ vehicle, ...cardProps }) => {
  return <VehicleCard vehicle={vehicle} {...cardProps} />;
};

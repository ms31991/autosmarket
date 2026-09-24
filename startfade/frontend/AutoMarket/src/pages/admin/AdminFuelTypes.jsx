import "./AdminFuelTypes.css";
import { AdminCrudPage } from "./AdminCrudPage";

export const AdminFuelTypes = () => (
  <AdminCrudPage
    className="admin-fuel-types-page"
    title="Fuel types"
    hint="Add, edit or delete fuel types."
    endpoint="/FuelTypes"
    fields={[{ key: "name", label: "Name" }]}
  />
);

import "./AdminCategories.css";
import { AdminCrudPage } from "./AdminCrudPage";

export function AdminCategories() {
  return (
    <AdminCrudPage
      className="admin-categories-page"
      title="Categories"
      hint="Add, edit or delete vehicle categories."
      endpoint="/VehicleCategories"
      fields={[{ key: "name", label: "Name" }]}
    />
  );
}

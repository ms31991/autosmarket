import "./AdminConditions.css";
import { AdminCrudPage } from "./AdminCrudPage";

export function AdminConditions() {
  return (
    <AdminCrudPage
      className="admin-conditions-page"
      title="Conditions"
      hint="Add, edit or delete vehicle conditions."
      endpoint="/Conditions"
      fields={[{ key: "name", label: "Name" }]}
    />
  );
}

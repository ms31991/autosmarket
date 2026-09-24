import "./AdminBrands.css";
import { AdminCrudPage } from "./AdminCrudPage";

export function AdminBrands() {
  return (
    <AdminCrudPage
      className="admin-brands-page"
      title="Brands"
      hint="Add, edit or delete car brands."
      endpoint="/Brands"
      fields={[{ key: "name", label: "Name" }]}
    />
  );
}

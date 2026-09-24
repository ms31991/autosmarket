import "./AdminFeatures.css";
import { AdminCrudPage } from "./AdminCrudPage";

export function AdminFeatures() {
  return (
    <AdminCrudPage
      className="admin-features-page"
      title="Features"
      hint="Add, edit or delete vehicle features."
      endpoint="/Features"
      fields={[{ key: "name", label: "Name" }]}
    />
  );
}

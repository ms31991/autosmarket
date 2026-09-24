import "./AdminTransmissions.css";
import { AdminCrudPage } from "./AdminCrudPage";

export const AdminTransmissions = () => (
  <AdminCrudPage
    className="admin-transmissions-page"
    title="Transmissions"
    hint="Add, edit or delete transmissions."
    endpoint="/Transmissions"
    fields={[{ key: "name", label: "Name" }]}
  />
);

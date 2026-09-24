import "./AdminCountries.css";
import { AdminCrudPage } from "./AdminCrudPage";

export const AdminCountries = () => (
  <AdminCrudPage
    className="admin-countries-page"
    title="Countries"
    hint="Add, edit or delete countries."
    endpoint="/Country"
    fields={[
      { key: "name", label: "Name" },
      { key: "code", label: "Code" },
    ]}
  />
);

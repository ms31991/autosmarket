import "./AdminCities.css";
import { AdminCrudPage } from "./AdminCrudPage";

export const AdminCities = () => (
  <AdminCrudPage
    className="admin-cities-page"
    title="Cities"
    hint="Add, edit or delete cities."
    endpoint="/Cities"
    fields={[
      { key: "name", label: "City" },
      {
        key: "countryId",
        label: "Country",
        type: "select",
        optionsEndpoint: "/Country",
      },
    ]}
  />
);

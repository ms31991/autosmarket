import "./AdminModels.css";
import { AdminCrudPage } from "./AdminCrudPage";

export const AdminModels = () => (
  <AdminCrudPage
    className="admin-models-page"
    title="Models"
    hint="Add, edit or delete vehicle models."
    endpoint="/VehicleModels"
    fields={[
      { key: "name", label: "Model" },
      {
        key: "brandId",
        label: "Brand",
        type: "select",
        optionsEndpoint: "/Brands",
      },
    ]}
  />
);

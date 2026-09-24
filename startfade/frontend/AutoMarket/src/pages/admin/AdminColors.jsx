import "./AdminColors.css";
import { AdminCrudPage } from "./AdminCrudPage";

export const AdminColors = () => (
  <AdminCrudPage
    className="admin-colors-page"
    title="Colors"
    hint="Add, edit or delete colors."
    endpoint="/Colors"
    fields={[
      { key: "name", label: "Name" },
      { key: "hexCode", label: "Hex", type: "color" },
    ]}
  />
);

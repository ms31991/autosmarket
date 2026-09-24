import "./AdminBodyTypes.css";
import { AdminCrudPage } from "./AdminCrudPage";

export const AdminBodyTypes = () => (
  <AdminCrudPage
    className="admin-body-types-page"
    title="Body types"
    hint="Add, edit or delete body types."
    endpoint="/BodyTypes"
    fields={[{ key: "name", label: "Name" }]}
  />
);

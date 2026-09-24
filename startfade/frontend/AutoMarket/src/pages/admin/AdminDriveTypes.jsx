import "./AdminDriveTypes.css";
import { AdminCrudPage } from "./AdminCrudPage";

export function AdminDriveTypes() {
  return (
    <AdminCrudPage
      className="admin-drive-types-page"
      title="Drive types"
      hint="Add, edit or delete drive types."
      endpoint="/DriveTypes"
      fields={[{ key: "name", label: "Name" }]}
    />
  );
}

import { AdminCrudPage } from "./AdminCrudPage";

export function AdminListingTypes() {
  return (
    <AdminCrudPage
      className="admin-manage-page"
      title="Listing types"
      hint="Sale, rent, and any other listing type cars can use."
      endpoint="/ListingTypes"
      fields={[{ key: "name", label: "Name" }]}
    />
  );
}

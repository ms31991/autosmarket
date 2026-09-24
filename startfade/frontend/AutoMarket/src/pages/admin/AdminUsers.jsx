import "./AdminUsers.css";
import { useEffect, useState } from "react";
import { adminFetch } from "./adminApi";

export function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState("");

  async function load() {
    try {
      setError("");
      const [userRows, roleRows] = await Promise.all([
        adminFetch("/users"),
        adminFetch("/roles"),
      ]);
      setUsers(Array.isArray(userRows) ? userRows : []);
      setRoles(Array.isArray(roleRows) ? roleRows : []);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function changeRole(id, roleName) {
    try {
      setSavingId(id);
      setError("");
      await adminFetch(`/users/${id}/role`, {
        method: "PUT",
        body: JSON.stringify({ roleName }),
      });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId("");
    }
  }

  return (
    <div className="admin-users-page admin-manage-page">
      <h1>Users & roles</h1>
      <p>Change a user’s role. Existing accounts stay in the database.</p>
      {error ? <p className="admin-manage-error">{error}</p> : null}
      <div className="admin-manage-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const roleValue = user.roli_emri || user.roliEmri || user.roleName || "User";
              return (
              <tr key={user.id}>
                <td>{user.email || user.userName || "—"}</td>
                <td>{[user.name, user.surname].filter(Boolean).join(" ") || "—"}</td>
                <td>
                  <select
                    value={roleValue}
                    disabled={savingId === user.id}
                    onChange={(event) => changeRole(user.id, event.target.value)}
                  >
                    {roles.map((role) => {
                      const name = role.roli_emri || role.roliEmri;
                      const id = role.roli_id || role.roliId;
                      return (
                        <option key={id} value={name}>
                          {name}
                        </option>
                      );
                    })}
                  </select>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

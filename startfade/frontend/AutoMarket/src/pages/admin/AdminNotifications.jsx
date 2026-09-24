import "./AdminNotifications.css";
import { useEffect, useState } from "react";
import { adminFetch, formatDate } from "./adminApi";

export function AdminNotifications() {
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [userId, setUserId] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setError("");
      const [notes, userRows] = await Promise.all([
        adminFetch("/notifications"),
        adminFetch("/users"),
      ]);
      setRows(Array.isArray(notes) ? notes : []);
      setUsers(Array.isArray(userRows) ? userRows : []);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function send(event) {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      await adminFetch("/notifications", {
        method: "POST",
        body: { userId, title, message },
      });
      setTitle("");
      setMessage("");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-notifications-page admin-manage-page">
      <h1>Notifications</h1>
      <p>Send a notification to a user.</p>
      {error ? <p className="admin-manage-error">{error}</p> : null}

      <form onSubmit={send}>
        <select value={userId} onChange={(event) => setUserId(event.target.value)} required>
          <option value="">User</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.email || user.userName || user.id}
            </option>
          ))}
        </select>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Title"
          required
        />
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Message"
        />
        <button type="submit" disabled={saving}>
          Send
        </button>
      </form>

      <div className="admin-manage-table-wrap">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Title</th>
              <th>Message</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.email || row.userId}</td>
                <td>{row.title}</td>
                <td>{row.message}</td>
                <td>{formatDate(row.createdAt)}</td>
                <td>
                  <button
                    type="button"
                    className="btn-delete"
                    onClick={async () => {
                      if (!window.confirm("Delete this notification?")) return;
                      await adminFetch(`/notifications/${row.id}`, { method: "DELETE" });
                      await load();
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

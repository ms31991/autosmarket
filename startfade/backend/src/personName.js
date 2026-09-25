export function isPlaceholderName(value) {
  const text = String(value || "").trim();
  if (!text) return true;
  if (/^user_[a-zA-Z0-9]+$/i.test(text)) return true;
  if (text.toLowerCase() === "user") return true;
  if (text.toLowerCase().includes("@users.autosmarket.me")) return true;
  return false;
}

export function personDisplayName(user) {
  const first = isPlaceholderName(user?.Name ?? user?.name)
    ? ""
    : String(user?.Name ?? user?.name ?? "").trim();
  const last = isPlaceholderName(user?.Surname ?? user?.surname)
    ? ""
    : String(user?.Surname ?? user?.surname ?? "").trim();
  const full = `${first} ${last}`.trim();
  if (full) return full;
  const userName = String(user?.UserName ?? user?.userName ?? "").trim();
  if (userName && !isPlaceholderName(userName) && !userName.includes("@")) {
    return userName;
  }
  return "User";
}

export function withPublicOwnerNames(vehicle) {
  const first = isPlaceholderName(vehicle.ownerName)
    ? ""
    : String(vehicle.ownerName || "").trim();
  const last = isPlaceholderName(vehicle.ownerSurname)
    ? ""
    : String(vehicle.ownerSurname || "").trim();
  const label = personDisplayName({
    name: first || vehicle.ownerName,
    surname: last || vehicle.ownerSurname,
    userName: vehicle.ownerUserName,
  });
  if (first || last) {
    return {
      ...vehicle,
      ownerName: first,
      ownerSurname: last,
      publisherName: `${first} ${last}`.trim(),
    };
  }
  return {
    ...vehicle,
    ownerName: label === "User" ? "" : label,
    ownerSurname: "",
    publisherName: label,
  };
}

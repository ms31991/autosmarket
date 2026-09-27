import { Link } from "react-router-dom";
import "./SeoBreadcrumbs.css";

export function SeoBreadcrumbs({ items = [] }) {
  const list = Array.isArray(items) ? items.filter((item) => item?.name) : [];
  if (list.length < 2) return null;
  return (
    <nav className="seo-crumbs" aria-label="Breadcrumb">
      <ol>
        {list.map((item, index) => (
          <li key={`${item.path || item.name}-${index}`}>
            {index < list.length - 1 && item.path ? (
              <Link to={item.path}>{item.name}</Link>
            ) : (
              <span>{item.name}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function ListingRelated({ collection, brand, brandSlug, city, citySlug }) {
  const links = [];
  if (collection) {
    links.push({ to: collection, label: collection.includes("rent") ? "Qira" : "Shitje" });
  }
  if (brand && brandSlug) {
    links.push({ to: `${collection}/brand/${brandSlug}`, label: brand });
  }
  if (city && citySlug) {
    links.push({ to: `${collection}/city/${citySlug}`, label: city });
  }
  if (links.length < 2) return null;
  return (
    <div className="seo-related">
      {links.map((link) => (
        <Link key={link.to} to={link.to}>
          {link.label}
        </Link>
      ))}
    </div>
  );
}

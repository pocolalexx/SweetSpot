import { navItems } from '../data/site';

export function NavButtons() {
  return (
    <nav className="nav-buttons" aria-label="Navigare principală">
      {navItems.map((item) => (
        <a key={item.href} className="nav-button" href={item.href}>
          {item.label}
        </a>
      ))}
    </nav>
  );
}

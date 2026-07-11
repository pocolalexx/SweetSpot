import { locationInfo, socials } from '../data/site';

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-block">
        <p className="footer-title">Locație</p>
        <p className="footer-text">{locationInfo.address}</p>
        <p className="footer-text">{locationInfo.hours}</p>
        <a className="footer-link" href={locationInfo.mapUrl} target="_blank" rel="noreferrer">
          Vezi pe hartă
        </a>
      </div>
      <div className="footer-block">
        <p className="footer-title">Rețele sociale</p>
        <div className="footer-links">
          {socials.map((social) => (
            <a key={social.label} href={social.href} target="_blank" rel="noreferrer">
              {social.label}
            </a>
          ))}
        </div>
        <p className="footer-text footer-contact">Telefon: {locationInfo.phone}</p>
      </div>
    </footer>
  );
}

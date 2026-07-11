# SweetSpot

Starter pentru un site React + backend separat pentru meniu, conturi si fidelizare.

## Structura

- `client/` - aplicatia React
- `server/` - API-ul si stocarea JSON pentru meniu, conturi si fidelizare

## Ce scrii in fiecare loc

- `client/src/App.tsx` - layout-ul paginii: butoanele de navigare, logo-ul mare centrat, sectiunile pentru valori nutritionale, tricouri si blocul "app coming soon".
- `client/src/components/` - componente mici reutilizabile, cum ar fi footer-ul si butoanele din hero.
- `client/src/data/site.ts` - textele, linkurile si datele statice pentru site.
- `client/src/styles.css` - culori, fonturi, spatiere si aspectul general.
- `server/src/db.ts` - stocarea pentru meniu, useri, coduri de fidelitate si cumparaturi.
- `server/src/index.ts` - rutele API pentru meniu, autentificare si scanare fidelitate.

## API

- `GET /api/health` - verificare rapida a serverului.
- `GET /api/products` - lista meniului, inclusiv valorile nutritionale pentru fiecare produs.
- `POST /api/auth/sign-in` - creare cont (email, parola, confirmare parola) cu verificare anti-bot.
- `POST /api/auth/log-in` - autentificare cont (email, parola, confirmare parola) cu verificare anti-bot.
- `POST /api/loyalty/scan` - inregistreaza o cumparatura pentru codul de fidelitate scanat.

## Configurare frontend

- `VITE_API_BASE_URL` - optional, daca vrei sa schimbi adresa API-ului.
- Implicit frontend-ul foloseste `http://localhost:3001/api`.

## Flux cont si fidelitate

1. Utilizatorul apasa pe `Cont` in bara de sus.
2. Completeaza email, parola si confirmare parola in `Sign in` sau `Log in`.
3. Dupa autentificare primeste cod unic de fidelitate si QR scanabil.
4. La fiecare scanare in magazin, numarul de cumparaturi creste.
5. La pragul definit in backend (`REWARD_THRESHOLD`), utilizatorul devine eligibil pentru recompensa.

## Structura recomandata pe viitor

- `client/src/pages/` - daca vrei mai tarziu pagini separate pentru meniu, nutritionale si merch.
- `server/src/routes/` - daca vrei sa muti rutele dintr-un singur fisier in fisiere separate.
- `server/src/controllers/` - logica pentru comenzi, produse si admin.
- `server/src/models/` - schema si tipuri pentru datele din baza.

## Ce urmeaza

1. Instaleaza dependintele in `client` si `server`.
2. Porneste backend-ul pentru date.
3. Completeaza datele reale din `client/src/data/site.ts` (social, locatie, telefon).

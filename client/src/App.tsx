import { type FormEvent, useEffect, useState } from 'react';
import QRCode from 'qrcode';

import { Footer } from './components/Footer';
import { NavButtons } from './components/NavButtons';

type ProductKind = 'food' | 'apparel';

type Product = {
    id: number;
    name: string;
    category: string;
    description: string;
    price: number;
    kind: ProductKind;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    sizes?: string[];
    colors?: string[];
};

type ThemeMode = 'dark' | 'light';
type AccountMode = 'signIn' | 'logIn';
type CartItem = {
    cartId: string;
    productId: number;
    name: string;
    price: number;
    size: string;
};

type AccountUser = {
    email: string;
    username: string;
    loyaltyCode: string;
    purchaseCount: number;
    purchasesUntilReward: number;
    rewardUnlocked: boolean;
};

const apiBase = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api';

export default function App() {
    const [themeMode, setThemeMode] = useState<ThemeMode>('dark');
    const [accountOpen, setAccountOpen] = useState(false);
    const [accountMode, setAccountMode] = useState<AccountMode>('signIn');
    const [accountEmail, setAccountEmail] = useState('');
    const [accountUsername, setAccountUsername] = useState('');
    const [accountPassword, setAccountPassword] = useState('');
    const [accountConfirmPassword, setAccountConfirmPassword] = useState('');
    const [accountWebsite, setAccountWebsite] = useState('');
    const [accountStartedAt, setAccountStartedAt] = useState<number>(Date.now());
    const [accountLoading, setAccountLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [accountUser, setAccountUser] = useState<AccountUser | null>(() => {
        const saved = localStorage.getItem('sweetspot-account');
        return saved ? (JSON.parse(saved) as AccountUser) : null;
    });
    const [accountMessage, setAccountMessage] = useState('');
    const passwordChecks = {
        length: accountPassword.length >= 8,
        upper: /[A-Z]/.test(accountPassword),
        number: /[0-9]/.test(accountPassword),
        special: /[^A-Za-z0-9]/.test(accountPassword),
    };
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
    const [products, setProducts] = useState<Product[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [productsError, setProductsError] = useState('');
    const [selectedSizes, setSelectedSizes] = useState<Record<number, string>>({});
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [cartOpen, setCartOpen] = useState(false);
    const [addedMessage, setAddedMessage] = useState<Record<number, string>>({});

    useEffect(() => {
        const savedTheme = window.localStorage.getItem('sweetspot-theme');
        const initialTheme =
            savedTheme === 'light' || savedTheme === 'dark'
                ? savedTheme
                : window.matchMedia('(prefers-color-scheme: light)').matches
                    ? 'light'
                    : 'dark';

        setThemeMode(initialTheme);
        document.documentElement.dataset.theme = initialTheme;
    }, []);

    useEffect(() => {
        document.documentElement.dataset.theme = themeMode;
        window.localStorage.setItem('sweetspot-theme', themeMode);
    }, [themeMode]);

    useEffect(() => {
        const controller = new AbortController();

        async function loadProducts() {
            try {
                const response = await fetch(`${apiBase}/products`, { signal: controller.signal });

                if (!response.ok) {
                    throw new Error('Nu am putut incarca produsele.');
                }

                const data = (await response.json()) as Product[];
                setProducts(data);
            } catch (error) {
                if (error instanceof DOMException && error.name === 'AbortError') {
                    return;
                }

                setProductsError('Nu pot prelua produsele acum. Porneste serverul si incearca din nou.');
            } finally {
                setLoadingProducts(false);
            }
        }

        void loadProducts();

        return () => controller.abort();
    }, []);

    useEffect(() => {
        if (!accountUser?.loyaltyCode) {
            setQrCodeDataUrl('');
            return;
        }

        void QRCode.toDataURL(accountUser.loyaltyCode, {
            width: 220,
            margin: 1,
            color: {
                dark: themeMode === 'dark' ? '#f5f5f5' : '#111111',
                light: '#00000000',
            },
        }).then((url) => setQrCodeDataUrl(url));
    }, [accountUser?.loyaltyCode, themeMode]);

    useEffect(() => {
        if (accountUser) {
            localStorage.setItem('sweetspot-account', JSON.stringify(accountUser));
        } else {
            localStorage.removeItem('sweetspot-account');
        }
    }, [accountUser]);

    const nutritionItems = products.filter((product) => product.kind !== 'apparel');
    const apparelItems = products.filter((product) => product.kind === 'apparel');
    function selectSize(productId: number, size: string) {
        setSelectedSizes((current) => ({ ...current, [productId]: size }));
    }

    function addToCart(product: Product) {
        const size = selectedSizes[product.id] ?? product.sizes?.[0];
        if (!size) return;

        const cartItem: CartItem = {
            cartId: `${product.id}-${size}-${Date.now()}`,
            productId: product.id,
            name: product.name,
            price: product.price,
            size,
        };

        setCartItems((current) => [...current, cartItem]);
        setAddedMessage((current) => ({ ...current, [product.id]: `Adaugat in cos - marime ${size}` }));

        window.setTimeout(() => {
            setAddedMessage((current) => {
                const next = { ...current };
                delete next[product.id];
                return next;
            });
        }, 2500);
    }

    function removeFromCart(cartId: string) {
        setCartItems((current) => current.filter((item) => item.cartId !== cartId));
    }

    function openAccount(mode: AccountMode) {
        setAccountMode(mode);
        setAccountMessage('');
        setAccountOpen(true);
        setAccountStartedAt(Date.now());
    }

    function closeAccount() {
        setAccountOpen(false);
        setAccountLoading(false);
        setAccountMessage('');
        setAccountPassword('');
        setAccountConfirmPassword('');
        setAccountWebsite('');
    }

    function logOutAccount() {
        setAccountUser(null);
        setQrCodeDataUrl('');
        setAccountEmail('');
        setAccountMessage('');
        setAccountMode('signIn');
    }

    async function submitAccount(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setAccountMessage('');

        if (!accountEmail.trim() || !accountPassword.trim()) {
            setAccountMessage('Completeaza email si parola.');
            return;
        }

        if (accountMode === 'signIn') {
            if (!accountConfirmPassword.trim()) {
                setAccountMessage('Completeaza si confirmarea parolei.');
                return;
            }

            if (accountPassword !== accountConfirmPassword) {
                setAccountMessage('Parolele nu coincid.');
                return;
            }
        }

        setAccountLoading(true);

        try {
            const endpoint = accountMode === 'signIn' ? 'sign-in' : 'log-in';
            const response = await fetch(`${apiBase}/auth/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: accountEmail,
                    password: accountPassword,
                    confirmPassword: accountMode === 'signIn' ? accountConfirmPassword : accountPassword,
                    username: accountUsername,
                    website: accountWebsite,
                    startedAt: accountStartedAt,
                }),
            });

            const data = (await response.json()) as {
                message?: string;
                user?: AccountUser;
            };

            if (!response.ok || !data.user) {
                throw new Error(data.message ?? 'Nu am putut procesa cererea de cont.');
            }

            setAccountUser(data.user);
            setAccountMessage(data.message ?? 'Autentificare reusita.');
            setAccountWebsite('');
            setTimeout(() => {
                setAccountOpen(false);
            }, 1);
        } catch (error) {
            setAccountUser(null);
            setAccountMessage(error instanceof Error ? error.message : 'A aparut o eroare.');
        } finally {
            setAccountLoading(false);
        }
    }

    async function simulateLoyaltyScan() {
        if (!accountUser) {
            return;
        }

        setAccountLoading(true);
        setAccountMessage('');

        try {
            const response = await fetch(`${apiBase}/loyalty/scan`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ loyaltyCode: accountUser.loyaltyCode }),
            });

            const data = (await response.json()) as {
                message?: string;
                rewardMessage?: string;
                user?: AccountUser;
            };

            if (!response.ok || !data.user) {
                throw new Error(data.message ?? 'Nu am putut procesa scanarea.');
            }

            setAccountUser(data.user);
            setAccountMessage(data.rewardMessage ?? 'Scanare reusita.');
        } catch (error) {
            setAccountMessage(error instanceof Error ? error.message : 'A aparut o eroare la scanare.');
        } finally {
            setAccountLoading(false);
        }
    }

    return (
        <div className="page-shell">
            <header className="top-bar" aria-label="Bara de sus">
                <button
                    type="button"
                    className="theme-toggle"
                    onClick={() => setThemeMode((current) => (current === 'dark' ? 'light' : 'dark'))}
                    aria-label={themeMode === 'dark' ? 'Schimba tema in light' : 'Schimba tema in dark'}
                    title={themeMode === 'dark' ? 'Schimba in light' : 'Schimba in dark'}
                >
                    {themeMode === 'dark' ? (
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                            <path d="M12 18a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0v-2a1 1 0 0 1 1-1Zm0-16a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1Zm8 8a1 1 0 0 1 1 1 1 1 0 1 1-2 0 1 1 0 0 1 1-1ZM5 12a1 1 0 0 1 1 1 1 1 0 1 1-2 0 1 1 0 0 1 1-1Zm13.657-7.657a1 1 0 0 1 1.414 0 1 1 0 1 1-1.414 1.414 1 1 0 0 1 0-1.414ZM6.343 17.657a1 1 0 0 1 1.414 0 1 1 0 1 1-1.414 1.414 1 1 0 0 1 0-1.414Zm12.728 0a1 1 0 0 1 0 1.414 1 1 0 1 1-1.414-1.414 1 1 0 0 1 1.414 0ZM7.757 6.343a1 1 0 0 1 0 1.414 1 1 0 1 1-1.414-1.414 1 1 0 0 1 1.414 0ZM12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z" />
                        </svg>
                    ) : (
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                            <path d="M21.75 14.25A8.73 8.73 0 0 1 12 22a10 10 0 1 1 0-20 8.73 8.73 0 0 0 9.75 12.25ZM10 4.2A8 8 0 0 0 12 20a8.72 8.72 0 0 1 0-16 8 8 0 0 0-2-1.8Z" />
                        </svg>
                    )}
                </button>

                <div className="top-actions" aria-label="Cont si cos">
                    <button type="button" className="top-action-button" onClick={() => openAccount('signIn')}>
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                            <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z" />
                        </svg>
                        <span>Cont</span>
                    </button>

                    <button type="button" className="top-action-button" onClick={() => setCartOpen(true)}>
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                            <path d="M7 18a2 2 0 1 0 2 2 2 2 0 0 0-2-2Zm10 0a2 2 0 1 0 2 2 2 2 0 0 0-2-2ZM6.2 6l.3 2h11.7a1 1 0 0 1 1 1.2l-1 5A1 1 0 0 1 17.2 15H8.1a1 1 0 0 1-1-.8L5.3 4H2V2h4.1a1 1 0 0 1 1 .8L7.4 5h13.1v2Z" />
                        </svg>
                        <span>Cos{cartItems.length > 0 ? ` (${cartItems.length})` : ''}</span>
                    </button>
                </div>
            </header>

            {accountOpen ? (
                <section className="account-overlay" role="dialog" aria-modal="true" aria-label="Cont">
                    <div className="account-panel">
                        <div className="account-header">
                            <div>
                                <p className="panel-label">Cont</p>
                                <h2>
                                    {accountUser
                                        ? `Salut, ${accountUser.username}! Cinnamon roll-ul te asteapta.`
                                        : accountMode === 'signIn'
                                            ? 'Sign in'
                                            : 'Log in'}
                                </h2>
                            </div>
                            <button type="button" className="account-close" onClick={closeAccount}>
                                Inchide
                            </button>
                        </div>

                        <p className="account-text">
                            {accountUser
                                ? 'Contul tau de fidelitate SweetSpot.'
                                : 'Foloseste email + parola + confirmare parola. Contul primeste cod de fidelitate scanabil.'}
                        </p>
                        {!accountUser && (
                            <>
                                <div className="account-tabs" role="tablist" aria-label="Mod autentificare">
                                    <button
                                        type="button"
                                        className={`account-tab ${accountMode === 'signIn' ? 'active' : ''}`}
                                        onClick={() => {
                                            setAccountMode('signIn');
                                            setAccountMessage('');
                                            setAccountStartedAt(Date.now());
                                        }}
                                    >
                                        Sign in
                                    </button>
                                    <button
                                        type="button"
                                        className={`account-tab ${accountMode === 'logIn' ? 'active' : ''}`}
                                        onClick={() => {
                                            setAccountMode('logIn');
                                            setAccountMessage('');
                                            setAccountStartedAt(Date.now());
                                        }}
                                    >
                                        Log in
                                    </button>
                                </div>
                                <form className="account-form" onSubmit={submitAccount}>
                                    {accountMode === 'signIn' && (
                                        <label>
                                            Username
                                            <input
                                                type="text"
                                                value={accountUsername}
                                                onChange={(event) => setAccountUsername(event.target.value)}
                                                placeholder="Numele tau"
                                                required
                                            />
                                        </label>
                                    )}
                                    <label>
                                        Email
                                        <input
                                            type="email"
                                            value={accountEmail}
                                            onChange={(event) => setAccountEmail(event.target.value)}
                                            placeholder="nume@email.com"
                                            required
                                        />
                                    </label>

                                    <label>
                                        Parola
                                        <div className="password-field">
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                value={accountPassword}
                                                onChange={(event) => setAccountPassword(event.target.value)}
                                                placeholder="Parola ta"
                                                required
                                            />
                                            <button
                                                type="button"
                                                className="password-toggle"
                                                onClick={() => setShowPassword((current) => !current)}
                                                aria-label={showPassword ? 'Ascunde parola' : 'Arata parola'}
                                                tabIndex={-1}
                                            >
                                                {showPassword ? (
                                                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                                        <path d="M3 3l18 18M10.58 10.58a2 2 0 0 0 2.83 2.83M9.88 4.24A9.4 9.4 0 0 1 12 4c5 0 9 4 10 8a13 13 0 0 1-3.17 4.9M6.6 6.6C4.32 8.1 2.6 10.36 2 12c.87 2.36 2.8 4.5 5.3 6M14.12 14.12A4 4 0 0 1 9.88 9.88" />
                                                    </svg>
                                                ) : (
                                                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                                        <path d="M2 12s3.5-8 10-8 10 8 10 8-3.5 8-10 8-10-8-10-8Z" />
                                                        <circle cx="12" cy="12" r="3" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                        {accountMode === 'signIn' && (
                                            <ul className="password-requirements">
                                                <li className={passwordChecks.length ? 'met' : ''}>Minim 8 caractere</li>
                                                <li className={passwordChecks.upper ? 'met' : ''}>Minim o litera mare</li>
                                                <li className={passwordChecks.number ? 'met' : ''}>Minim o cifra</li>
                                                <li className={passwordChecks.special ? 'met' : ''}>Minim un caracter special</li>
                                            </ul>
                                        )}
                                    </label>

                                    {accountMode === 'signIn' && (
                                        <label>
                                            Confirmare parola
                                            <div className="password-field">
                                                <input
                                                    type={showConfirmPassword ? 'text' : 'password'}
                                                    value={accountConfirmPassword}
                                                    onChange={(event) => setAccountConfirmPassword(event.target.value)}
                                                    placeholder="Repeta parola"
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    className="password-toggle"
                                                    onClick={() => setShowConfirmPassword((current) => !current)}
                                                    aria-label={showConfirmPassword ? 'Ascunde parola' : 'Arata parola'}
                                                    tabIndex={-1}
                                                >
                                                    {showConfirmPassword ? (
                                                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                                            <path d="M3 3l18 18M10.58 10.58a2 2 0 0 0 2.83 2.83M9.88 4.24A9.4 9.4 0 0 1 12 4c5 0 9 4 10 8a13 13 0 0 1-3.17 4.9M6.6 6.6C4.32 8.1 2.6 10.36 2 12c.87 2.36 2.8 4.5 5.3 6M14.12 14.12A4 4 0 0 1 9.88 9.88" />
                                                        </svg>
                                                    ) : (
                                                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                                            <path d="M2 12s3.5-8 10-8 10 8 10 8-3.5 8-10 8-10-8-10-8Z" />
                                                            <circle cx="12" cy="12" r="3" />
                                                        </svg>
                                                    )}
                                                </button>
                                            </div>
                                        </label>
                                    )}

                                    <label className="account-honeypot" aria-hidden="true">
                                        Website
                                        <input
                                            tabIndex={-1}
                                            autoComplete="off"
                                            value={accountWebsite}
                                            onChange={(event) => setAccountWebsite(event.target.value)}
                                        />
                                    </label>

                                    <button type="submit" className="account-submit" disabled={accountLoading}>
                                        {accountLoading ? 'Se proceseaza...' : accountMode === 'signIn' ? 'Creeaza cont' : 'Autentifica-te'}
                                    </button>
                                </form>
                            </>
                        )}

                        {accountUser ? (
                            <div className="loyalty-card" aria-label="Card de fidelitate">
                                <div>
                                    <p className="panel-label">Cod fidelitate</p>
                                    <h3>{accountUser.loyaltyCode}</h3>
                                    <p className="account-text">Email: {accountUser.email}</p>
                                    <p className="account-text">
                                        Cumparaturi: {accountUser.purchaseCount}.{' '}
                                        {accountUser.rewardUnlocked
                                            ? 'Ai recompensa disponibila.'
                                            : `Mai ai ${accountUser.purchasesUntilReward} pana la recompensa.`}
                                    </p>
                                </div>

                                {qrCodeDataUrl ? <img src={qrCodeDataUrl} alt="Cod QR fidelitate" /> : null}

                                <button
                                    type="button"
                                    className="account-scan"
                                    onClick={simulateLoyaltyScan}
                                    disabled={accountLoading}
                                >
                                    Simuleaza scanare in magazin
                                </button>
                                <button type="button" className="account-logout" onClick={logOutAccount}>
                                    Delogare
                                </button>
                            </div>
                        ) : null}

                        {accountMessage ? <p className="account-message">{accountMessage}</p> : null}
                    </div>
                </section>
            ) : null}
            {cartOpen ? (
                <section className="account-overlay" role="dialog" aria-modal="true" aria-label="Cos">
                    <div className="account-panel">
                        <div className="account-header">
                            <div>
                                <p className="panel-label">Cos</p>
                                <h2>
                                    {cartItems.length === 0
                                        ? 'Cosul tau este gol'
                                        : `${cartItems.length} produs${cartItems.length === 1 ? '' : 'e'} in cos`}
                                </h2>
                            </div>
                            <button type="button" className="account-close" onClick={() => setCartOpen(false)}>
                                Inchide
                            </button>
                        </div>

                        {cartItems.length === 0 ? (
                            <p className="account-text">
                                Alege o marime la Tricou SweetSpot si apasa "Adauga in cos" ca sa il vezi aici.
                            </p>
                        ) : (
                            <div className="nutrition-list">
                                {cartItems.map((item) => (
                                    <article key={item.cartId} className="nutrition-card">
                                        <div>
                                            <p className="product-category">{item.name}</p>
                                            <h3>Marime {item.size}</h3>
                                        </div>
                                        <p>{item.price} lei</p>
                                        <button
                                            type="button"
                                            className="cart-remove"
                                            onClick={() => removeFromCart(item.cartId)}
                                        >
                                            Elimina
                                        </button>
                                    </article>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            ) : null}
            <main className="page">
                <section className="hero">
                    <div className="hero-wordmark" aria-label="Logo Sweet Spot">
                        <span>Sweet Spot</span>
                    </div>
                    <p className="subtitle">
                        Un site simplu, clar si usor de extins cu meniu, valori nutritionale si cont de fidelitate.
                    </p>

                    <NavButtons />
                </section>

                <section className="panel products-panel" id="menu">
                    <div className="section-heading">
                        <p className="panel-label">Meniu</p>
                        <h2>Meniul disponibil acum</h2>
                    </div>

                    {loadingProducts ? (
                        <p className="muted-copy">Se incarca meniul...</p>
                    ) : productsError ? (
                        <p className="error-copy">{productsError}</p>
                    ) : (
                        <div className="products-grid">
                            {products.map((product) => (
                                <article key={product.id} className="product-card">
                                    <div>
                                        <p className="product-category">{product.category}</p>
                                        <h3>{product.name}</h3>
                                    </div>
                                    <p>{product.description}</p>
                                    <strong>{product.price} lei</strong>
                                </article>
                            ))}
                        </div>
                    )}
                </section>

                <section className="info-grid">
                    <article className="panel" id="nutrition">
                        <p className="panel-label">Valori nutritionale</p>
                        <h2>Calorii, proteine si ingrediente</h2>
                        {loadingProducts ? (
                            <p className="muted-copy">Se incarca valorile nutritionale...</p>
                        ) : productsError ? (
                            <p className="error-copy">{productsError}</p>
                        ) : (
                            <div className="nutrition-list">
                                {nutritionItems.map((item) =>
                                    item.kind === 'apparel' ? (
                                        <article key={item.id} className="nutrition-card">
                                            <div>
                                                <p className="product-category">{item.name}</p>
                                                <h3>{(item.sizes ?? []).join(' / ') || 'Marime unica'}</h3>
                                            </div>
                                            <p>
                                                Culori disponibile: {(item.colors ?? []).join(', ') || 'N/A'}
                                            </p>
                                        </article>
                                    ) : (
                                        <article key={item.id} className="nutrition-card">
                                            <div>
                                                <p className="product-category">{item.name}</p>
                                                <h3>{item.calories} kcal</h3>
                                            </div>
                                            <p>
                                                Proteine {item.protein}g - Carbohidrati {item.carbs}g - Grasimi {item.fat}g
                                            </p>
                                        </article>
                                    ),
                                )}
                            </div>
                        )}
                    </article>

                    <article className="panel" id="merch">
                        <p className="panel-label">Tricouri personalizate</p>
                        <h2>Designuri simple sau la comanda</h2>
                        {apparelItems.length === 0 ? (
                            <p>Aici ar merge poze, marimi, culori si un buton de cerere oferta.</p>
                        ) : (
                            <div className="nutrition-list">
                                {apparelItems.map((item) => {
                                    const sizes = item.sizes ?? [];
                                    const activeSize = selectedSizes[item.id] ?? sizes[0] ?? '';

                                    return (
                                        <article key={item.id} className="nutrition-card">
                                            <div>
                                                <p className="product-category">{item.name}</p>
                                                <h3>{item.price} lei</h3>
                                            </div>

                                            {sizes.length > 0 && (
                                                <div
                                                    className="size-selector"
                                                    role="group"
                                                    aria-label={`Alege marimea pentru ${item.name}`}
                                                >
                                                    {sizes.map((size) => (
                                                        <button
                                                            key={size}
                                                            type="button"
                                                            className={`size-button ${activeSize === size ? 'active' : ''}`}
                                                            onClick={() => selectSize(item.id, size)}
                                                        >
                                                            {size}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            <p>Culori disponibile: {(item.colors ?? []).join(', ') || 'N/A'}</p>

                                            <button type="button" className="account-submit" onClick={() => addToCart(item)}>
                                                Adauga in cos
                                            </button>

                                            {addedMessage[item.id] ? (
                                                <p className="account-text">{addedMessage[item.id]}</p>
                                            ) : null}
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </article>
                </section>

                <section className="coming-soon">
                    <p className="panel-label">App</p>
                    <h2>App coming soon</h2>
                    <p>Il pastram inainte de footer ca sa arate ca o faza urmatoare.</p>
                </section>
            </main>

            <Footer />
        </div>
    );
}

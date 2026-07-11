import cors from 'cors';
import express from 'express';
import { getProducts, loginUser, registerLoyaltyScan, registerUser } from './db.js';

type RateBucket = {
  count: number;
  resetAt: number;
};

const rateBuckets = new Map<string, RateBucket>();

function clientIp(req: express.Request) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }

  return req.ip ?? 'unknown';
}

function consumeRate(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = rateBuckets.get(key);

  if (!current || current.resetAt < now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  if (current.count >= limit) {
    return true;
  }

  current.count += 1;
  return false;
}

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/products', (_req, res) => {
  res.json(getProducts());
});

app.post('/api/auth/sign-in', (req, res) => {
  const ip = clientIp(req);
  if (consumeRate(`sign-in:${ip}`, 6, 10 * 60_000)) {
    return res.status(429).json({ message: 'Prea multe încercări. Încearcă mai târziu.' });
  }

  const {
    email = '',
    password = '',
    confirmPassword = '',
    username = '',
    website = '',
    startedAt = 0,
  } = req.body as {
    email?: string;
    password?: string;
    confirmPassword?: string;
    username?: string;
    website?: string;
    startedAt?: number;
  };

  if (typeof website === 'string' && website.trim().length > 0) {
    return res.status(400).json({ message: 'Cerere invalidă.' });
  }

  if (typeof startedAt === 'number' && Date.now() - startedAt < 2_000) {
    return res.status(400).json({ message: 'Verificare anti-bot activă. Încearcă din nou.' });
  }

  if (!email.trim() || !password.trim() || !confirmPassword.trim() || !username.trim()) {
    return res.status(400).json({ message: 'Completează toate câmpurile.' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Parolele nu coincid.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: 'Parola trebuie să aibă minim 8 caractere.' });
  }

  const user = registerUser({ email, password, username });
  if (!user) {
    return res.status(409).json({ message: 'Există deja un cont cu acest email.' });
  }

  return res.status(201).json({
    message: 'Cont creat cu succes.',
    user,
  });
});

app.post('/api/auth/log-in', (req, res) => {
  const ip = clientIp(req);
  if (consumeRate(`log-in:${ip}`, 10, 10 * 60_000)) {
    return res.status(429).json({ message: 'Prea multe încercări. Încearcă mai târziu.' });
  }

  const {
    email = '',
    password = '',
    confirmPassword = '',
    website = '',
    startedAt = 0,
  } = req.body as {
    email?: string;
    password?: string;
    confirmPassword?: string;
    website?: string;
    startedAt?: number;
  };

  if (typeof website === 'string' && website.trim().length > 0) {
    return res.status(400).json({ message: 'Cerere invalidă.' });
  }

  if (typeof startedAt === 'number' && Date.now() - startedAt < 1_500) {
    return res.status(400).json({ message: 'Verificare anti-bot activă. Încearcă din nou.' });
  }

  if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
    return res.status(400).json({ message: 'Completează toate câmpurile.' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Parolele nu coincid.' });
  }

  const user = loginUser({ email, password });
  if (!user) {
    return res.status(401).json({ message: 'Email sau parolă incorecte.' });
  }

  return res.status(200).json({
    message: 'Autentificare reușită.',
    user,
  });
});

app.post('/api/loyalty/scan', (req, res) => {
  const ip = clientIp(req);
  if (consumeRate(`scan:${ip}`, 20, 5 * 60_000)) {
    return res.status(429).json({ message: 'Prea multe scanări. Încearcă mai târziu.' });
  }

  const { loyaltyCode = '' } = req.body as { loyaltyCode?: string };
  if (!loyaltyCode.trim()) {
    return res.status(400).json({ message: 'Codul de fidelitate este obligatoriu.' });
  }

  const user = registerLoyaltyScan(loyaltyCode);
  if (!user) {
    return res.status(404).json({ message: 'Cod de fidelitate invalid.' });
  }

  const rewardMessage = user.rewardUnlocked
    ? 'Felicitări! Ai atins pragul de recompensă.'
    : `Încă ${user.purchasesUntilReward} cumpărături până la recompensă.`;

  return res.status(200).json({ user, rewardMessage });
});

app.listen(3001, () => {
  console.log('Server running on http://localhost:3001');
});

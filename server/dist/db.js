import fs from 'node:fs';
import path from 'node:path';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
export const REWARD_THRESHOLD = 8;
const dataDirectory = path.resolve(process.cwd(), 'data');
const dataFilePath = path.join(dataDirectory, 'sweetspot-db.json');
const defaultStore = {
    products: [
        {
            id: 1,
            name: 'Classic Cinnamon Roll',
            category: 'Cinnamon rolls',
            description: 'Rulada clasica cu crema fina si glazura calda.',
            price: 18,
            calories: 410,
            protein: 8,
            carbs: 54,
            fat: 16,
        },
        {
            id: 2,
            name: 'Protein Shake Vanilie',
            category: 'Shake-uri',
            description: 'Shake cremos cu proteina si gust de vanilie.',
            price: 22,
            calories: 260,
            protein: 28,
            carbs: 18,
            fat: 7,
        },
        {
            id: 3,
            name: 'Tricou SweetSpot',
            category: 'Merch',
            description: 'Tricou personalizat pentru brand sau comanda speciala.',
            price: 79,
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
        },
    ],
    users: [],
};
function ensureDataFile() {
    if (!fs.existsSync(dataDirectory)) {
        fs.mkdirSync(dataDirectory, { recursive: true });
    }
    if (!fs.existsSync(dataFilePath)) {
        fs.writeFileSync(dataFilePath, JSON.stringify(defaultStore, null, 2), 'utf8');
    }
}
function readStore() {
    ensureDataFile();
    const rawContent = fs.readFileSync(dataFilePath, 'utf8');
    return normalizeStore(JSON.parse(rawContent));
}
function writeStore(store) {
    fs.writeFileSync(dataFilePath, JSON.stringify(store, null, 2), 'utf8');
}
function normalizeStore(input) {
    const parsed = input;
    const products = Array.isArray(parsed?.products) ? parsed.products : defaultStore.products;
    const users = Array.isArray(parsed?.users) ? parsed.users : [];
    return {
        products: products.map((product, index) => ({
            ...product,
            id: product.id ?? index + 1,
            calories: product.calories ?? 0,
            protein: product.protein ?? 0,
            carbs: product.carbs ?? 0,
            fat: product.fat ?? 0,
        })),
        users,
    };
}
function rewardUnlocked(purchaseCount) {
    return purchaseCount > 0 && purchaseCount % REWARD_THRESHOLD === 0;
}
function purchasesUntilReward(purchaseCount) {
    const remainder = purchaseCount % REWARD_THRESHOLD;
    return remainder === 0 ? 0 : REWARD_THRESHOLD - remainder;
}
function toPublicUser(user) {
    return {
        email: user.email,
        loyaltyCode: user.loyaltyCode,
        purchaseCount: user.purchaseCount,
        purchasesUntilReward: purchasesUntilReward(user.purchaseCount),
        rewardUnlocked: rewardUnlocked(user.purchaseCount),
    };
}
function hashPassword(password, salt = randomBytes(16).toString('hex')) {
    const hash = scryptSync(password, salt, 64).toString('hex');
    return { hash, salt };
}
function verifyPassword(password, salt, hash) {
    const candidateHash = scryptSync(password, salt, 64).toString('hex');
    return timingSafeEqual(Buffer.from(candidateHash, 'hex'), Buffer.from(hash, 'hex'));
}
function uniqueLoyaltyCode(existing) {
    let code = `SS-${randomBytes(4).toString('hex').toUpperCase()}`;
    while (existing.has(code)) {
        code = `SS-${randomBytes(4).toString('hex').toUpperCase()}`;
    }
    return code;
}
export function getProducts() {
    return readStore().products;
}
export function registerUser(input) {
    const store = readStore();
    const normalizedEmail = input.email.trim().toLowerCase();
    const emailTaken = store.users.some((user) => user.email === normalizedEmail);
    if (emailTaken) {
        return null;
    }
    const nextId = store.users.length > 0 ? Math.max(...store.users.map((user) => user.id)) + 1 : 1;
    const { hash, salt } = hashPassword(input.password);
    const loyaltyCode = uniqueLoyaltyCode(new Set(store.users.map((user) => user.loyaltyCode)));
    const now = new Date().toISOString();
    const user = {
        id: nextId,
        email: normalizedEmail,
        passwordHash: hash,
        passwordSalt: salt,
        loyaltyCode,
        purchaseCount: 0,
        createdAt: now,
        lastSeenAt: now,
    };
    store.users.push(user);
    writeStore(store);
    return toPublicUser(user);
}
export function loginUser(input) {
    const store = readStore();
    const normalizedEmail = input.email.trim().toLowerCase();
    const user = store.users.find((item) => item.email === normalizedEmail);
    if (!user) {
        return null;
    }
    if (!verifyPassword(input.password, user.passwordSalt, user.passwordHash)) {
        return null;
    }
    user.lastSeenAt = new Date().toISOString();
    writeStore(store);
    return toPublicUser(user);
}
export function registerLoyaltyScan(loyaltyCode) {
    const store = readStore();
    const user = store.users.find((item) => item.loyaltyCode === loyaltyCode.trim().toUpperCase());
    if (!user) {
        return null;
    }
    user.purchaseCount += 1;
    user.lastSeenAt = new Date().toISOString();
    writeStore(store);
    return toPublicUser(user);
}

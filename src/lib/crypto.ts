import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
    const key = process.env.ASAAS_ENCRYPTION_KEY;
    if (!key || key.length !== 64) {
        throw new Error(
            'ASAAS_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ' +
            'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
        );
    }
    return Buffer.from(key, 'hex');
}

export function encrypt(plaintext: string): { encrypted: string; iv: string } {
    const key = getEncryptionKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');

    return {
        encrypted: encrypted + ':' + authTag,
        iv: iv.toString('hex'),
    };
}

export function decrypt(encrypted: string, iv: string): string {
    const key = getEncryptionKey();
    const [encryptedData, authTag] = encrypted.split(':');

    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'), {
        authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

export function hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}

export function generateToken(bytes = 32): string {
    return randomBytes(bytes).toString('hex');
}

export function getLast4(value: string): string {
    return value.slice(-4);
}

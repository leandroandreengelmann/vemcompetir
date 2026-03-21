/**
 * Generates a short, readable, unique registration code.
 * Format: 6 random uppercase alphanumeric characters
 * Example: A3F7B2
 */
export function generateRegistrationCode(_eventTitle?: string, _year?: number): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    const array = new Uint8Array(6);
    crypto.getRandomValues(array);
    for (let i = 0; i < 6; i++) {
        code += chars[array[i] % chars.length];
    }
    return code;
}

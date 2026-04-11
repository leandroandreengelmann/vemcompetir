/**
 * Normaliza telefone brasileiro para o formato esperado pela Z-API.
 *
 * Formato: 55 + DDD + número (com o 9° dígito quando presente).
 * A Z-API faz a validação/roteamento internamente — não devemos
 * remover o 9° dígito manualmente.
 *
 * Exemplos:
 *   "11999887766"      → "5511999887766"
 *   "5511999887766"    → "5511999887766"
 *   "+55 (11) 99988-7766" → "5511999887766"
 */
export function normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('55') && digits.length >= 12) return digits;
    return `55${digits}`;
}

// src/services/normalizePhone.ts
/**
 * Normalize a US phone number into +1XXXXXXXXXX format.
 * Very basic, assumes US numbers.
 */
export function normalizeUSPhone(raw) {
    if (!raw)
        return null;
    const digits = raw.replace(/\D/g, "");
    if (!digits)
        return null;
    // If it already includes country code
    if (digits.length === 11 && digits.startsWith("1")) {
        return `+${digits}`;
    }
    // Assume US 10-digit number
    if (digits.length === 10) {
        return `+1${digits}`;
    }
    // Anything else – return null so we don't send to garbage
    return null;
}

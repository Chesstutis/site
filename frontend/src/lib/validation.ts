export async function validate_chess_com_username(uname: string): Promise<boolean> {
    const normalizedUsername = uname.trim();

    if (!normalizedUsername) {
        return false;
    }

    const response = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(normalizedUsername)}`);

    if (response.ok) {
        return true;
    }

    if (response.status === 404 || response.status === 410) {
        return false;
    }

    throw new Error(
        `Unable to verify Chess.com username (${response.status})`
    );
}

export function validate_email(email: string): boolean {
    // [RFC 5321] https://datatracker.ietf.org/doc/html/rfc5321
    const MAX_EMAIL_LENGTH = 254;
    const isInvalidInput =
        !email || email.length === 0 || email.length > MAX_EMAIL_LENGTH;

    if (isInvalidInput) return false;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
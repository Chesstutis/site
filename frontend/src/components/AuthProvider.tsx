import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";
import { jwtDecode } from "jwt-decode";
import type {
    AuthContextValue,
    AuthPath,
    AuthProviderProps,
    AuthResponse,
    AuthSession,
    AuthStatus,
    AuthUser,
    StoredAuthSession,
    loginReq,
    signupReq,
} from "@/types/auth";

const STORAGE_KEY = "chesstutis.auth.v1";

const AuthContext = createContext<AuthContextValue | null>(null);

function getTokenExpiration(token: string): number | null {
    try {
        const { exp } = jwtDecode(token);
        return typeof exp === "number" ? exp * 1000 : null;
    } catch {
        return null;
    }
}

function isAuthUser(value: unknown): value is AuthUser {
    if (!value || typeof value !== "object") return false;

    const user = value as Record<string, unknown>;
    return (
        typeof user.id === "number" &&
        typeof user.email === "string" &&
        typeof user.chess_com_username === "string" &&
        typeof user.created_at === "string" &&
        typeof user.updated_at === "string"
    );
}

function readStoredSession(): AuthSession | null {
    try {
        const storedValue = localStorage.getItem(STORAGE_KEY);
        if (!storedValue) return null;

        const stored = JSON.parse(storedValue) as Partial<StoredAuthSession>;
        const expiration =
            typeof stored.token === "string"
                ? getTokenExpiration(stored.token)
                : null;

        if (
            stored.version !== 1 ||
            !isAuthUser(stored.user) ||
            typeof stored.token !== "string" ||
            expiration === null ||
            expiration <= Date.now()
        ) {
            localStorage.removeItem(STORAGE_KEY);
            return null;
        }

        return { user: stored.user, token: stored.token };
    } catch {
        localStorage.removeItem(STORAGE_KEY);
        return null;
    }
}

async function authenticate(
    path: AuthPath,
    credentials: loginReq | signupReq,
): Promise<AuthResponse> {
    const response = await fetch(`/api/auth${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
    });

    if (!response.ok) {
        const message = (await response.text()).trim();
        throw new Error(message || "Authentication failed");
    }

    return response.json() as Promise<AuthResponse>;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [status, setStatus] = useState<AuthStatus>("initializing");
    const [session, setSession] = useState<AuthSession | null>(null);

    const clearSession = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY);
        setSession(null);
        setStatus("unauthenticated");
    }, []);

    const saveSession = useCallback((response: AuthResponse) => {
        const { token, ...user } = response;
        const nextSession = { user, token };
        const storedSession: StoredAuthSession = {
            version: 1,
            ...nextSession,
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(storedSession));
        setSession(nextSession);
        setStatus("authenticated");
    }, []);

    useEffect(() => {
        const storedSession = readStoredSession();
        setSession(storedSession);
        setStatus(storedSession ? "authenticated" : "unauthenticated");

        const handleStorage = (event: StorageEvent) => {
            if (event.key !== STORAGE_KEY) return;

            const nextSession = readStoredSession();
            setSession(nextSession);
            setStatus(nextSession ? "authenticated" : "unauthenticated");
        };

        window.addEventListener("storage", handleStorage);
        return () => window.removeEventListener("storage", handleStorage);
    }, []);

    useEffect(() => {
        if (!session) return;

        const expiration = getTokenExpiration(session.token);
        if (expiration === null || expiration <= Date.now()) {
            clearSession();
            return;
        }

        const timeout = window.setTimeout(clearSession, expiration - Date.now());
        return () => window.clearTimeout(timeout);
    }, [clearSession, session]);

    const login = useCallback(
        async (credentials: loginReq) => {
            saveSession(await authenticate("/login", credentials));
        },
        [saveSession],
    );

    const signup = useCallback(
        async (credentials: signupReq) => {
            saveSession(await authenticate("/signup", credentials));
        },
        [saveSession],
    );

    const logout = useCallback(async () => {
        const token = session?.token;
        clearSession();

        if (!token) return;

        try {
            await fetch("/api/auth/logout", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });
        } catch {
            // Local logout succeeds even when the server cannot be reached.
        }
    }, [clearSession, session]);

    return (
        <AuthContext.Provider
            value={{
                status,
                user: session?.user ?? null,
                token: session?.token ?? null,
                login,
                signup,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth must be used inside AuthProvider");
    }

    return context;
}

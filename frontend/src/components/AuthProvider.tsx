import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
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
    RefreshResponse,
    StoredAuthSession,
    loginReq,
    signupReq,
} from "@/types/auth";

const STORAGE_KEY = "chesstutis.auth.v1";
const REFRESH_BEFORE_EXPIRY_MS = 60_000;

const AuthContext = createContext<AuthContextValue | null>(null);

function getTokenExpiration(token: string): number | null {
    try {
        const { exp } = jwtDecode(token);
        return typeof exp === "number" ? exp * 1000 : null;
    } catch {
        return null;
    }
}

function parseAuthUser(value: unknown): AuthUser | null {
    if (!value || typeof value !== "object") return null;

    const user = value as Record<string, unknown>;
    if (!(
        typeof user.id === "number" &&
        typeof user.email === "string" &&
        typeof user.chess_com_username === "string" &&
        typeof user.created_at === "string" &&
        typeof user.updated_at === "string"
    )) {
        return null;
    }

    return {
        id: user.id,
        email: user.email,
        chess_com_username: user.chess_com_username,
        created_at: user.created_at,
        updated_at: user.updated_at,
    };
}

function readStoredSession(): AuthSession | null {
    try {
        const storedValue = localStorage.getItem(STORAGE_KEY);
        if (!storedValue) return null;

        const stored = JSON.parse(storedValue) as Record<string, unknown>;
        const storedUser = stored.user as Record<string, unknown> | undefined;
        const user = parseAuthUser(storedUser);
        const refreshToken =
            stored.version === 1
                ? storedUser?.refresh_token
                : stored.refresh_token;
        const expiration =
            typeof stored.token === "string"
                ? getTokenExpiration(stored.token)
                : null;

        if (
            (stored.version !== 1 && stored.version !== 2) ||
            !user ||
            typeof stored.token !== "string" ||
            typeof refreshToken !== "string" ||
            expiration === null
        ) {
            localStorage.removeItem(STORAGE_KEY);
            return null;
        }

        const session = {
            user,
            token: stored.token,
            refresh_token: refreshToken,
        };

        if (stored.version === 1) {
            const migratedSession: StoredAuthSession = {
                version: 2,
                ...session,
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedSession));
        }

        return session;
    } catch {
        localStorage.removeItem(STORAGE_KEY);
        return null;
    }
}

async function refreshTokens(refreshToken: string): Promise<RefreshResponse> {
    const response = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { Authorization: `Bearer ${refreshToken}` },
    });

    if (!response.ok) {
        throw new Error("Session refresh failed");
    }

    const refreshed = await response.json() as Partial<RefreshResponse>;
    if (
        typeof refreshed.token !== "string" ||
        typeof refreshed.refresh_token !== "string"
    ) {
        throw new Error("Session refresh response was invalid");
    }

    return {
        token: refreshed.token,
        refresh_token: refreshed.refresh_token,
    };
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
    const sessionRef = useRef<AuthSession | null>(null);

    const persistSession = useCallback((nextSession: AuthSession) => {
        const storedSession: StoredAuthSession = {
            version: 2,
            ...nextSession,
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(storedSession));
        sessionRef.current = nextSession;
        setSession(nextSession);
        setStatus("authenticated");
    }, []);

    const clearSession = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY);
        sessionRef.current = null;
        setSession(null);
        setStatus("unauthenticated");
    }, []);

    const saveSession = useCallback((response: AuthResponse) => {
        const { token, refresh_token, ...responseUser } = response;
        const user = parseAuthUser(responseUser);
        if (!user || typeof token !== "string" || typeof refresh_token !== "string") {
            throw new Error("Authentication response was invalid");
        }
        persistSession({ user, token, refresh_token });
    }, [persistSession]);

    const refreshSession = useCallback(async () => {
        const sessionAtStart = sessionRef.current;
        if (!sessionAtStart) return;

        const performRefresh = async () => {
            const latestSession = readStoredSession();
            if (!latestSession) {
                clearSession();
                return;
            }

            if (latestSession.refresh_token !== sessionAtStart.refresh_token) {
                sessionRef.current = latestSession;
                setSession(latestSession);
                setStatus("authenticated");
                return;
            }

            const refreshed = await refreshTokens(latestSession.refresh_token);
            persistSession({
                ...latestSession,
                token: refreshed.token,
                refresh_token: refreshed.refresh_token,
            });
        };

        try {
            if (navigator.locks) {
                await navigator.locks.request(
                    "chesstutis-auth-refresh",
                    { mode: "exclusive" },
                    performRefresh,
                );
            } else {
                await performRefresh();
            }
        } catch {
            clearSession();
        }
    }, [clearSession, persistSession]);

    useEffect(() => {
        const storedSession = readStoredSession();
        sessionRef.current = storedSession;
        setSession(storedSession);

        if (!storedSession) {
            setStatus("unauthenticated");
        } else {
            const expiration = getTokenExpiration(storedSession.token);
            if (expiration !== null && expiration <= Date.now()) {
                void refreshSession();
            } else {
                setStatus("authenticated");
            }
        }

        const handleStorage = (event: StorageEvent) => {
            if (event.key !== STORAGE_KEY) return;

            const nextSession = readStoredSession();
            sessionRef.current = nextSession;
            setSession(nextSession);
            setStatus(nextSession ? "authenticated" : "unauthenticated");
        };

        window.addEventListener("storage", handleStorage);
        return () => window.removeEventListener("storage", handleStorage);
    }, [refreshSession]);

    useEffect(() => {
        if (!session) return;

        const expiration = getTokenExpiration(session.token);
        if (expiration === null) {
            clearSession();
            return;
        }

        const refreshIn = Math.max(
            0,
            expiration - Date.now() - REFRESH_BEFORE_EXPIRY_MS,
        );
        const timeout = window.setTimeout(refreshSession, refreshIn);
        return () => window.clearTimeout(timeout);
    }, [clearSession, refreshSession, session]);

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

    const updateUser = useCallback((user: AuthUser) => {
        const sanitizedUser = parseAuthUser(user);
        if (!sanitizedUser) return;

        setSession((currentSession) => {
            if (!currentSession) return currentSession;

            const nextSession = { ...currentSession, user: sanitizedUser };
            const storedSession: StoredAuthSession = {
                version: 2,
                ...nextSession,
            };

            localStorage.setItem(STORAGE_KEY, JSON.stringify(storedSession));
            sessionRef.current = nextSession;
            return nextSession;
        });
    }, []);

    const logout = useCallback(async () => {
        const refreshToken = session?.refresh_token;
        clearSession();

        if (!refreshToken) return;

        try {
            await fetch("/api/auth/revoke", {
                method: "POST",
                headers: { Authorization: `Bearer ${refreshToken}` },
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
                updateUser,
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

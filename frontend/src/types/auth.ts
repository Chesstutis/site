import type { ReactNode } from "react";

export class EmailNotVerifiedError extends Error {}

export type loginReq = {
    email: string;
    password: string;
};

export type signupReq = {
    email: string;
    password: string;
    chess_com_username: string;
};

export type AuthStatus =
    | "initializing"
    | "authenticated"
    | "unauthenticated";

export type AuthUser = {
    id: number;
    email: string;
    chess_com_username: string;
    created_at: string;
    updated_at: string;
};

export type AuthResponse = AuthUser & {
    token: string;
};

export type SignupResponse = AuthUser;

export type AuthSession = {
    user: AuthUser;
    token: string;
};

export type StoredAuthSession = AuthSession & {
    version: 1;
};

export type AuthContextValue = {
    status: AuthStatus;
    user: AuthUser | null;
    token: string | null;
    login: (credentials: loginReq) => Promise<void>;
    signup: (credentials: signupReq) => Promise<void>;
    logout: () => Promise<void>;
    resendVerification: (email: string) => Promise<void>;
};

export type AuthProviderProps = {
    children: ReactNode;
};

export type AuthPath = "/login" | "/signup";

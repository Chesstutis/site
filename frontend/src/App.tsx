import { BrowserRouter, Navigate, Routes, Route } from "react-router";
import { useAuth } from "./components/AuthProvider";
import Dashboard from "./pages/Dashboard";
import Solve from "./pages/Solve";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Account from "./pages/Account";
import NotFound from "./pages/NotFound";
import Layout from "./components/Layout";
import type { ReactNode } from "react";

function ProtectedRoute({ children }: { children: ReactNode }) {
    const { status } = useAuth();

    if (status === "initializing") return null;
    return status === "authenticated" ? children : (
        <Navigate to="/login" replace />
    );
}

function GuestRoute({ children }: { children: ReactNode }) {
    const { status } = useAuth();

    if (status === "initializing") return null;
    return status === "authenticated" ? (
        <Navigate to="/dashboard" replace />
    ) : children;
}

function HomeRoute() {
    const { status } = useAuth();

    if (status === "initializing") {
        return null;
    }

    return status === "authenticated" ? (
        <Navigate to="/dashboard" replace />
    ) : (
        <Home />
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route element={<Layout />}>
                    <Route path="/" element={<HomeRoute />} />
                    <Route
                        path="/login"
                        element={<GuestRoute><Login /></GuestRoute>}
                    />
                    <Route
                        path="/signup"
                        element={<GuestRoute><Signup /></GuestRoute>}
                    />
                    <Route
                        path="/dashboard"
                        element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
                    />
                    <Route
                        path="/solve"
                        element={<ProtectedRoute><Solve /></ProtectedRoute>}
                    />
                    <Route
                        path="/account"
                        element={<ProtectedRoute><Account /></ProtectedRoute>}
                    />
                    <Route path="*" element={<NotFound />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

import { BrowserRouter, Navigate, Routes, Route } from "react-router";
import { useAuth } from "./components/AuthProvider";
import Dashboard from "./pages/Dashboard";
import Solve from "./pages/Solve";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Account from "./pages/Account";
import NotFound from "./pages/NotFound"
import Layout from "./components/Layout";

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
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/solve" element={<Solve />} />
                    <Route path="/account" element={<Account />} />
                    <Route path="*" element={<NotFound />} />
                </Route>
            </Routes>
        </BrowserRouter>
    )
}

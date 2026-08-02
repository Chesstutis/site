import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "./components/AuthProvider";
import Dashboard from "./pages/Dashboard";
import Solve from "./pages/Solve";
import Start from "./pages/Start"; 
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound"
import Layout from "./components/Layout";

export default function App() {
    const [username, setUsername] = useState("");
    const { user } = useAuth();
    const solveUsername = user?.chess_com_username ?? username;

    return (
        <BrowserRouter>
            <Routes>
                <Route element={<Layout />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/start" element={<Start setUsername={setUsername} />} />
                    <Route path="/solve" element={<Solve username={solveUsername} />} />
                    <Route path="*" element={<NotFound />} />
                </Route>
            </Routes>
        </BrowserRouter>
    )
}

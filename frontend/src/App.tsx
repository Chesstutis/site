import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";
import Solve from "./pages/Solve";
import Start from "./pages/Start"; 
import Home from "./pages/Home";
import NotFound from "./pages/NotFound"
import Layout from "./components/Layout";

export default function App() {
    const [username, setUsername] = useState("");

    return (
        <BrowserRouter>
            <Routes>
                <Route element={<Layout />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/start" element={<Start setUsername={setUsername} />} />
                    <Route path="/solve" element={<Solve username={username} />} />
                    <Route path="*" element={<NotFound />} />
                </Route>
            </Routes>
        </BrowserRouter>
    )
}

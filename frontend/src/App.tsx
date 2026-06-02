import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";
import Solve from "./pages/Solve";
import Welcome from "./pages/Welcome"; 
import Home from "./pages/Home";

export default function App() {
    const [username, setUsername] = useState("");

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Welcome  setUsername={setUsername}/>} />
                <Route path="/home" element={<Home />} />
                <Route path="/solve" element={<Solve username={username} />} />
            </Routes>
        </BrowserRouter>
    )
}

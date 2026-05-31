import { BrowserRouter, Routes, Route } from "react-router-dom";
import Solve from "./pages/Solve"
import Welcome from "./pages/Welcome" 
import Home from "./pages/Home"

export default function App() {
    
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Welcome />} />
                <Route path="/home" element={<Home />} />
                <Route path="/solve" element={<Solve />} />
            </Routes>
        </BrowserRouter>
    )
}

import { BrowserRouter, Routes, Route, Link } from 'react-router'
import Home from "./pages/Home"
import Test from "./pages/Test"

export default function App() {
    return (
        <BrowserRouter>
            <nav>
                <Link to="/" className="p-4 text-2xl">Home</Link>
                <Link to="/test" className="p-4 text-2xl">Test</Link>
            </nav>

            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/test" element={<Test />} />
            </Routes>

        </BrowserRouter>
    )
}


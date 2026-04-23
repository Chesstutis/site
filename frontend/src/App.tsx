import { BrowserRouter, Routes, Route, Link } from 'react-router'
import Home from "./pages/Home"
import Test from "./pages/Test"

export default function App() {
    return (
        <BrowserRouter>
            <nav>
                <Link to="/">Home</Link>
                <Link to="/test">Test</Link>
            </nav>

            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/test" element={<Test />} />
            </Routes>

        </BrowserRouter>
    )
}


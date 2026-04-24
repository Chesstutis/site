import { BrowserRouter, Link, Route, Routes } from "react-router-dom"
import { Moon, Sun } from "lucide-react"

import { Button } from "./components/ui/button"
import {
    NavigationMenu,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
} from "./components/ui/navigation-menu"
import Dashboard from "./pages/Dashboard"
import Test from "./pages/Test"
import Welcome from "./pages/Welcome"

const navItems = [
    { to: "/", label: "Welcome" },
    { to: "/test", label: "Test" },
    { to: "/dashboard", label: "Dashboard" },
]

function toggleTheme() {
    document.documentElement.classList.toggle("dark")
}

export default function App() {
    return (
        <BrowserRouter>
            <header className="border-b bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/70">
                <div className="relative mx-auto w-full max-w-5xl px-4 py-3">
                    <div className="absolute top-1/2 right-4 z-20 -translate-y-1/2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={toggleTheme}
                            className="rounded-full"
                            aria-label="Toggle dark mode"
                            title="Toggle dark mode"
                        >
                            <Sun className="hidden dark:block" aria-hidden="true" />
                            <Moon className="block dark:hidden" aria-hidden="true" />
                        </Button>
                    </div>

                    <NavigationMenu viewport={false} className="max-w-none w-full">
                        <NavigationMenuList className="w-full flex-wrap justify-center gap-2 pr-12 sm:gap-3 sm:pr-14">
                            {navItems.map((item) => (
                                <NavigationMenuItem key={item.to}>
                                    <NavigationMenuLink
                                        asChild
                                        className="rounded-full px-4 py-2 text-base font-medium"
                                    >
                                        <Link to={item.to}>{item.label}</Link>
                                    </NavigationMenuLink>
                                </NavigationMenuItem>
                            ))}
                        </NavigationMenuList>
                    </NavigationMenu>
                </div>
            </header>

            <Routes>
                <Route path="/" element={<Welcome />} />
                <Route path="/test" element={<Test />} />
                <Route path="/dashboard" element={<Dashboard />} />
            </Routes>
        </BrowserRouter>
    )
}


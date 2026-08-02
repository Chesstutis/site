import { GitFork } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const initializingNavItems = [
    { label: "Home", to: "/", end: true },
];

const guestNavItems = [
    { label: "Home", to: "/", end: true },
    { label: "Log in", to: "/login", end: true },
    { label: "Sign up", to: "/signup", end: true },
];

const authenticatedNavItems = [
    { label: "Home", to: "/", end: true },
    { label: "Dashboard", to: "/dashboard", end: true },
    { label: "Find puzzles", to: "/solve", end: true },
];

export default function Layout() {
    const { status, logout } = useAuth();
    const navigate = useNavigate();

    const navItems =
        status === "authenticated"
            ? authenticatedNavItems
            : status === "unauthenticated"
              ? guestNavItems
              : initializingNavItems;

    async function handleLogout() {
        await logout();
        navigate("/");
    }

    return (
        <div className="flex min-h-screen w-full min-w-0 flex-col overflow-x-clip bg-background text-foreground">
            <header className="border-b bg-card/90 backdrop-blur">
                <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-2 px-4 sm:gap-6 sm:px-6">
                    <NavLink
                        to="/"
                        className="group flex min-w-0 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:gap-3"
                        aria-label="Chesstutis.com home"
                    >
                        <span
                            className="grid size-9 shrink-0 grid-cols-2 overflow-hidden rounded-lg border border-primary/30 shadow-xs"
                            aria-hidden="true"
                        >
                            <span className="bg-primary" />
                            <span className="bg-card" />
                            <span className="bg-card" />
                            <span className="bg-primary" />
                        </span>
                        <span className="hidden text-lg font-semibold tracking-tight transition-colors group-hover:text-primary min-[360px]:inline">
                            Chesstutis.com
                        </span>
                    </NavLink>

                    <nav className="shrink-0" aria-label="Primary navigation">
                        <ul className="flex items-center gap-1">
                            {navItems.map((item) => (
                                <li key={item.to}>
                                    <NavLink
                                        to={item.to}
                                        end={item.end}
                                        className={({ isActive }) =>
                                            cn(
                                                "inline-flex h-9 items-center rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                                isActive
                                                    ? "bg-primary/10 text-primary"
                                                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                                            )
                                        }
                                    >
                                        {item.label}
                                    </NavLink>
                                </li>
                            ))}
                            {status === "authenticated" ? (
                                <li>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="lg"
                                        onClick={handleLogout}
                                    >
                                        Log out
                                    </Button>
                                </li>
                            ) : null}
                        </ul>
                    </nav>
                </div>
            </header>

            <main className="flex min-w-0 flex-1 flex-col">
                <Outlet />
            </main>

            <footer className="border-t bg-card">
                <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 py-5 text-center text-sm text-muted-foreground sm:flex-row sm:px-6 sm:text-left">
                    <p>
                        &copy; {new Date().getFullYear()} Chesstutis.com. Built
                        for better moves.
                    </p>
                    <a
                        href="https://github.com/chesstutis/site"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-md font-medium text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                        <GitFork className="size-4" aria-hidden="true" />
                        View repository
                    </a>
                </div>
            </footer>
        </div>
    );
}

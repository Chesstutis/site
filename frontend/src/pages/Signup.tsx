import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "@/components/AuthProvider"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { CircleAlert } from "lucide-react";

export default function Signup() {
    const { signup } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [chessUsername, setChessUsername] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        setIsSubmitting(true);

        try {
            await signup({
                email: email.trim().toLowerCase(),
                password,
                chess_com_username: chessUsername.trim(),
            })

            navigate("/dashboard");
        } catch (error) {
            setError(
                error instanceof Error ? error.message : "Unable to log in",
            );
        } finally {
            setIsSubmitting(false);
        }
    }
    return (
        <div className="flex flex-1 items-center bg-background px-4 py-10 text-foreground sm:px-6 sm:py-16">
            <section className="mx-auto grid w-full max-w-4xl overflow-hidden rounded-2xl border bg-card shadow-xl lg:grid-cols-[0.9fr_1.1fr]">
                <aside className="relative hidden min-h-[38rem] flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
                    <div
                        className="absolute -right-12 -top-12 grid size-56 rotate-12 grid-cols-4 overflow-hidden rounded-3xl opacity-15"
                        aria-hidden="true"
                    >
                        {Array.from({ length: 16 }).map((_, index) => (
                            <span
                                key={index}
                                className={cn(
                                    (Math.floor(index / 4) + index) % 2 === 0
                                        ? "bg-primary-foreground"
                                        : "bg-transparent",
                                )}
                            />
                        ))}
                    </div>

                    <Link
                        to="/"
                        className="relative flex w-fit items-center gap-3 rounded-md font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground"
                        aria-label="Chesstutis home"
                    >
                        <span
                            className="grid size-9 grid-cols-2 overflow-hidden rounded-lg border border-primary-foreground/40"
                            aria-hidden="true"
                        >
                            <span className="bg-primary-foreground" />
                            <span />
                            <span />
                            <span className="bg-primary-foreground" />
                        </span>
                        Chesstutis
                    </Link>

                    <div className="relative flex max-w-sm flex-col gap-4">
                        <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/75">
                            Train from experience
                        </p>
                        <h2 className="text-4xl font-semibold leading-tight tracking-tight">
                            Make every missed move useful.
                        </h2>
                        <p className="text-base leading-7 text-primary-foreground/80">
                            Connect your Chess.com username and build a growing
                            training set from the critical moments in your own
                            games.
                        </p>
                    </div>
                </aside>

                <Card className="justify-center rounded-none bg-card py-8 shadow-none ring-0 [--card-spacing:--spacing(6)] sm:py-12">
                    <CardHeader>
                        <Link
                            to="/"
                            className="mb-5 flex w-fit items-center gap-2 rounded-md font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
                        >
                            <span
                                className="grid size-8 grid-cols-2 overflow-hidden rounded-md border border-primary/30"
                                aria-hidden="true"
                            >
                                <span className="bg-primary" />
                                <span />
                                <span />
                                <span className="bg-primary" />
                            </span>
                            Chesstutis
                        </Link>
                        <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                            Start training
                        </p>
                        <CardTitle>
                            <h1 className="text-3xl tracking-tight">
                                Create your account
                            </h1>
                        </CardTitle>
                        <CardDescription className="max-w-md leading-6">
                            Use your Chess.com username to turn recent games
                            into personalized puzzles.
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <form
                            onSubmit={handleSubmit}
                            className="flex flex-col gap-5"
                        >
                            {error ? (
                                <Alert variant="destructive">
                                    <CircleAlert aria-hidden="true" />
                                    <AlertTitle>
                                        Unable to create account
                                    </AlertTitle>
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            ) : null}

                            <div className="flex flex-col gap-2">
                                <Label htmlFor="signup-email">Email</Label>
                                <Input
                                    id="signup-email"
                                    name="email"
                                    type="email"
                                    value={email}
                                    onChange={(event) =>
                                        setEmail(event.target.value)
                                    }
                                    placeholder="you@example.com"
                                    autoComplete="email"
                                    disabled={isSubmitting}
                                    required
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <Label htmlFor="chess-username">
                                    Chess.com username
                                </Label>
                                <Input
                                    id="chess-username"
                                    name="chess_com_username"
                                    type="text"
                                    value={chessUsername}
                                    onChange={(event) =>
                                        setChessUsername(event.target.value)
                                    }
                                    placeholder="your_username"
                                    autoComplete="username"
                                    aria-describedby="chess-username-description"
                                    disabled={isSubmitting}
                                    required
                                />
                                <p
                                    id="chess-username-description"
                                    className="text-xs leading-5 text-muted-foreground"
                                >
                                    We use this to find the games that become
                                    your training positions.
                                </p>
                            </div>

                            <div className="flex flex-col gap-2">
                                <Label htmlFor="signup-password">
                                    Password
                                </Label>
                                <Input
                                    id="signup-password"
                                    name="password"
                                    type="password"
                                    value={password}
                                    onChange={(event) =>
                                        setPassword(event.target.value)
                                    }
                                    autoComplete="new-password"
                                    minLength={8}
                                    aria-describedby="signup-password-description"
                                    disabled={isSubmitting}
                                    required
                                />
                                <p
                                    id="signup-password-description"
                                    className="text-xs leading-5 text-muted-foreground"
                                >
                                    Use at least 8 characters.
                                </p>
                            </div>

                            <Button
                                type="submit"
                                size="lg"
                                className="w-full"
                                disabled={isSubmitting}
                            >
                                {isSubmitting
                                    ? "Creating account…"
                                    : "Create account"}
                            </Button>
                        </form>
                    </CardContent>

                    <CardFooter className="justify-center text-center text-sm text-muted-foreground">
                        Already have an account?&nbsp;
                        <Link
                            to="/login"
                            className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            Log in
                        </Link>
                    </CardFooter>
                </Card>
            </section>
        </div>
    )
}

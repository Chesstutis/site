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
    const { login } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        setIsSubmitting(true);

        try {
            await login({
                email: email.trim().toLowerCase(),
                password,
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
                <aside className="relative hidden min-h-[34rem] flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
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
                            Your games, your training
                        </p>
                        <h2 className="text-4xl font-semibold leading-tight tracking-tight">
                            Pick up where your last game left off.
                        </h2>
                        <p className="text-base leading-7 text-primary-foreground/80">
                            Sign in to turn your recent Chess.com mistakes into
                            focused puzzles built from positions you actually
                            played.
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
                            Welcome back
                        </p>
                        <CardTitle>
                            <h1 className="text-3xl tracking-tight">
                                Log in to your account
                            </h1>
                        </CardTitle>
                        <CardDescription className="max-w-md leading-6">
                            Continue training with puzzles generated from your
                            own games.
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
                                    <AlertTitle>Unable to log in</AlertTitle>
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            ) : null}

                            <div className="flex flex-col gap-2">
                                <Label htmlFor="login-email">Email</Label>
                                <Input
                                    id="login-email"
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
                                <Label htmlFor="login-password">
                                    Password
                                </Label>
                                <Input
                                    id="login-password"
                                    name="password"
                                    type="password"
                                    value={password}
                                    onChange={(event) =>
                                        setPassword(event.target.value)
                                    }
                                    autoComplete="current-password"
                                    disabled={isSubmitting}
                                    required
                                />
                            </div>

                            <Button
                                type="submit"
                                size="lg"
                                className="w-full"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "Logging in…" : "Log in"}
                            </Button>
                        </form>
                    </CardContent>

                    <CardFooter className="justify-center text-center text-sm text-muted-foreground">
                        New to Chesstutis?&nbsp;
                        <Link
                            to="/signup"
                            className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            Create an account
                        </Link>
                    </CardFooter>
                </Card>
            </section>
        </div>
    )
}

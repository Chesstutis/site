import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CircleAlert, Loader2, MailCheck } from "lucide-react";

type Status = "verifying" | "success" | "error";

export default function VerifyEmail() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");

    const [status, setStatus] = useState<Status>("verifying");
    const [message, setMessage] = useState("");

    useEffect(() => {
        if (!token) {
            setStatus("error");
            setMessage("This verification link is missing its token.");
            return;
        }

        let cancelled = false;

        (async () => {
            try {
                const response = await fetch("/api/auth/verify-email", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token }),
                });

                if (cancelled) return;

                if (!response.ok) {
                    const text = (await response.text()).trim();
                    setStatus("error");
                    setMessage(
                        text || "This verification link is invalid or has expired.",
                    );
                    return;
                }

                setStatus("success");
            } catch {
                if (!cancelled) {
                    setStatus("error");
                    setMessage("Something went wrong. Please try again.");
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [token]);

    return (
        <div className="flex flex-1 items-center justify-center bg-background px-4 py-16 text-foreground">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>
                        <h1 className="text-2xl tracking-tight">
                            {status === "verifying" && "Verifying your email…"}
                            {status === "success" && "Email verified"}
                            {status === "error" && "Verification failed"}
                        </h1>
                    </CardTitle>
                    {status === "success" ? (
                        <CardDescription>
                            You can now log in to your account.
                        </CardDescription>
                    ) : null}
                </CardHeader>

                <CardContent className="flex flex-col items-start gap-4">
                    {status === "verifying" ? (
                        <Loader2
                            className="size-8 animate-spin text-muted-foreground"
                            aria-hidden="true"
                        />
                    ) : null}

                    {status === "success" ? (
                        <>
                            <MailCheck
                                className="size-10 text-primary"
                                aria-hidden="true"
                            />
                            <Link
                                to="/login"
                                className={cn(buttonVariants({ size: "lg" }), "w-full")}
                            >
                                Go to log in
                            </Link>
                        </>
                    ) : null}

                    {status === "error" ? (
                        <>
                            <Alert variant="destructive">
                                <CircleAlert aria-hidden="true" />
                                <AlertTitle>Unable to verify email</AlertTitle>
                                <AlertDescription>{message}</AlertDescription>
                            </Alert>
                            <Link
                                to="/login"
                                className={cn(buttonVariants({ size: "lg" }), "w-full")}
                            >
                                Back to log in
                            </Link>
                        </>
                    ) : null}
                </CardContent>
            </Card>
        </div>
    );
}

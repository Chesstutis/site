import { Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

const steps = [
    {
        number: "01",
        title: "Load your games",
        description:
            "Enter your Chess.com username and Chesstutis pulls your latest games.",
    },
    {
        number: "02",
        title: "Find the turning points",
        description:
            "Your moves are analyzed to find positions where a stronger move was available.",
    },
    {
        number: "03",
        title: "Solve the position",
        description:
            "Replay each moment as a puzzle and practice finding the better continuation.",
    },
];

export default function Home() {
    return (
        <div className="flex flex-1 bg-background px-4 py-10 text-foreground sm:px-6 sm:py-16">
            <div className="mx-auto flex w-full max-w-6xl flex-col justify-center gap-10">
                <section className="grid items-center gap-10 lg:grid-cols-[1.3fr_0.7fr]">
                    <div className="max-w-3xl">
                        <p className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                            Learn from your own games
                        </p>
                        <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                            Turn yesterday&apos;s mistakes into today&apos;s
                            puzzles.
                        </h1>
                        <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                            Chesstutis transforms critical moments from your
                            recent Chess.com games into puzzles made just for
                            you. Instead of studying random positions, you
                            practice the moves you actually missed.
                        </p>
                        <Link
                            to="/"
                            className={buttonVariants({
                                size: "lg",
                                className: "mt-8",
                            })}
                        >
                            Start with your username
                            <span aria-hidden="true">&rarr;</span>
                        </Link>
                    </div>

                    <div
                        className="relative mx-auto w-full max-w-sm"
                        aria-hidden="true"
                    >
                        <div className="absolute -inset-3 rotate-3 rounded-2xl bg-primary/10" />
                        <Card className="relative shadow-lg">
                            <CardHeader className="border-b">
                                <CardDescription className="font-mono uppercase tracking-widest">
                                    Position review
                                </CardDescription>
                                <CardTitle className="text-xl">
                                    Find the better move
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-[auto_1fr_auto] gap-x-5 gap-y-3 font-mono text-sm">
                                    <span className="text-muted-foreground">
                                        18.
                                    </span>
                                    <span className="line-through decoration-destructive decoration-2">
                                        Qxd5?
                                    </span>
                                    <span className="text-destructive">
                                        missed
                                    </span>
                                    <span className="text-muted-foreground">
                                        18.
                                    </span>
                                    <span className="font-semibold text-primary">
                                        Bxh7+!
                                    </span>
                                    <span className="text-primary">best</span>
                                </div>
                                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                    <div className="h-full w-3/4 rounded-full bg-primary" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                <section aria-labelledby="how-it-works">
                    <div className="mb-5 flex items-end justify-between gap-4 border-b pb-4">
                        <div>
                            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                                The process
                            </p>
                            <h2
                                id="how-it-works"
                                className="mt-1 text-2xl font-semibold tracking-tight"
                            >
                                From game to training position
                            </h2>
                        </div>
                        <p className="hidden text-sm text-muted-foreground sm:block">
                            All you need is a Chess.com username.
                        </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        {steps.map((step) => (
                            <Card key={step.number} className="h-full">
                                <CardHeader>
                                    <p className="font-mono text-xs font-semibold text-primary">
                                        {step.number}
                                    </p>
                                    <CardTitle className="text-lg">
                                        {step.title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="leading-6 text-muted-foreground">
                                        {step.description}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}


import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export default function Home() {
	return (
		<main className="min-h-screen bg-background px-4 py-8 text-foreground">
			<section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center justify-center">
				<Card className="w-full">
					<CardHeader>
						<CardTitle>Home</CardTitle>
						<CardDescription>
							Chess Puzzle Solver
						</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground">Home, there</p>
					</CardContent>
				</Card>
			</section>
		</main>
	);
}

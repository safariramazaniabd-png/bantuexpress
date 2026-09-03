import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
      <h1 className="text-6xl font-bold text-zinc-300 dark:text-zinc-700">404</h1>
      <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
        Page introuvable
      </p>
      <Link href="/" className="mt-8">
        <Button>Retour à l&apos;accueil</Button>
      </Link>
    </div>
  );
}

import { MapPin } from "lucide-react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-white py-8 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <MapPin className="h-4 w-4 text-emerald-600" />
            <span>&copy; {new Date().getFullYear()} BantuExpress</span>
          </div>
          <nav className="flex gap-6 text-sm text-zinc-500">
            <Link href="/about" className="hover:text-zinc-900 dark:hover:text-zinc-100">
              À propos
            </Link>
            <Link href="/contact" className="hover:text-zinc-900 dark:hover:text-zinc-100">
              Contact
            </Link>
            <Link href="/privacy" className="hover:text-zinc-900 dark:hover:text-zinc-100">
              Confidentialité
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

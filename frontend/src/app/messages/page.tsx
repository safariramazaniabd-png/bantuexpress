"use client";

import { MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function MessagesPage() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <MessageSquare className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />
        <h1 className="text-2xl font-bold">Messages</h1>
      </div>

      <Card className="flex flex-col items-center gap-4 p-12 text-center">
        <MessageSquare className="h-12 w-12 text-zinc-300 dark:text-zinc-600" />
        <p className="text-lg font-medium text-zinc-600 dark:text-zinc-400">
          Aucune conversation
        </p>
        <p className="text-sm text-zinc-500">
          Commencez par chercher un profil pour envoyer un message.
        </p>
        <Button onClick={() => router.push("/search")}>
          Rechercher des profils
        </Button>
      </Card>
    </div>
  );
}

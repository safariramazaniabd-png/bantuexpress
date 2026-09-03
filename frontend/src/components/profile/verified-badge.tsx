"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { identitiesApi } from "@/lib/api/identities";
import { toast } from "@/hooks/use-toast";
import { ShieldCheck, Loader2, CheckCircle2 } from "lucide-react";

interface VerifiedBadgeProps {
  verifiedAt: string | null;
  onVerified: () => void;
}

export function VerifiedBadge({ verifiedAt, onVerified }: VerifiedBadgeProps) {
  const [verifying, setVerifying] = useState(false);

  if (verifiedAt) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
        <CheckCircle2 className="h-4 w-4" />
        Profil vérifié
        <span className="text-xs text-emerald-500">
          {new Date(verifiedAt).toLocaleDateString("fr-FR")}
        </span>
      </div>
    );
  }

  async function handleVerify() {
    setVerifying(true);
    try {
      await identitiesApi.verifyProfile();
      onVerified();
      toast({ title: "Profil vérifié", description: "Votre profil a été vérifié avec succès." });
    } catch {
      toast({ title: "Erreur", description: "Impossible de vérifier le profil.", variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleVerify}
      disabled={verifying}
    >
      {verifying ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <ShieldCheck className="h-4 w-4 mr-2" />
      )}
      Vérifier mon profil
    </Button>
  );
}

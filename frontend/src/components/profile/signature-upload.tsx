"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { identitiesApi } from "@/lib/api/identities";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload, PenLine } from "lucide-react";

interface SignatureUploadProps {
  signatureUrl: string | null;
  onUpload: (url: string) => void;
}

export function SignatureUpload({ signatureUrl, onUpload }: SignatureUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Fichier trop volumineux", description: "Maximum 5 Mo.", variant: "destructive" });
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast({ title: "Format non supporté", description: "Utilisez JPEG, PNG ou WebP.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const result = await identitiesApi.uploadSignature(file);
      onUpload(result.digitalSignature);
      toast({ title: "Signature téléchargée" });
    } catch {
      toast({ title: "Erreur", description: "Échec du téléchargement.", variant: "destructive" });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
      />

      {signatureUrl ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <img
            src={signatureUrl}
            alt="Signature"
            className="h-16 w-auto object-contain"
          />
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <PenLine className="h-4 w-4 mr-2" />
          )}
          Ajouter ma signature
        </Button>
      )}
    </div>
  );
}

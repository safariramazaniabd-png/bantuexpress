"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { identitiesApi } from "@/lib/api/identities";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload, FileText, X } from "lucide-react";

interface IdentityUploadProps {
  photoUrl: string | null;
  onUpload: (url: string) => void;
}

export function IdentityUpload({ photoUrl, onUpload }: IdentityUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Fichier trop volumineux", description: "Maximum 10 Mo.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const result = await identitiesApi.uploadIdentityDocument(file);
      onUpload(result.identityDocumentPhoto);
      toast({ title: "Pièce d'identité téléchargée" });
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
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={handleFile}
      />

      {photoUrl ? (
        <div className="relative inline-block">
          {photoUrl.endsWith(".pdf") ? (
            <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <FileText className="h-8 w-8 text-zinc-400" />
              <div>
                <p className="text-sm font-medium">Pièce d&apos;identité</p>
                <p className="text-xs text-zinc-500">PDF téléchargé</p>
              </div>
            </div>
          ) : (
            <div className="relative group">
              <img
                src={photoUrl}
                alt="Pièce d'identité"
                className="h-40 w-auto rounded-lg border border-zinc-200 object-cover dark:border-zinc-800"
              />
            </div>
          )}
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
            <Upload className="h-4 w-4 mr-2" />
          )}
          Télécharger une pièce d&apos;identité
        </Button>
      )}
    </div>
  );
}

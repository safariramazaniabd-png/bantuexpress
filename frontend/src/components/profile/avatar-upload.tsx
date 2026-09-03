"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { identitiesApi } from "@/lib/api/identities";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload, Trash2, Camera } from "lucide-react";

interface AvatarUploadProps {
  avatarUrl: string | null;
  name: string;
  onAvatarChange: (url: string | null) => void;
}

export function AvatarUpload({ avatarUrl, name, onAvatarChange }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const initials = name.slice(0, 2).toUpperCase() || "?";

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
      const result = await identitiesApi.uploadAvatar(file);
      onAvatarChange(result.avatarUrl);
      toast({ title: "Avatar mis à jour" });
    } catch {
      toast({ title: "Erreur", description: "Échec de l'upload.", variant: "destructive" });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await identitiesApi.deleteAvatar();
      onAvatarChange(null);
      toast({ title: "Avatar supprimé" });
    } catch {
      toast({ title: "Erreur", description: "Échec de la suppression.", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar className="h-20 w-20 ring-2 ring-zinc-100 dark:ring-zinc-800">
        {avatarUrl ? (
          <AvatarImage src={avatarUrl} alt={name} />
        ) : null}
        <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xl dark:bg-emerald-900 dark:text-emerald-300">
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFile}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Camera className="h-4 w-4 mr-2" />
          )}
          Changer la photo
        </Button>
        {avatarUrl && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Supprimer
          </Button>
        )}
      </div>
    </div>
  );
}

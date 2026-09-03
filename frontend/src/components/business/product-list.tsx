"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { businessProfilesApi, type Product } from "@/lib/api/business-profiles";

interface ProductListProps {
  businessId: string;
  products: Product[];
  onUpdate: () => void;
}

export function ProductList({ businessId, products, onUpdate }: ProductListProps) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await businessProfilesApi.createProduct(businessId, {
        name: name.trim(),
        description: description || undefined,
        price: price ? parseFloat(price) : undefined,
      });
      setName(""); setDescription(""); setPrice("");
      setAdding(false);
      onUpdate();
      toast({ title: "Produit ajouté" });
    } catch {
      toast({ title: "Erreur", description: "Impossible d'ajouter le produit.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string) {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await businessProfilesApi.updateProduct(id, {
        name: name.trim(),
        description: description || undefined,
        price: price ? parseFloat(price) : undefined,
      });
      setName(""); setDescription(""); setPrice("");
      setEditingId(null);
      onUpdate();
      toast({ title: "Produit mis à jour" });
    } catch {
      toast({ title: "Erreur", description: "Impossible de modifier.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await businessProfilesApi.removeProduct(id);
      onUpdate();
      toast({ title: "Produit supprimé" });
    } catch {
      toast({ title: "Erreur", description: "Impossible de supprimer.", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-3">
      {products.map((p) => (
        <div key={p.id} className="flex items-center gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
          <div className="flex-1 min-w-0">
            {editingId === p.id ? (
              <div className="space-y-2">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom" className="h-8 text-sm" />
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="h-8 text-sm" />
                <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Prix (FC)" className="h-8 text-sm" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleUpdate(p.id)} disabled={saving}>
                    {saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                    Enregistrer
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Annuler</Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{p.name}</span>
                  {p.price != null && <span className="text-sm text-zinc-500">{Number(p.price).toLocaleString()} FC</span>}
                </div>
                {p.description && <p className="text-xs text-zinc-400">{p.description}</p>}
              </>
            )}
          </div>
          {editingId !== p.id && (
            <div className="flex gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingId(p.id); setName(p.name); setDescription(p.description ?? ""); setPrice(p.price?.toString() ?? ""); }}>
                <Pencil className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => handleDelete(p.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      ))}

      {adding ? (
        <div className="space-y-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
          <Label>Nom *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom du produit/service" />
          <Label>Description</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          <Label>Prix (FC)</Label>
          <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
              Ajouter
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAdding(false)}>Annuler</Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Ajouter un produit/service
        </Button>
      )}
    </div>
  );
}

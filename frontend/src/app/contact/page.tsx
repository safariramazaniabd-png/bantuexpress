"use client";

import { useState } from "react";
import { Mail, MapPin, Phone, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast({ title: "Formulaire incomplet", description: "Veuillez remplir tous les champs", variant: "destructive" });
      return;
    }
    setSending(true);
    await new Promise((r) => setTimeout(r, 800));
    toast({ title: "Message envoyé", description: "Nous vous répondrons dans les plus brefs délais." });
    setForm({ name: "", email: "", message: "" });
    setSending(false);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">Contact</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-3 p-4">
          <Mail className="h-5 w-5 text-emerald-600" />
          <div className="text-sm">
            <p className="font-medium">Email</p>
            <p className="text-zinc-500">contact@bantuexpress.cd</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <Phone className="h-5 w-5 text-emerald-600" />
          <div className="text-sm">
            <p className="font-medium">Téléphone</p>
            <p className="text-zinc-500">+243 000 000 000</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <MapPin className="h-5 w-5 text-emerald-600" />
          <div className="text-sm">
            <p className="font-medium">Adresse</p>
            <p className="text-zinc-500">Kinshasa, RDC</p>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Nom</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              placeholder="Votre nom"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              placeholder="votre@email.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Message</label>
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              rows={5}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              placeholder="Votre message..."
            />
          </div>
          <Button type="submit" disabled={sending}>
            <Send className="mr-2 h-4 w-4" />
            {sending ? "Envoi..." : "Envoyer"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

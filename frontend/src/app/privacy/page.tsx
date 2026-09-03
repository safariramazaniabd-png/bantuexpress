"use client";

import { Shield } from "lucide-react";

const sections = [
  {
    title: "1. Collecte des données",
    content: "Nous collectons les informations que vous nous fournissez directement : nom, email, numéro de téléphone, adresses, photo de profil, et documents d'identité. Nous collectons également des données de localisation lorsque vous utilisez les fonctionnalités de géolocalisation.",
  },
  {
    title: "2. Utilisation des données",
    content: "Vos données sont utilisées pour : créer et gérer votre compte, vous identifier, vous permettre de partager votre position et vos adresses, faciliter les livraisons et les interventions d'urgence, et améliorer nos services.",
  },
  {
    title: "3. Partage des données",
    content: "Vos informations personnelles ne sont jamais vendues à des tiers. Certaines données (adresses publiques, profil public) sont visibles par les autres utilisateurs selon vos paramètres de confidentialité.",
  },
  {
    title: "4. Sécurité",
    content: "Nous utilisons le chiffrement de bout en bout, l'authentification à deux facteurs (2FA), et des protocoles de sécurité conformes aux standards de l'industrie pour protéger vos données.",
  },
  {
    title: "5. Vos droits",
    content: "Vous pouvez à tout moment : accéder à vos données, les modifier, les supprimer, limiter leur traitement, ou demander leur portabilité. Contactez-nous à privacy@bantuexpress.cd pour exercer ces droits.",
  },
  {
    title: "6. Cookies",
    content: "Nous utilisons uniquement les cookies essentiels au fonctionnement de l'application. Aucun cookie de pistage ou de publicité n'est utilisé.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />
        <h1 className="text-2xl font-bold">Politique de confidentialité</h1>
      </div>

      <p className="text-sm text-zinc-500">
        Dernière mise à jour : juillet 2026
      </p>

      <div className="space-y-6">
        {sections.map((s) => (
          <div key={s.title} className="space-y-2">
            <h2 className="text-lg font-semibold">{s.title}</h2>
            <p className="text-sm text-zinc-600 leading-relaxed dark:text-zinc-400">{s.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

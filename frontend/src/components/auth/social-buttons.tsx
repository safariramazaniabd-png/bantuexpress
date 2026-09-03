"use client";

import { Button } from "@/components/ui/button";
import { useState, useCallback } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const FACEBOOK_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(script);
  });
}

export function SocialButtons() {
  const [loading, setLoading] = useState<string | null>(null);
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
  const loginWithApple = useAuthStore((s) => s.loginWithApple);
  const loginWithFacebook = useAuthStore((s) => s.loginWithFacebook);
  const loginWithWhatsApp = useAuthStore((s) => s.loginWithWhatsApp);
  const verifyWhatsAppCode = useAuthStore((s) => s.verifyWhatsAppCode);
  const router = useRouter();
  const [whatsappStep, setWhatsappStep] = useState<"phone" | "code">("phone");
  const [whatsappPhone, setWhatsappPhone] = useState("");

  const handleGoogle = useCallback(async () => {
    if (!GOOGLE_CLIENT_ID) {
      toast({ title: "Google OAuth", description: "Configuration requise : NEXT_PUBLIC_GOOGLE_CLIENT_ID" });
      return;
    }
    setLoading("google");
    try {
      await loadScript("https://accounts.google.com/gsi/client");
      const { google } = window as any;
      const tokenResponse = await new Promise<any>((resolve, reject) => {
        google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: "openid email profile",
          callback: (resp: any) => {
            if (resp.error) reject(new Error(resp.error));
            else resolve(resp);
          },
        }).requestAccessToken();
      });
      await loginWithGoogle(tokenResponse.id_token);
      router.push("/profile");
    } catch {
      toast({ title: "Erreur Google", description: "Échec de la connexion", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  }, [loginWithGoogle, router]);

  const handleFacebook = useCallback(async () => {
    if (!FACEBOOK_APP_ID) {
      toast({ title: "Facebook OAuth", description: "Configuration requise : NEXT_PUBLIC_FACEBOOK_APP_ID" });
      return;
    }
    setLoading("facebook");
    try {
      await loadScript("https://connect.facebook.net/fr_FR/sdk.js");
      await new Promise<void>((resolve) => {
        (window as any).fbAsyncInit = () => {
          (window as any).FB.init({ appId: FACEBOOK_APP_ID, version: "v18.0" });
          resolve();
        };
      });
      const response = await new Promise<any>((resolve, reject) => {
        (window as any).FB.login(
          (resp: any) => {
            if (resp.authResponse) resolve(resp.authResponse);
            else reject(new Error("Facebook login cancelled"));
          },
          { scope: "email,public_profile" },
        );
      });
      await loginWithFacebook(response.accessToken);
      router.push("/profile");
    } catch {
      toast({ title: "Erreur Facebook", description: "Échec de la connexion", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  }, [loginWithFacebook, router]);

  const handleApple = useCallback(async () => {
    setLoading("apple");
    try {
      try {
        await loadScript("https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/fr_FR/appleid.auth.js");
      } catch {
      }
      const AppleID = (window as any).AppleID;
      if (AppleID?.auth) {
        const response = await AppleID.auth.signIn({
          clientId: process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || "",
          scope: "name email",
          redirectURI: window.location.origin + "/callback/apple",
          usePopup: true,
        });
        await loginWithApple(response.authorization.id_token);
      } else {
        toast({ title: "Apple OAuth", description: "Configuration requise : NEXT_PUBLIC_APPLE_CLIENT_ID", variant: "destructive" });
      }
      router.push("/profile");
    } catch {
      toast({ title: "Erreur Apple", description: "Échec de la connexion", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  }, [loginWithApple, router]);

  const handleWhatsapp = useCallback(async () => {
    if (whatsappStep === "phone") {
      if (!whatsappPhone) {
        toast({ title: "WhatsApp", description: "Entrez votre numéro WhatsApp", variant: "destructive" });
        return;
      }
      setLoading("whatsapp");
      try {
        await loginWithWhatsApp(whatsappPhone);
        setWhatsappStep("code");
        toast({ title: "Code envoyé", description: "Vérifiez votre WhatsApp" });
      } catch {
        toast({ title: "Erreur WhatsApp", description: "Échec de l'envoi du code", variant: "destructive" });
      } finally {
        setLoading(null);
      }
    }
  }, [whatsappStep, whatsappPhone, loginWithWhatsApp]);

  const handleWhatsappVerify = useCallback(async (code: string) => {
    setLoading("whatsapp");
    try {
      await verifyWhatsAppCode(whatsappPhone, code);
      router.push("/profile");
    } catch {
      toast({ title: "Erreur WhatsApp", description: "Code invalide", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  }, [whatsappPhone, verifyWhatsAppCode, router]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-zinc-200 dark:border-zinc-800" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-zinc-500 dark:bg-zinc-950">
            Ou continuer avec
          </span>
        </div>
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={handleGoogle}
        disabled={loading !== null}
      >
        {loading === "google" ? "..." : (
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
        )}
        Google
      </Button>

      <Button
        variant="outline"
        className="w-full"
        onClick={handleFacebook}
        disabled={loading !== null}
      >
        <svg className="h-5 w-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
        Facebook
      </Button>

      <Button
        variant="outline"
        className="w-full"
        onClick={handleApple}
        disabled={loading !== null}
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
        </svg>
        Apple
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-zinc-200 dark:border-zinc-800" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-zinc-500 dark:bg-zinc-950">WhatsApp</span>
        </div>
      </div>

      {whatsappStep === "phone" ? (
        <div className="flex gap-2">
          <input
            type="tel"
            placeholder="+243XXXXXXXXX"
            value={whatsappPhone}
            onChange={(e) => setWhatsappPhone(e.target.value)}
            className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          />
          <Button onClick={handleWhatsapp} disabled={loading !== null} className="shrink-0">
            {loading === "whatsapp" ? "..." : "Envoyer"}
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Code à 6 chiffres"
            maxLength={6}
            onChange={(e) => {
              if (e.target.value.length === 6) {
                handleWhatsappVerify(e.target.value);
              }
            }}
            className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          />
          <Button
            variant="ghost"
            onClick={() => setWhatsappStep("phone")}
            className="shrink-0"
          >
            Modifier
          </Button>
        </div>
      )}
    </div>
  );
}

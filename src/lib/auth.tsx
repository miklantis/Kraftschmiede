import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactElement, ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";
import {
  anmeldeFehlerText,
  mitZeitlimit,
  SITZUNG_ZEITLIMIT_MS,
} from "@/lib/authCheck";
import {
  anlassAusFenster,
  ruecksprungFuerFenster,
  WIEDERHERSTELLUNG_MARKER,
} from "@/lib/authRedirect";
import type { PasswortAnlass } from "@/lib/authRedirect";

// Ergebnis eines Anmelde-/Registriervorgangs. Bei Erfolg signalisiert
// needsConfirmation, dass noch eine E-Mail-Bestaetigung aussteht (dann gibt es
// noch keine Sitzung). Bei Misserfolg eine bereits uebersetzte Meldung.
export type AuthResult =
  | { ok: true; needsConfirmation?: boolean }
  | { ok: false; message: string };

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  // Meldung, wenn der Sitzungs-Check beim Start gescheitert ist (Fehler oder
  // Zeitlimit). null heisst: kein Problem. Wird angezeigt, statt still weiter
  // zu laden.
  authFehler: string | null;
  // Startet den Sitzungs-Check neu (Knopf "Erneut versuchen").
  erneutPruefen: () => void;
  // Gesetzt, solange die App ueber einen Anmelde-Link geoeffnet wurde und noch
  // ein Passwort vergeben werden muss - entweder weil das Konto neu eingeladen
  // wurde ("einladung") oder weil das Passwort vergessen war
  // ("wiederherstellung"). Steuert den Passwort-Bildschirm.
  passwortAnlass: PasswortAnlass | null;
  // E-Mail aus dem Link, nur zur Anzeige.
  passwortEmail: string | null;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  // Fordert eine Mail mit Wiederherstellungs-Link an. Meldet bewusst nicht
  // zurueck, ob es zu der Adresse ein Konto gibt.
  passwortVergessen: (email: string) => Promise<AuthResult>;
  // Passwort setzen: fuer ein eingeladenes Konto, nach einem
  // Wiederherstellungs-Link oder im angemeldeten Zustand aus den
  // Einstellungen heraus.
  setPassword: (password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Bekannte Supabase-Fehlertexte ins Deutsche uebersetzen; Unbekanntes bleibt
// im Original, damit nichts verschluckt wird.
function uebersetzeFehler(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "E-Mail oder Passwort ist falsch.";
  }
  if (m.includes("already registered") || m.includes("already been registered")) {
    return "Mit dieser E-Mail gibt es bereits ein Konto.";
  }
  if (m.includes("password should be at least")) {
    return "Das Passwort muss mindestens 6 Zeichen haben.";
  }
  if (m.includes("should be different from the old password")) {
    return "Das neue Passwort muss sich vom bisherigen unterscheiden.";
  }
  if (m.includes("unable to validate email") || m.includes("invalid email")) {
    return "Die E-Mail-Adresse ist ungültig.";
  }
  if (m.includes("email not confirmed")) {
    return "Die E-Mail ist noch nicht bestätigt.";
  }
  // Supabase deckelt den Mail-Versand (im kostenlosen Tarif eng). Das ist kein
  // Fehler des Nutzers, darum ein Text, der zum Abwarten auffordert.
  if (m.includes("rate limit") || m.includes("you can only request this after")) {
    return "Es wurden zu viele Mails angefordert. Bitte warte einige Minuten und versuch es dann erneut.";
  }
  if (m.includes("expired") || m.includes("invalid or has expired")) {
    return "Der Link ist nicht mehr gültig. Fordere einen neuen an.";
  }
  return message;
}

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  // Passwort-Modus: wird gesetzt, wenn Supabase die App ueber einen Einladungs-
  // oder Wiederherstellungs-Link oeffnet. Dann liegt zwar schon eine Sitzung
  // vor, aber es fehlt ein gueltiges Passwort - also zeigen wir den Passwort-
  // Bildschirm statt der App, bis das Passwort gesetzt ist.
  const [passwortAnlass, setPasswortAnlass] = useState<PasswortAnlass | null>(
    null,
  );
  const [passwortEmail, setPasswortEmail] = useState<string | null>(null);
  const [authFehler, setAuthFehler] = useState<string | null>(null);
  // Zaehler fuer den Sitzungs-Check: Hochzaehlen startet ihn neu.
  const [versuch, setVersuch] = useState<number>(0);

  // Sitzungs-Check beim Start - und bei jedem "Erneut versuchen" erneut.
  // Zeitlimit plus Fehlerfang sind Pflicht: Ohne sie bleibt loading bei einem
  // haengenden oder scheiternden Aufruf fuer immer wahr, und die App zeigt
  // stumm "Laden ..." (Issue #348).
  useEffect(() => {
    let active = true;
    setLoading(true);
    setAuthFehler(null);
    mitZeitlimit(supabase.auth.getSession(), SITZUNG_ZEITLIMIT_MS)
      .then((ergebnis) => {
        if (!active) return;
        if (ergebnis.error !== null) {
          setAuthFehler(anmeldeFehlerText(ergebnis.error));
        } else {
          setSession(ergebnis.data.session);
        }
        setLoading(false);
      })
      .catch((fehler: unknown) => {
        if (!active) return;
        setAuthFehler(anmeldeFehlerText(fehler));
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [versuch]);

  // Abo auf Anmelde-Ereignisse: laeuft ueber die gesamte Lebensdauer und wird
  // vom Neuversuch oben bewusst nicht angefasst.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      // Kommt eine Sitzung an, ist der Anmelde-Weg offensichtlich wieder da:
      // Fehlerzustand raeumen und den Ladezustand beenden.
      if (next !== null) {
        setAuthFehler(null);
        setLoading(false);
      }
      // Klick auf einen Wiederherstellungs-Link ("Passwort vergessen"):
      // Supabase meldet ein eigenes Ereignis und legt eine Sitzung an. Genau
      // hier gehoert der Passwort-Bildschirm hin - vorher war an dieser Stelle
      // ein frueher return, und der Nutzer landete ohne Weg zum neuen Passwort
      // direkt in der App (Issue #349).
      if (event === "PASSWORD_RECOVERY") {
        setPasswortAnlass("wiederherstellung");
        setPasswortEmail(next?.user.email ?? null);
        return;
      }
      // Passwort-Aenderung durch uns selbst - kein Grund, den Modus zu setzen.
      if (event === "USER_UPDATED") {
        return;
      }
      if (event === "SIGNED_IN") {
        const anlass = anlassAusFenster();
        if (anlass !== null) {
          setPasswortAnlass(anlass);
          setPasswortEmail(next?.user.email ?? null);
        }
      }
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      passwortAnlass,
      passwortEmail,
      authFehler,
      erneutPruefen: () => setVersuch((n) => n + 1),
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) return { ok: false, message: uebersetzeFehler(error.message) };
        return { ok: true };
      },
      signUp: async (email, password) => {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) return { ok: false, message: uebersetzeFehler(error.message) };
        return { ok: true, needsConfirmation: data.session === null };
      },
      passwortVergessen: async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: ruecksprungFuerFenster(WIEDERHERSTELLUNG_MARKER),
        });
        if (error) return { ok: false, message: uebersetzeFehler(error.message) };
        return { ok: true };
      },
      setPassword: async (password) => {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) return { ok: false, message: uebersetzeFehler(error.message) };
        // Passwort gesetzt: Passwort-Modus verlassen, URL-Marker entfernen,
        // damit ein Reload nicht erneut in den Passwort-Bildschirm faellt.
        setPasswortAnlass(null);
        setPasswortEmail(null);
        if (typeof window !== "undefined") {
          window.history.replaceState(null, "", window.location.pathname);
        }
        return { ok: true };
      },
      signOut: async () => {
        setPasswortAnlass(null);
        setPasswortEmail(null);
        await supabase.auth.signOut();
      },
    }),
    [session, loading, passwortAnlass, passwortEmail, authFehler],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error("useAuth muss innerhalb von AuthProvider verwendet werden.");
  }
  return ctx;
}

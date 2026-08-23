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
  // Wahr, solange die App ueber einen Einladungslink geoeffnet wurde und der
  // Eingeladene noch kein Passwort gesetzt hat. Steuert den Einladungs-Screen.
  invitePending: boolean;
  // E-Mail des Eingeladenen (kommt aus der Einladung), nur zur Anzeige.
  inviteEmail: string | null;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  // Passwort fuer ein eingeladenes Konto setzen; danach ist der Nutzer
  // angemeldet und der Einladungs-Screen verschwindet.
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
  if (m.includes("unable to validate email") || m.includes("invalid email")) {
    return "Die E-Mail-Adresse ist ungültig.";
  }
  if (m.includes("email not confirmed")) {
    return "Die E-Mail ist noch nicht bestätigt.";
  }
  return message;
}

// Erkennt, ob die App gerade ueber einen Einladungs-Link von Supabase geoeffnet
// wurde. Supabase haengt die Sitzungsinfos je nach Flow an den URL-Hash
// (#access_token=...&type=invite) oder als Query (?type=invite oder ?code=...).
// Wir pruefen beide Stellen tolerant.
function istEinladungInUrl(): boolean {
  if (typeof window === "undefined") return false;
  const hash = window.location.hash.toLowerCase();
  const search = window.location.search.toLowerCase();
  if (hash.includes("type=invite") || search.includes("type=invite")) {
    return true;
  }
  // Der neuere PKCE-Flow liefert nur ?code=...; dann ist die Einladung am
  // gesonderten Marker zu erkennen, den wir im Redirect-Ziel mitgeben.
  if (search.includes("einladung") || hash.includes("einladung")) {
    return true;
  }
  return false;
}

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  // Einladungs-Modus: wird gesetzt, wenn Supabase die App ueber einen
  // Einladungslink oeffnet. Dann liegt zwar schon eine Sitzung vor, aber der
  // Nutzer hat noch kein Passwort vergeben – also zeigen wir den Einladungs-
  // Screen statt der App, bis das Passwort gesetzt ist.
  const [invitePending, setInvitePending] = useState<boolean>(false);
  const [inviteEmail, setInviteEmail] = useState<string | null>(null);
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
      // Supabase meldet bei Klick auf einen Einladungs-/Wiederherstellungs-
      // Link ein gesondertes Ereignis. Dann in den Einladungs-Modus gehen und
      // die E-Mail aus der Sitzung uebernehmen.
      if (event === "PASSWORD_RECOVERY" || event === "USER_UPDATED") {
        return;
      }
      if (event === "SIGNED_IN" && istEinladungInUrl()) {
        setInvitePending(true);
        setInviteEmail(next?.user.email ?? null);
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
      invitePending,
      inviteEmail,
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
      setPassword: async (password) => {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) return { ok: false, message: uebersetzeFehler(error.message) };
        // Passwort gesetzt: Einladungs-Modus verlassen, URL-Marker entfernen,
        // damit ein Reload nicht erneut in den Einladungs-Screen faellt.
        setInvitePending(false);
        setInviteEmail(null);
        if (typeof window !== "undefined") {
          window.history.replaceState(null, "", window.location.pathname);
        }
        return { ok: true };
      },
      signOut: async () => {
        setInvitePending(false);
        setInviteEmail(null);
        await supabase.auth.signOut();
      },
    }),
    [session, loading, invitePending, inviteEmail, authFehler],
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

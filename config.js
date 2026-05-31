/* Kraftschmiede – Supabase-Zugangsdaten
   ----------------------------------------------------------------
   Trage hier die zwei Werte aus deinem Supabase-Projekt ein:
   Supabase Dashboard -> Project Settings -> API
     - Project URL        -> SUPABASE_URL
     - anon / public key   -> SUPABASE_ANON_KEY

   Der anon-Key ist fuer den Browser gedacht und darf oeffentlich sein.
   Der Schutz der Daten passiert ueber Row Level Security (siehe schema.sql).
   NIEMALS den "service_role"-Key hier eintragen.

   Solange hier Platzhalter stehen, laeuft die App rein lokal
   (localStorage) ohne Cloud-Sync.
*/
window.KS_CONFIG = {
  SUPABASE_URL: "https://zxpwuxymdsoikoyfgjqw.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4cHd1eHltZHNvaWtveWZnanF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNDk1NjUsImV4cCI6MjA5NTgyNTU2NX0.s7m4AOfWWlQ3j0xNxyRHAP7b-jhE-FDoaMvLkD3ikgk"
};

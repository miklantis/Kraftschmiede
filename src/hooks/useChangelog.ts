import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { fetchLatestChangelog } from "@/lib/changelog";
import type { ChangelogEntry } from "@/schemas";

// Laedt den neuesten Changelog-Eintrag (die wartende Version) fuer das
// "Was ist neu"-Popup. enabled erst beim Oeffnen, damit ohne Bedarf kein
// Netz-Abruf passiert. gcTime 0: nicht im Offline-Cache halten, stets frisch.
export function useChangelog(enabled: boolean): {
  entry: ChangelogEntry | null | undefined;
  isLoading: boolean;
  isError: boolean;
} {
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.changelog(),
    queryFn: fetchLatestChangelog,
    enabled,
    staleTime: 0,
    gcTime: 0,
    retry: 1,
  });
  return { entry: data, isLoading, isError };
}

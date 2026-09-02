import type { MatchDiagnostics } from '../domain/triangle-duel/diagnostics';

export function diagnosticsJson(diagnostics: MatchDiagnostics): string {
  return JSON.stringify(diagnostics, null, 2);
}

export async function copyDiagnostics(diagnostics: MatchDiagnostics): Promise<void> {
  await navigator.clipboard.writeText(diagnosticsJson(diagnostics));
}

export function downloadDiagnostics(diagnostics: MatchDiagnostics): void {
  const url = URL.createObjectURL(
    new Blob([diagnosticsJson(diagnostics)], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = `triangle-duel-playtest-${diagnostics.boardSeed}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

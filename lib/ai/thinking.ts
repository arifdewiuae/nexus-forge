/**
 * The analyzer streams prose; older cached results sometimes had the suggester's
 * raw JSON array appended. Strip a trailing `[{ … "kind": … }]` block so only the
 * human-readable reasoning is shown in the trace.
 */
export function stripSuggesterJson(raw: string): string {
  const jsonStart = raw.search(/\n\s*\[\s*\{[\s\S]*?"kind"\s*:/)
  return jsonStart === -1 ? raw : raw.slice(0, jsonStart).trimEnd()
}

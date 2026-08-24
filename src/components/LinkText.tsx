import { linkTokens, normalizeUrl } from "../lib/links";

/**
 * Renderiza texto detectando vínculos. En el lienzo, Ctrl+Clic abre el
 * vínculo; el clic simple sigue seleccionando el nodo.
 */
export function LinkText({ text, tone = "dark" }: { text: string; tone?: "dark" | "light" }) {
  const tokens = linkTokens(text);
  if (tokens.length === 1 && !tokens[0].url) return <>{text}</>;
  return (
    <>
      {tokens.map((t, i) =>
        t.url ? (
          <span
            key={i}
            className={`nodal-link ${tone === "light" ? "nodal-link--light" : ""}`}
            data-href={normalizeUrl(t.url)}
            title={`${t.url}  ·  Ctrl+Clic para abrir`}
          >
            {t.text}
          </span>
        ) : (
          <span key={i}>{t.text}</span>
        ),
      )}
    </>
  );
}

// Allowlist sanitizer untuk rich-text soal.
//
// Soal disimpan sebagai HTML karena guru memang butuh format (bold, list, ukuran
// font) dan dirender lewat dangerouslySetInnerHTML. Tanpa sanitasi, HTML dari
// request tersimpan apa adanya dan menjadi stored XSS bagi siswa maupun admin.
//
// ponytail: satu implementasi berbasis string dipakai di server (proxy) dan di
// browser (renderer). Sanitizer ini tidak mem-parse HTML seperti browser; ia
// membangun ulang output hanya dari tag dan atribut yang dikenal, sehingga
// markup yang tidak dikenali hilang alih-alih lolos setengah jadi.

const ALLOWED_TAGS = new Set([
  "p", "br", "div", "span",
  "b", "strong", "i", "em", "u", "s", "strike",
  "ul", "ol", "li",
  "sub", "sup",
  "font",
  "a",
]);

const VOID_TAGS = new Set(["br"]);

// Tag yang isinya ikut dibuang, bukan hanya markup-nya.
const DROP_WITH_CONTENT = /<(script|style|iframe|object|embed|template|noscript)\b[\s\S]*?<\/\1\s*>/gi;
const UNCLOSED_DANGEROUS = /<(script|style|iframe|object|embed|template|noscript)\b[\s\S]*$/gi;
const COMMENTS = /<!--[\s\S]*?-->/g;
const TAG = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;

const SAFE_URL = /^(?:https?:|mailto:|\/|#)/i;
const FONT_SIZE = /^[1-7]$/;

function attr(rawAttrs: string, name: string): string | null {
  const re = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s"'>]+))`, "i");
  const m = rawAttrs.match(re);
  if (!m) return null;
  return (m[2] ?? m[3] ?? m[4] ?? "").trim();
}

function escapeText(text: string): string {
  return text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function openTag(tag: string, rawAttrs: string): string {
  if (tag === "a") {
    const href = attr(rawAttrs, "href") ?? "";
    // javascript:, data:, vbscript: dan skema lain tidak pernah diteruskan.
    if (!SAFE_URL.test(href)) return "<a>";
    return `<a href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer nofollow">`;
  }
  if (tag === "font") {
    const size = attr(rawAttrs, "size") ?? "";
    return FONT_SIZE.test(size) ? `<font size="${size}">` : "<font>";
  }
  // Semua atribut lain (on*, style, src, srcdoc, formaction, …) dibuang.
  return `<${tag}>`;
}

/**
 * Kembalikan HTML yang hanya berisi tag dan atribut dari allowlist.
 * Teks di luar tag dipertahankan; markup yang tidak dikenal dibuang.
 */
export function sanitizeQuestionHtml(input: unknown): string {
  if (typeof input !== "string" || input === "") return "";

  const stripped = input
    .replace(COMMENTS, "")
    .replace(DROP_WITH_CONTENT, "")
    .replace(UNCLOSED_DANGEROUS, "");

  const out: string[] = [];
  const open: string[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  TAG.lastIndex = 0;
  while ((match = TAG.exec(stripped)) !== null) {
    out.push(escapeText(stripped.slice(cursor, match.index)));
    cursor = TAG.lastIndex;

    const closing = match[1] === "/";
    const tag = match[2].toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) continue;

    if (VOID_TAGS.has(tag)) {
      if (!closing) out.push(`<${tag}>`);
      continue;
    }

    if (closing) {
      const at = open.lastIndexOf(tag);
      if (at === -1) continue; // penutup tanpa pembuka: buang
      while (open.length > at) out.push(`</${open.pop()}>`);
      continue;
    }

    open.push(tag);
    out.push(openTag(tag, match[3] ?? ""));
  }

  out.push(escapeText(stripped.slice(cursor)));
  while (open.length > 0) out.push(`</${open.pop()}>`);

  return out.join("");
}

/** Field soal yang menyimpan rich text dan karena itu wajib disanitasi. */
export const SANITIZED_QUESTION_FIELDS = [
  "pertanyaan",
  "opsi_a",
  "opsi_b",
  "opsi_c",
  "opsi_d",
  "opsi_e",
] as const;

/** Salin payload soal dengan seluruh field rich-text tersanitasi. */
export function sanitizeQuestionPayload(data: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = { ...data };
  for (const field of SANITIZED_QUESTION_FIELDS) {
    if (typeof clean[field] === "string") {
      clean[field] = sanitizeQuestionHtml(clean[field]);
    }
  }
  return clean;
}

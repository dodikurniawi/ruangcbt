// Pembaca .docx seperlunya: ambil teks per paragraf beserta penanda daftarnya.
//
// .docx adalah arsip ZIP berisi XML. Yang dibutuhkan import soal hanya dua berkas
// di dalamnya, jadi di sini ada pembaca ZIP kecil ketimbang menambah dependensi
// baru: DecompressionStream sudah tersedia di browser maupun Node, sehingga kode
// yang sama dipakai layar admin dan test.
//
// ponytail: hanya entri ZIP biasa (deflate/stored) yang didukung; berkas Zip64
// ditolak dengan pesan yang bisa dibaca guru, bukan dipaksa dibaca setengah jadi.

/** Satu paragraf dokumen, sudah lengkap dengan penanda nomor/hurufnya. */
export interface DocxBlock {
  text: string;
  /**
   * Penanda daftar: "1" untuk nomor soal, "A" untuk opsi, null bila paragraf biasa.
   * `listId` adalah identitas daftar Word-nya, dipakai parser untuk membedakan
   * daftar bernomor di dalam pertanyaan dari daftar nomor soal itu sendiri.
   */
  marker: { kind: "number" | "letter"; value: string; listId: string } | null;
  hasImage: boolean;
  isTable: boolean;
}

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const MAX_COMMENT_SCAN = 66 * 1024;

export class DocxError extends Error {}

function findEndOfCentralDirectory(view: DataView): number {
  const start = Math.max(0, view.byteLength - MAX_COMMENT_SCAN);
  for (let i = view.byteLength - 22; i >= start; i--) {
    if (view.getUint32(i, true) === EOCD_SIGNATURE) return i;
  }
  throw new DocxError("not-a-zip");
}

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Baca satu berkas di dalam .docx. null bila berkas itu memang tidak ada. */
async function readZipEntry(buffer: ArrayBuffer, wanted: string): Promise<string | null> {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const eocd = findEndOfCentralDirectory(view);
  const entryCount = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);

  const decoder = new TextDecoder("utf-8");
  for (let i = 0; i < entryCount; i++) {
    if (offset + 46 > view.byteLength || view.getUint32(offset, true) !== CENTRAL_SIGNATURE) {
      throw new DocxError("corrupt-zip");
    }
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));

    if (name === wanted) {
      if (compressedSize === 0xffffffff || localOffset === 0xffffffff) throw new DocxError("zip64");
      const localNameLength = view.getUint16(localOffset + 26, true);
      const localExtraLength = view.getUint16(localOffset + 28, true);
      const dataStart = localOffset + 30 + localNameLength + localExtraLength;
      const data = bytes.subarray(dataStart, dataStart + compressedSize);
      if (method === 0) return decoder.decode(data);
      if (method === 8) return decoder.decode(await inflateRaw(data));
      throw new DocxError("unsupported-compression");
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return null;
}

function decodeXmlText(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&");
}

// <w:t> dan <w:tabs> sama-sama diawali "<w:t"; pemisahnya adalah spasi atau ">".
const TEXT_NODE = /<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\s*\/>|<w:br\s*\/?>/g;

function paragraphText(xml: string): string {
  let text = "";
  // <w:tab/> dan <w:br/> ikut dipindai: tanpa itu dua kata yang dipisahkan tab
  // menempel menjadi satu kata setelah markup dibuang.
  for (const match of xml.matchAll(TEXT_NODE)) {
    text += match[1] === undefined ? " " : decodeXmlText(match[1]);
  }
  return text.replace(/\s+/g, " ").trim();
}

/** numId → format penomoran per level, dibaca dari word/numbering.xml. */
function buildNumberingMap(numberingXml: string | null): Map<string, Map<string, string>> {
  const result = new Map<string, Map<string, string>>();
  if (!numberingXml) return result;

  const abstractFormats = new Map<string, Map<string, string>>();
  for (const block of numberingXml.matchAll(/<w:abstractNum w:abstractNumId="(\d+)"[\s\S]*?<\/w:abstractNum>/g)) {
    const levels = new Map<string, string>();
    for (const level of block[0].matchAll(/<w:lvl w:ilvl="(\d+)"[\s\S]*?<\/w:lvl>/g)) {
      const format = level[0].match(/<w:numFmt w:val="([^"]+)"/);
      if (format) levels.set(level[1], format[1]);
    }
    abstractFormats.set(block[1], levels);
  }

  for (const link of numberingXml.matchAll(/<w:num w:numId="(\d+)"[^>]*>\s*<w:abstractNumId w:val="(\d+)"\s*\/>/g)) {
    const levels = abstractFormats.get(link[2]);
    if (levels) result.set(link[1], levels);
  }
  return result;
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * Paragraf dokumen dalam urutan aslinya. Penomoran otomatis Word direkonstruksi
 * menjadi penanda yang sama bentuknya dengan dokumen yang nomornya diketik
 * manual, sehingga parser soal hanya perlu mengenal satu bentuk masukan.
 */
export async function extractDocxBlocks(buffer: ArrayBuffer): Promise<DocxBlock[]> {
  const documentXml = await readZipEntry(buffer, "word/document.xml");
  if (!documentXml) throw new DocxError("not-a-docx");
  const numbering = buildNumberingMap(await readZipEntry(buffer, "word/numbering.xml"));

  const body = documentXml.match(/<w:body>([\s\S]*)<\/w:body>/);
  if (!body) throw new DocxError("empty-document");

  const blocks: DocxBlock[] = [];
  const counters = new Map<string, number>();

  for (const chunk of body[1].matchAll(/<w:tbl>[\s\S]*?<\/w:tbl>|<w:p(?: [^>]*)?>[\s\S]*?<\/w:p>|<w:p(?: [^>]*)?\/>/g)) {
    const xml = chunk[0];
    const isTable = xml.startsWith("<w:tbl");
    const hasImage = xml.includes("<w:drawing") || xml.includes("<w:pict");
    const text = paragraphText(xml);

    let marker: DocxBlock["marker"] = null;
    if (!isTable) {
      const numId = xml.match(/<w:numId w:val="(\d+)"/);
      const ilvl = xml.match(/<w:ilvl w:val="(\d+)"/);
      const format = numId ? numbering.get(numId[1])?.get(ilvl ? ilvl[1] : "0") : undefined;
      if (numId && format) {
        const key = `${numId[1]}:${ilvl ? ilvl[1] : "0"}`;
        const index = (counters.get(key) ?? 0) + 1;
        counters.set(key, index);
        if (format === "decimal") {
          marker = { kind: "number", value: String(index), listId: key };
        } else if (format === "upperLetter" || format === "lowerLetter") {
          marker = { kind: "letter", value: LETTERS[(index - 1) % 26], listId: key };
        }
      }
    }

    if (text === "" && !hasImage && !isTable) continue;
    blocks.push({ text, marker, hasImage, isTable });
  }

  return blocks;
}

/** Pesan siap tampil untuk guru; detail teknis tidak pernah sampai ke layar. */
export function docxErrorMessage(error: unknown): string {
  const reason = error instanceof DocxError ? error.message : "";
  if (reason === "not-a-zip" || reason === "not-a-docx" || reason === "corrupt-zip") {
    return "File tidak dapat dibaca. Pastikan file benar-benar dokumen Word (.docx) dan tidak rusak.";
  }
  if (reason === "zip64" || reason === "unsupported-compression") {
    return "File Word ini memakai format penyimpanan yang belum didukung. Buka di Word lalu simpan ulang sebagai .docx.";
  }
  if (reason === "empty-document") return "Dokumen Word ini kosong.";
  return "Gagal membaca file Word. Coba simpan ulang dokumennya lalu unggah lagi.";
}

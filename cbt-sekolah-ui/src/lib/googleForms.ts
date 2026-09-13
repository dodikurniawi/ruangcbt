export type GoogleSupportedQuestionType = "SINGLE" | "TRUE_FALSE" | "FILL_IN";

export interface GoogleFormListItem {
  id: string;
  name: string;
  modifiedTime: string;
}

export interface GooglePreviewQuestion {
  sourceId: string;
  nomor_urut: number;
  tipe: GoogleSupportedQuestionType | null;
  pertanyaan: string;
  opsi_a: string;
  opsi_b: string;
  opsi_c: string;
  opsi_d: string;
  opsi_e: string;
  kunci_jawaban: string;
  bobot: number;
  data_soal?: Record<string, unknown>;
  issues: string[];
  imageUrl: string;
  imageAlt: string;
}

export interface GoogleFormPreview {
  id: string;
  title: string;
  description: string;
  questions: GooglePreviewQuestion[];
  skippedItems: number;
}

export interface GoogleImportPayloadRow {
  nomor_urut: number;
  tipe: GoogleSupportedQuestionType;
  pertanyaan: string;
  gambar_url: string;
  opsi_a: string;
  opsi_b: string;
  opsi_c: string;
  opsi_d: string;
  opsi_e: string;
  kunci_jawaban: string;
  bobot: number;
  kategori: string;
  id_mapel: string;
  data_soal?: Record<string, unknown>;
}

interface GoogleImage {
  contentUri?: unknown;
  altText?: unknown;
}

interface GoogleOption {
  value?: unknown;
  image?: GoogleImage;
  isOther?: unknown;
}

interface GoogleQuestion {
  questionId?: unknown;
  grading?: {
    pointValue?: unknown;
    correctAnswers?: { answers?: { value?: unknown }[] };
  };
  choiceQuestion?: { type?: unknown; options?: GoogleOption[] };
  textQuestion?: { paragraph?: unknown };
  rowQuestion?: { title?: unknown };
}

interface GoogleFormItem {
  itemId?: unknown;
  title?: unknown;
  description?: unknown;
  questionItem?: { question?: GoogleQuestion; image?: GoogleImage };
  questionGroupItem?: {
    questions?: GoogleQuestion[];
    image?: GoogleImage;
    grid?: { columns?: { type?: unknown; options?: GoogleOption[] } };
  };
  pageBreakItem?: unknown;
  textItem?: unknown;
  imageItem?: unknown;
  videoItem?: unknown;
}

interface GoogleFormResource {
  formId?: unknown;
  info?: { title?: unknown; description?: unknown };
  items?: GoogleFormItem[];
}

const OPTION_FIELDS = ["opsi_a", "opsi_b", "opsi_c", "opsi_d", "opsi_e"] as const;
const OPTION_KEYS = ["A", "B", "C", "D", "E"] as const;

export async function listGoogleForms(
  accessToken: string,
  pageToken = "",
  fetcher: typeof fetch = fetch,
): Promise<{ forms: GoogleFormListItem[]; nextPageToken: string }> {
  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set("q", "mimeType='application/vnd.google-apps.form' and trashed=false");
  url.searchParams.set("fields", "nextPageToken,files(id,name,modifiedTime)");
  url.searchParams.set("orderBy", "modifiedTime desc");
  url.searchParams.set("pageSize", "100");
  url.searchParams.set("spaces", "drive");
  if (pageToken) url.searchParams.set("pageToken", pageToken);

  const response = await googleFetch(url, accessToken, fetcher);
  const data = await response.json() as {
    files?: { id?: unknown; name?: unknown; modifiedTime?: unknown }[];
    nextPageToken?: unknown;
  };
  const forms = Array.isArray(data.files)
    ? data.files.flatMap((file) => {
        const id = text(file.id);
        const name = text(file.name);
        return id && name ? [{ id, name, modifiedTime: text(file.modifiedTime) }] : [];
      })
    : [];
  return { forms, nextPageToken: text(data.nextPageToken) };
}

export async function getGoogleForm(
  accessToken: string,
  formId: string,
  imageUrlFor: (contentUri: string, sourceId: string) => string,
  fetcher: typeof fetch = fetch,
): Promise<GoogleFormPreview> {
  const response = await googleFetch(
    new URL(`https://forms.googleapis.com/v1/forms/${encodeURIComponent(formId)}`),
    accessToken,
    fetcher,
  );
  return mapGoogleForm(await response.json() as GoogleFormResource, imageUrlFor);
}

export function mapGoogleForm(
  form: GoogleFormResource,
  imageUrlFor: (contentUri: string, sourceId: string) => string = () => "",
): GoogleFormPreview {
  const questions: GooglePreviewQuestion[] = [];
  let skippedItems = 0;
  for (const item of Array.isArray(form.items) ? form.items : []) {
    const nomor = questions.length + 1;
    if (item.questionItem?.question) {
      questions.push(mapSingleQuestionItem(item, nomor, imageUrlFor));
    } else if (item.questionGroupItem?.grid) {
      questions.push(mapGridItem(item, nomor, imageUrlFor));
    } else if (item.questionGroupItem) {
      questions.push(unsupportedQuestion(item, nomor));
    } else {
      skippedItems++;
    }
  }
  return {
    id: text(form.formId),
    title: text(form.info?.title) || "Google Form tanpa judul",
    description: text(form.info?.description),
    questions,
    skippedItems,
  };
}

export function isGoogleQuestionReady(question: GooglePreviewQuestion): boolean {
  return question.tipe !== null && question.issues.length === 0 && question.pertanyaan.trim() !== "";
}

export function markGoogleImageFailed(question: GooglePreviewQuestion): GooglePreviewQuestion {
  const issue = "Gambar tidak berhasil diambil.";
  return question.issues.includes(issue) ? question : { ...question, issues: [...question.issues, issue] };
}

export async function buildGoogleImportPayload(
  questions: readonly GooglePreviewQuestion[],
  startNomor: number,
  idMapel: string,
  copyImage: (url: string, sourceId: string) => Promise<string | null>,
): Promise<{ payload: GoogleImportPayloadRow[]; blockedByImages: number }> {
  const payload: GoogleImportPayloadRow[] = [];
  let blockedByImages = 0;
  let nomor = startNomor;
  for (const question of questions) {
    if (!isGoogleQuestionReady(question) || !question.tipe) continue;
    let gambar_url = "";
    if (question.imageUrl) {
      gambar_url = await copyImage(question.imageUrl, question.sourceId) ?? "";
      if (!gambar_url) {
        blockedByImages++;
        continue;
      }
    }
    const row: GoogleImportPayloadRow = {
      nomor_urut: ++nomor,
      tipe: question.tipe,
      pertanyaan: question.pertanyaan.trim(),
      gambar_url,
      opsi_a: question.opsi_a.trim(),
      opsi_b: question.opsi_b.trim(),
      opsi_c: question.opsi_c.trim(),
      opsi_d: question.opsi_d.trim(),
      opsi_e: question.opsi_e.trim(),
      kunci_jawaban: question.kunci_jawaban,
      bobot: question.bobot,
      kategori: "",
      id_mapel: idMapel,
    };
    if (question.data_soal) row.data_soal = question.data_soal;
    payload.push(row);
  }
  return { payload, blockedByImages };
}

export async function fetchGoogleImage(
  accessToken: string,
  sourceUrl: string,
  fetcher: typeof fetch = fetch,
): Promise<{ bytes: Uint8Array; mimeType: string }> {
  let url = new URL(sourceUrl);
  for (let redirects = 0; redirects <= 2; redirects++) {
    if (!isGoogleImageHost(url)) throw new Error("Gambar tidak berhasil diambil.");
    const response = await fetcher(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      redirect: "manual",
      cache: "no-store",
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirects === 2) throw new Error("Gambar tidak berhasil diambil.");
      url = new URL(location, url);
      continue;
    }
    if (!response.ok) throw new Error("Gambar tidak berhasil diambil.");
    const mimeType = (response.headers.get("content-type") ?? "").split(";", 1)[0].toLowerCase();
    if (!new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]).has(mimeType)) {
      throw new Error("Gambar tidak berhasil diambil.");
    }
    const statedSize = Number(response.headers.get("content-length") ?? 0);
    if (statedSize > 2 * 1024 * 1024) throw new Error("Gambar tidak berhasil diambil.");
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > 2 * 1024 * 1024) {
      throw new Error("Gambar tidak berhasil diambil.");
    }
    return { bytes, mimeType };
  }
  throw new Error("Gambar tidak berhasil diambil.");
}

function mapSingleQuestionItem(
  item: GoogleFormItem,
  nomor: number,
  imageUrlFor: (contentUri: string, sourceId: string) => string,
): GooglePreviewQuestion {
  const sourceId = text(item.questionItem?.question?.questionId) || text(item.itemId) || String(nomor);
  const question = item.questionItem!.question!;
  const base = baseQuestion(item, sourceId, nomor, question, item.questionItem?.image, imageUrlFor);

  if (question.choiceQuestion) {
    const type = text(question.choiceQuestion.type);
    if (type !== "RADIO" && type !== "DROP_DOWN") return unsupportedQuestion(item, nomor, sourceId);
    const options = Array.isArray(question.choiceQuestion.options) ? question.choiceQuestion.options : [];
    const values = options.map((option) => text(option.value));
    if (options.some((option) => option.isOther === true)) base.issues.push("Pilihan 'Lainnya' belum didukung RuangCBT.");
    if (options.some((option) => option.image)) base.issues.push("Gambar di dalam pilihan jawaban belum didukung RuangCBT.");
    if (values.length < 4 || values.slice(0, 4).some((value) => !value)) {
      base.issues.push("Opsi A sampai D belum lengkap.");
    }
    if (values.length > 5) base.issues.push("Soal memiliki lebih dari lima opsi.");
    const duplicateValues = new Set(values).size !== values.length;
    if (duplicateValues) base.issues.push("Ada pilihan jawaban dengan teks yang sama.");
    OPTION_FIELDS.forEach((field, index) => { base[field] = values[index] ?? ""; });

    const answers = correctAnswers(question);
    if (answers.length === 0) {
      base.issues.push("Kunci jawaban belum tersedia. Soal akan ditandai PERLU DICEK.");
    } else if (answers.length !== 1 || duplicateValues) {
      base.issues.push("Kunci jawaban tidak dapat dipetakan tanpa konflik.");
    } else {
      const answerIndex = values.indexOf(answers[0]);
      if (answerIndex < 0 || answerIndex >= OPTION_KEYS.length) {
        base.issues.push("Kunci jawaban tidak cocok dengan pilihan yang tersedia.");
      } else {
        base.kunci_jawaban = OPTION_KEYS[answerIndex];
      }
    }
    return base;
  }

  if (question.textQuestion && question.textQuestion.paragraph !== true) {
    base.tipe = "FILL_IN";
    const answers = correctAnswers(question).map((answer) => answer.trim()).filter(Boolean);
    const normalized = answers.map((answer) => answer.toLowerCase());
    if (answers.length === 0) {
      base.issues.push("Kunci jawaban belum tersedia. Soal akan ditandai PERLU DICEK.");
    } else if (new Set(normalized).size !== normalized.length) {
      base.issues.push("Kunci jawaban memiliki nilai yang berulang atau berkonflik.");
    } else {
      base.kunci_jawaban = JSON.stringify({
        accepted_answers: answers,
        case_sensitive: false,
        trim: true,
      });
    }
    base.data_soal = { petunjuk: text(item.description) || "Isi jawaban singkat sesuai pertanyaan." };
    return base;
  }

  return unsupportedQuestion(item, nomor, sourceId);
}

function mapGridItem(
  item: GoogleFormItem,
  nomor: number,
  imageUrlFor: (contentUri: string, sourceId: string) => string,
): GooglePreviewQuestion {
  const sourceId = text(item.itemId) || String(nomor);
  const group = item.questionGroupItem!;
  const columns = group.grid?.columns;
  const options = Array.isArray(columns?.options) ? columns!.options! : [];
  const values = options.map((option) => text(option.value));
  const mapped = values.map(booleanAnswer);
  if (
    text(columns?.type) !== "RADIO" ||
    mapped.length !== 2 ||
    !mapped.includes("BENAR") ||
    !mapped.includes("SALAH") ||
    options.some((option) => option.image || option.isOther === true)
  ) return unsupportedQuestion(item, nomor, sourceId);

  const rows = Array.isArray(group.questions) ? group.questions : [];
  const base = baseQuestion(item, sourceId, nomor, undefined, group.image, imageUrlFor);
  base.tipe = "TRUE_FALSE";
  if (rows.length === 0) base.issues.push("Pernyataan TRUE/FALSE tidak ditemukan.");
  const statements: { id: string; teks: string }[] = [];
  const key: Record<string, "BENAR" | "SALAH"> = {};
  const points: number[] = [];
  const usedIds = new Set<string>();
  rows.forEach((row, index) => {
    const id = text(row.questionId) || String(index + 1);
    const rowText = text(row.rowQuestion?.title);
    if (!rowText) base.issues.push("Ada pernyataan TRUE/FALSE yang kosong.");
    if (usedIds.has(id)) base.issues.push("ID pernyataan TRUE/FALSE berulang.");
    usedIds.add(id);
    statements.push({ id, teks: rowText });
    const answers = correctAnswers(row);
    const answer = answers.length === 1 ? booleanAnswer(answers[0]) : null;
    if (!answer) base.issues.push("Kunci TRUE/FALSE belum tersedia atau berkonflik.");
    else key[id] = answer;
    const point = validPoint(row.grading?.pointValue);
    if (point === null) base.issues.push("Bobot TRUE/FALSE tidak dapat dipetakan dengan aman.");
    else points.push(point);
  });
  if (points.length === rows.length && new Set(points).size > 1) {
    base.issues.push("Bobot tiap pernyataan berbeda dan tidak dapat dipetakan dengan aman.");
  }
  const totalPoints = points.reduce((sum, point) => sum + point, 0);
  if (totalPoints > 100) base.issues.push("Total bobot soal melebihi batas RuangCBT.");
  else if (totalPoints > 0) base.bobot = totalPoints;
  base.data_soal = { pernyataan: statements };
  if (Object.keys(key).length === rows.length && rows.length > 0) base.kunci_jawaban = JSON.stringify(key);
  return base;
}

function baseQuestion(
  item: GoogleFormItem,
  sourceId: string,
  nomor: number,
  question: GoogleQuestion | undefined,
  image: GoogleImage | undefined,
  imageUrlFor: (contentUri: string, sourceId: string) => string,
): GooglePreviewQuestion {
  const issues: string[] = [];
  const pertanyaan = text(item.title);
  if (!pertanyaan) issues.push("Pertanyaan tidak terbaca.");
  const point = question?.grading?.pointValue;
  const bobot = point === undefined ? 1 : validPoint(point);
  if (point !== undefined && bobot === null) issues.push("Bobot harus angka antara 1 dan 100.");
  const contentUri = text(image?.contentUri);
  if (image && !contentUri) issues.push("Gambar tidak berhasil diambil.");
  return {
    sourceId,
    nomor_urut: nomor,
    tipe: "SINGLE",
    pertanyaan,
    opsi_a: "", opsi_b: "", opsi_c: "", opsi_d: "", opsi_e: "",
    kunci_jawaban: "",
    bobot: bobot ?? 1,
    issues,
    imageUrl: contentUri ? imageUrlFor(contentUri, sourceId) : "",
    imageAlt: text(image?.altText) || `Gambar soal ${nomor}`,
  };
}

function unsupportedQuestion(item: GoogleFormItem, nomor: number, sourceId = text(item.itemId) || String(nomor)) {
  return {
    ...baseQuestion(item, sourceId, nomor, undefined, undefined, () => ""),
    tipe: null,
    issues: ["Jenis soal ini belum didukung RuangCBT."],
  } satisfies GooglePreviewQuestion;
}

function correctAnswers(question: GoogleQuestion): string[] {
  const answers = question.grading?.correctAnswers?.answers;
  return Array.isArray(answers) ? answers.map((answer) => text(answer.value)).filter(Boolean) : [];
}

function validPoint(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 100 ? value : null;
}

function booleanAnswer(value: string): "BENAR" | "SALAH" | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === "benar" || normalized === "true") return "BENAR";
  if (normalized === "salah" || normalized === "false") return "SALAH";
  return null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function googleFetch(url: URL, accessToken: string, fetcher: typeof fetch): Promise<Response> {
  const response = await fetcher(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (response.status === 401) throw new Error("Sesi Google Anda sudah berakhir. Hubungkan kembali akun Google.");
  if (response.status === 403) throw new Error("Google belum memberikan izin untuk membaca Form.");
  if (!response.ok) throw new Error("Form ini tidak dapat dibaca oleh RuangCBT.");
  return response;
}

function isGoogleImageHost(url: URL): boolean {
  if (url.protocol !== "https:") return false;
  return ["googleusercontent.com", "google.com", "gstatic.com", "ggpht.com"]
    .some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
}

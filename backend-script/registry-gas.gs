// =====================================
// CBT Registry GAS - Central Tenant Registry
// Deploy SEKALI sebagai Web App (Execute as: Me, Access: Anyone)
// =====================================

// LANGKAH SETUP:
// 1. Buat Google Spreadsheet baru bernama "CBT Registry"
// 2. Buat sheet bernama "Registry" dengan kolom:
//    A: school_id | B: school_name | C: gas_url | D: active | E: shared_secret
// 3. Tambahkan shared secret unik minimal 32 karakter untuk setiap tenant di kolom E
// 4. Ganti nilai REGISTRY_SHEET_ID di bawah dengan ID spreadsheet tersebut
//    (ambil dari URL: docs.google.com/spreadsheets/d/[ID]/edit)
// 5. Tambahkan Script Property REGISTRY_LOOKUP_SECRET (minimal 32 karakter)
// 6. Deploy sebagai Web App: Execute as Me, Anyone can access
// 7. Salin URL exec ke env REGISTRY_GAS_URL di Next.js

const REGISTRY_SHEET_ID = 'GANTI_DENGAN_REGISTRY_SHEET_ID';
const REGISTRY_SECRET_PROPERTY = 'REGISTRY_LOOKUP_SECRET';

function doGet(e) {
  try {
    const expectedSecret = PropertiesService.getScriptProperties().getProperty(REGISTRY_SECRET_PROPERTY);
    const params = e && e.parameter ? e.parameter : {};
    const canReadSecret = expectedSecret && expectedSecret.length >= 32 &&
      secureEquals(params.registry_secret, expectedSecret);
    const schoolId = params.school_id;
    if (!schoolId) {
      return respond({ success: false, message: 'school_id diperlukan' });
    }
    return handleGetTenant(schoolId, canReadSecret);
  } catch (error) {
    return respond({ success: false, message: error.toString() });
  }
}

function handleGetTenant(schoolId, canReadSecret) {
  const ss = SpreadsheetApp.openById(REGISTRY_SHEET_ID);
  const sheet = ss.getSheetByName('Registry');

  if (!sheet) {
    return respond({ success: false, message: 'Sheet Registry tidak ditemukan' });
  }

  const rows = sheet.getDataRange().getValues();

  // Skip header row (row 0)
  for (let i = 1; i < rows.length; i++) {
    const rowSchoolId = rows[i][0];
    const rowActive   = rows[i][3];

    if (rowSchoolId === schoolId && rowActive === true) {
      if (canReadSecret && (!rows[i][4] || String(rows[i][4]).length < 32)) {
        return respond({ success: false, message: 'Konfigurasi keamanan sekolah belum lengkap' });
      }
      const tenant = {
        success:     true,
        school_id:   rows[i][0],
        school_name: rows[i][1],
        gas_url:     rows[i][2],
      };
      if (canReadSecret) tenant.shared_secret = rows[i][4];
      return respond(tenant);
    }
  }

  return respond({ success: false, message: 'Sekolah tidak ditemukan atau tidak aktif' });
}

function secureEquals(left, right) {
  left = String(left || '');
  right = String(right || '');
  let mismatch = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i++) {
    mismatch |= (left.charCodeAt(i) || 0) ^ (right.charCodeAt(i) || 0);
  }
  return mismatch === 0;
}

function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

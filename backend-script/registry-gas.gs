// =====================================
// CBT Registry GAS - Central Tenant Registry
// Deploy SEKALI sebagai Web App (Execute as: Me, Access: Anyone)
// =====================================

// LANGKAH SETUP:
// 1. Buat Google Spreadsheet baru bernama "CBT Registry"
// 2. Buat sheet bernama "Registry" dengan kolom:
//    A: school_id | B: school_name | C: gas_url | D: active
// 3. Ganti nilai REGISTRY_SHEET_ID di bawah dengan ID spreadsheet tersebut
//    (ambil dari URL: docs.google.com/spreadsheets/d/[ID]/edit)
// 4. Deploy sebagai Web App: Execute as Me, Anyone can access
// 5. Salin URL exec ke env REGISTRY_GAS_URL di Next.js

const REGISTRY_SHEET_ID = 'GANTI_DENGAN_REGISTRY_SHEET_ID';

function doGet(e) {
  try {
    const schoolId = e.parameter.school_id;
    if (!schoolId) {
      return respond({ success: false, message: 'school_id diperlukan' });
    }
    return handleGetTenant(schoolId);
  } catch (error) {
    return respond({ success: false, message: error.toString() });
  }
}

function handleGetTenant(schoolId) {
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
      return respond({
        success:     true,
        school_id:   rows[i][0],
        school_name: rows[i][1],
        gas_url:     rows[i][2],
      });
    }
  }

  return respond({ success: false, message: 'Sekolah tidak ditemukan atau tidak aktif' });
}

function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

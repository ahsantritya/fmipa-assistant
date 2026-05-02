// sheets.js — Modul pembaca Google Sheets untuk data FMIPA ITB
// Membaca 4 tab: Info Umum, FAQ, Jadwal Penting, Kontak Punakawan
// Cache 5 detik, fallback ke data hardcoded jika error

require('dotenv').config();
const { google } = require('googleapis');

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const CACHE_TTL_MS = 5000; // 5 detik

// ── Auth Google via Service Account ──────────────────────────────────────────
function buatAuth() {
  return new google.auth.GoogleAuth({
    keyFile: 'credentials.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
}

// ── Cache sederhana berbasis timestamp ────────────────────────────────────────
let cache = {
  data: null,
  waktu: 0,
};

// ── Data fallback jika Google Sheets tidak bisa diakses ──────────────────────
const DATA_DEFAULT = {
  infoUmum: {
    'Nama Fakultas': 'Fakultas Matematika dan Ilmu Pengetahuan Alam (FMIPA) ITB',
    'Lokasi Kampus': 'Kampus ITB Jatinangor, Jl. Let. Jen. Purn. Dr. (HC) Mashudi No.1, Sumedang',
    'Tahun Angkatan': '2026',
    'Website Resmi': 'https://www.fmipa.itb.ac.id',
    'Program Studi': 'Matematika, Fisika, Kimia, Astronomi, Aktuaria',
    'Sistem Akademik': 'Sistem Kredit Semester (SKS) dengan TPB di tahun pertama',
  },
  faq: [
    {
      pertanyaan: 'Apa itu TPB?',
      jawaban:
        'TPB (Tahap Persiapan Bersama) adalah program tahun pertama di ITB di mana semua mahasiswa baru mengambil mata kuliah dasar bersama sebelum masuk prodi masing-masing.',
    },
    {
      pertanyaan: 'Bagaimana cara memilih prodi di FMIPA?',
      jawaban:
        'Pemilihan prodi dilakukan setelah menyelesaikan TPB (akhir semester 2) berdasarkan nilai IPK dan seleksi. Prodi di FMIPA: Matematika, Fisika, Kimia, Astronomi, Aktuaria.',
    },
    {
      pertanyaan: 'Apa saja fasilitas di kampus Jatinangor?',
      jawaban:
        'Kampus Jatinangor memiliki perpustakaan, laboratorium lengkap, asrama mahasiswa, kantin, masjid, lapangan olahraga, dan pusat kesehatan mahasiswa.',
    },
    {
      pertanyaan: 'Berapa SKS minimal untuk lulus?',
      jawaban:
        'Minimal 144 SKS untuk lulus S1. Selama TPB, mahasiswa mengambil sekitar 36–40 SKS mata kuliah dasar wajib.',
    },
  ],
  jadwalPenting: [
    {
      kegiatan: 'Orientasi Studi (Ospek ITB)',
      tanggal: 'Agustus 2026',
      keterangan: 'Kegiatan pengenalan kampus dan kehidupan akademik ITB',
    },
    {
      kegiatan: 'Awal Perkuliahan Semester 1',
      tanggal: 'September 2026',
      keterangan: 'Dimulainya perkuliahan resmi untuk mahasiswa baru',
    },
    {
      kegiatan: 'UTS Semester 1',
      tanggal: 'Oktober–November 2026',
      keterangan: 'Ujian Tengah Semester',
    },
    {
      kegiatan: 'UAS Semester 1',
      tanggal: 'Desember 2026 – Januari 2027',
      keterangan: 'Ujian Akhir Semester',
    },
  ],
  kontakPunakawan: [
    {
      nama: 'Punakawan FMIPA ITB',
      jabatan: 'Tim Pendamping Mahasiswa Baru',
      kontak: 'Hubungi via Instagram @punakawanfmipaitb atau LINE: punakawan_fmipa',
    },
    {
      nama: 'Sekretariat FMIPA',
      jabatan: 'Administrasi Akademik',
      kontak: 'Gedung Dekanat FMIPA, Kampus Jatinangor',
    },
  ],
};

// ── Ambil satu range dari Sheets ──────────────────────────────────────────────
async function ambilRange(sheets, range) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range,
  });
  // Lewati baris pertama (header), kembalikan sisanya
  const rows = res.data.values || [];
  return rows.slice(1);
}

// ── Baca tab "Info Umum": A=Key, B=Value → object ─────────────────────────────
async function bacaInfoUmum(sheets) {
  const rows = await ambilRange(sheets, 'Info Umum!A:B');
  const obj = {};
  for (const row of rows) {
    if (row[0]) obj[row[0]] = row[1] || '';
  }
  return obj;
}

// ── Baca tab "FAQ": A=Pertanyaan, B=Jawaban → array ───────────────────────────
async function bacaFAQ(sheets) {
  const rows = await ambilRange(sheets, 'FAQ!A:B');
  return rows
    .filter((r) => r[0])
    .map((r) => ({ pertanyaan: r[0], jawaban: r[1] || '' }));
}

// ── Baca tab "Jadwal Penting": A=Kegiatan, B=Tanggal, C=Keterangan → array ───
async function bacaJadwal(sheets) {
  const rows = await ambilRange(sheets, 'Jadwal Penting!A:C');
  return rows
    .filter((r) => r[0])
    .map((r) => ({ kegiatan: r[0], tanggal: r[1] || '', keterangan: r[2] || '' }));
}

// ── Baca tab "Kontak Punakawan": A=Nama, B=Jabatan, C=Kontak → array ─────────
async function bacaKontak(sheets) {
  const rows = await ambilRange(sheets, 'Kontak Punakawan!A:C');
  return rows
    .filter((r) => r[0])
    .map((r) => ({ nama: r[0], jabatan: r[1] || '', kontak: r[2] || '' }));
}

// ── Fungsi utama: ambil semua data dengan cache ───────────────────────────────
async function ambilSemuaData() {
  const sekarang = Date.now();

  // Kembalikan cache jika masih valid
  if (cache.data && sekarang - cache.waktu < CACHE_TTL_MS) {
    return cache.data;
  }

  try {
    const auth = buatAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const [infoUmum, faq, jadwalPenting, kontakPunakawan] = await Promise.all([
      bacaInfoUmum(sheets),
      bacaFAQ(sheets),
      bacaJadwal(sheets),
      bacaKontak(sheets),
    ]);

    const data = { infoUmum, faq, jadwalPenting, kontakPunakawan };
    cache = { data, waktu: sekarang };
    return data;
  } catch (err) {
    console.error('[Sheets] Gagal baca Google Sheets, pakai data default:', err.message);
    // Jika cache lama masih ada, gunakan itu; kalau tidak, pakai hardcoded
    return cache.data || DATA_DEFAULT;
  }
}

module.exports = { ambilSemuaData };

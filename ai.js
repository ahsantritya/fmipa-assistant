// ai.js — Modul AI menggunakan Claude Haiku via Anthropic SDK
// Bot bernama "Kawan", asisten virtual untuk maba FMIPA ITB 2026

require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const { ambilSemuaData } = require('./sheets');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = 'claude-haiku-4-5-20251001';
const MAKS_RIWAYAT = 25; // maksimal pesan dalam satu sesi

// ── Penyimpanan riwayat percakapan per sesi (sessionId → array messages) ──────
const riwayatSesi = new Map();

// ── Bangun system prompt dinamis dari data Google Sheets ──────────────────────
async function buatSystemPrompt() {
  const data = await ambilSemuaData();

  // Formatkan Info Umum
  const infoUmumTeks = Object.entries(data.infoUmum)
    .map(([k, v]) => `• ${k}: ${v}`)
    .join('\n');

  // Formatkan FAQ
  const faqTeks = data.faq
    .map((item, i) => `${i + 1}. T: ${item.pertanyaan}\n   J: ${item.jawaban}`)
    .join('\n\n');

  // Formatkan Jadwal Penting
  const jadwalTeks = data.jadwalPenting
    .map((item) => `• ${item.kegiatan} — ${item.tanggal}: ${item.keterangan}`)
    .join('\n');

  // Formatkan Kontak Punakawan
  const kontakTeks = data.kontakPunakawan
    .map((item) => `• ${item.nama} (${item.jabatan}): ${item.kontak}`)
    .join('\n');

  return `Kamu adalah "Kawan" — asisten virtual dari tim Punakawan FMIPA ITB untuk mahasiswa baru angkatan 2026.

KEPRIBADIAN & GAYA BAHASA:
- Gunakan Bahasa Indonesia yang santai, hangat, dan supportif seperti kakak tingkat yang baik
- Sapa pengguna dengan "kak"
- Gunakan emoji secukupnya agar percakapan terasa lebih hidup (jangan berlebihan)
- Selalu bersemangat dan positif dalam membantu maba
- Jika tidak tahu jawaban, jujur dan arahkan ke punakawan atau website resmi

RUANG LINGKUP YANG BISA DIJAWAB:
1. Pertanyaan tentang FMIPA ITB, TPB, prodi, dan kurikulum
2. Informasi jadwal penting kampus
3. Sistem akademik ITB (SKS, IPK, KRS, dll)
4. Fasilitas kampus Jatinangor
5. Tips dan semangat untuk mahasiswa baru
6. Mengarahkan ke kontak punakawan yang tepat

PENTING: Jangan jawab pertanyaan di luar konteks FMIPA ITB dan kehidupan kampus ITB.

═══════════════════════════════════════
DATA RESMI FMIPA ITB (diperbarui otomatis)
═══════════════════════════════════════

📋 INFO UMUM:
${infoUmumTeks}

❓ FAQ YANG SERING DITANYAKAN:
${faqTeks}

📅 JADWAL PENTING:
${jadwalTeks}

📞 KONTAK PUNAKAWAN:
${kontakTeks}
═══════════════════════════════════════`;
}

// ── Fungsi utama: kirim pesan dan dapatkan balasan ────────────────────────────
async function kirimPesan(sessionId, pesanUser) {
  // Ambil atau buat riwayat untuk sesi ini
  if (!riwayatSesi.has(sessionId)) {
    riwayatSesi.set(sessionId, []);
  }
  const riwayat = riwayatSesi.get(sessionId);

  // Tambahkan pesan user ke riwayat
  riwayat.push({ role: 'user', content: pesanUser });

  // Pangkas riwayat agar tidak melebihi batas (simpan pasangan user-assistant)
  while (riwayat.length > MAKS_RIWAYAT) {
    riwayat.splice(0, 2); // hapus pasangan terlama
  }

  // Bangun system prompt dengan data terkini dari Sheets
  const systemPrompt = await buatSystemPrompt();

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: riwayat,
    });

    const balasan = response.content[0].text;

    // Simpan balasan ke riwayat
    riwayat.push({ role: 'assistant', content: balasan });

    return balasan;
  } catch (err) {
    console.error('[AI] Error memanggil Claude API:', err.message);
    throw err;
  }
}

// ── Hapus riwayat sesi (untuk /start atau reset) ──────────────────────────────
function hapusSesi(sessionId) {
  riwayatSesi.delete(sessionId);
}

module.exports = { kirimPesan, hapusSesi };

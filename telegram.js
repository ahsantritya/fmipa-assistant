// telegram.js — Modul Telegram Bot untuk Kawan FMIPA ITB
// Mode polling, handler /start dan pesan umum, kirim ke ai.js

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { kirimPesan, hapusSesi } = require('./ai');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Pastikan token tersedia sebelum inisialisasi
if (!TOKEN) {
  console.error('[Telegram] TELEGRAM_BOT_TOKEN tidak ditemukan di .env');
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });

// ── Pesan sambutan saat /start ────────────────────────────────────────────────
const PESAN_START = `Halo kak! 👋 Selamat datang di FMIPA ITB 2026! 🎉

Aku Kawan, asisten virtual dari punakawan FMIPA. Aku bisa bantu jawab pertanyaan seputar perkuliahan, ospek, prodi, dan kehidupan kampus di ITB. 😊

Mau tanya apa nih kak? 🌟`;

// ── Handler perintah /start ───────────────────────────────────────────────────
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  // Reset sesi agar percakapan mulai dari awal
  hapusSesi(chatId.toString());

  try {
    await bot.sendMessage(chatId, PESAN_START);
    console.log(`[Telegram] /start dari chatId: ${chatId}`);
  } catch (err) {
    console.error('[Telegram] Gagal kirim pesan /start:', err.message);
  }
});

// ── Handler pesan teks biasa ──────────────────────────────────────────────────
bot.on('message', async (msg) => {
  // Abaikan pesan non-teks dan perintah /start (sudah ditangani di atas)
  if (!msg.text || msg.text.startsWith('/')) return;

  const chatId = msg.chat.id;
  const sessionId = chatId.toString();
  const pesanUser = msg.text.trim();

  console.log(`[Telegram] Pesan masuk dari ${chatId}: "${pesanUser.substring(0, 50)}..."`);

  try {
    // Kirim indikator "sedang mengetik"
    await bot.sendChatAction(chatId, 'typing');

    // Dapatkan balasan dari AI
    const balasan = await kirimPesan(sessionId, pesanUser);

    // Kirim balasan ke user
    await bot.sendMessage(chatId, balasan, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('[Telegram] Error saat memproses pesan:', err.message);

    // Coba kirim ulang tanpa Markdown jika formatting gagal
    try {
      await bot.sendMessage(
        chatId,
        'Maaf kak, aku lagi ada gangguan teknis sebentar 😅 Coba tanya lagi ya!'
      );
    } catch (fallbackErr) {
      console.error('[Telegram] Gagal kirim pesan error fallback:', fallbackErr.message);
    }
  }
});

// ── Handler error polling ─────────────────────────────────────────────────────
bot.on('polling_error', (err) => {
  console.error('[Telegram] Polling error:', err.message);
});

bot.on('error', (err) => {
  console.error('[Telegram] Bot error:', err.message);
});

console.log('[Telegram] Bot Kawan FMIPA ITB aktif dalam mode polling... 🚀');

module.exports = bot;

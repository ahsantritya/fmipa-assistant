// server.js — Entry point aplikasi Kawan FMIPA ITB 2026
// Menjalankan Express server, endpoint /chat, dan Telegram Bot

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { kirimPesan } = require('./ai');

// Inisialisasi Telegram Bot (jika token tersedia)
if (process.env.TELEGRAM_BOT_TOKEN) {
  require('./telegram');
} else {
  console.warn('[Server] TELEGRAM_BOT_TOKEN tidak ada, Telegram Bot tidak dijalankan.');
}

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Sajikan file statis dari folder public/ (web chat UI)
app.use(express.static(path.join(__dirname, 'public')));

// ── POST /chat — endpoint utama web chat ──────────────────────────────────────
app.post('/chat', async (req, res) => {
  const { message, sessionId } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Field "message" wajib diisi.' });
  }

  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'Field "sessionId" wajib diisi.' });
  }

  try {
    const balasan = await kirimPesan(sessionId, message.trim());
    res.json({ reply: balasan });
  } catch (err) {
    console.error('[Server] Error di endpoint /chat:', err.message);
    res.status(500).json({ error: 'Terjadi kesalahan internal. Coba lagi sebentar.' });
  }
});

// ── Fallback: semua route lain arahkan ke index.html ─────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Jalankan server ───────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[Server] Kawan FMIPA ITB berjalan di http://localhost:${PORT} 🚀`);
});

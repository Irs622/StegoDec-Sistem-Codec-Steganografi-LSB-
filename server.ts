import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

// Init Gemini Client lazily
let aiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required. Please configure it in the Secrets Panel.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  const PORT = 3000;

  // AI Decoy text generator
  app.post("/api/gemini/decoy", async (req, res) => {
    try {
      const { secretMessage, category } = req.body;
      if (!secretMessage) {
        return res.status(400).json({ error: "Secret message is required" });
      }

      let client;
      try {
        client = getGeminiClient();
      } catch (keyErr: any) {
        // Handle lack of API key gracefully without crashing the endpoint
        return res.json({
          decoyText: `[Gagal membuat umpan AI - API Key belum diset] Halo! Ini file media titipan saya. Tolong simpan baik-baik ya.`
        });
      }

      const stylePrompt = category || "Casual Greeting";

      const prompt = `Hasilkan teks umpan (decoy text) yang sangat natural dalam Bahasa Indonesia (maksimal 2-3 kalimat) sesuai dengan tema/kategori "${stylePrompt}".
Teks ini akan digunakan sebagai pesan penutup atau deskripsi tampak luar yang sama sekali tidak mencurigakan (seolah-olah hanya membagikan foto liburan, tugas kuliah, atau sapaan biasa).
SANGAT PENTING: Jangan masukkan bagian dari pesan rahasia ("$secretMessage") ke dalam teks umpan ini. Buat teks ini terasa biasa saja, kasual, dan aman dibaca siapa pun tanpa menimbulkan kecurigaan.
Kembalikan respon JSON persis dalam format ini: {"decoyText": "Teks umpan di sini"}`;

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Pesan rahasia: "${secretMessage}". Kategori Umpan: "${stylePrompt}".\n\n${prompt}`,
        config: {
          responseMimeType: "application/json",
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error("Empty response from AI");
      }
      res.json(JSON.parse(text));
    } catch (err: any) {
      console.error(err);
      res.json({
        decoyText: `Foto liburan waktu itu seru ya! Ini file media kompresinya biar hemat kuota kirim lewat chat. Kabari kalau sudah diunduh!`
      });
    }
  });

  // Security analysis
  app.post("/api/gemini/analyze", async (req, res) => {
    const { fileSizeKB, fileType, messageLength, hasPassword } = req.body || {};
    const isSecured = !!hasPassword;

    try {
      let client;
      try {
        client = getGeminiClient();
      } catch (keyErr: any) {
        // Fallback response if API key is not configured yet
        return res.json({
          stealthScore: isSecured ? 85 : 45,
          visualRisk: "Low",
          sizeRisk: "Low",
          cryptoRisk: isSecured ? "Low" : "High",
          analysisText: "Analisis keamanan lokal: Menggunakan kompresi standard. Sangat disarankan mengaktifkan Kata Sandi (Password) untuk mencegah ekstraksi mentah oleh pihak ketiga yang tidak berwenang.",
          tips: ["Aktifkan enkripsi Kata Sandi (Password)", "Gunakan gambar cover berukuran minimal 500KB untuk kamuflase sempurna"]
        });
      }

      const prompt = `Lakukan analisis keamanan ("Steg-analysis") simulasi dari proses steganografi dengan parameter:
- Tipe File Cover: ${fileType}
- Ukuran File Cover: ${fileSizeKB} KB
- Panjang Pesan Rahasia: ${messageLength} karakter
- Keamanan Kata Sandi (Password): ${isSecured ? "Aktif (AES-like)" : "Tidak Aktif (Teks Polos)"}

Berikan audit visual, ukuran, dan kriptografi yang realistis, menarik, bergaya agen rahasia / cyber-security profesional.
Kembalikan respon JSON persis dengan format ini:
{
  "stealthScore": <angka 0 - 100>,
  "visualRisk": "Low" | "Medium" | "High",
  "sizeRisk": "Low" | "Medium" | "High",
  "cryptoRisk": "Low" | "Medium" | "High",
  "analysisText": "<2-3 kalimat penjelasan analisis keamanan dan rekomendasi>",
  "tips": ["Tip 1", "Tip 2", "Tip 3"]
}`;

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error("Empty response from AI");
      }
      res.json(JSON.parse(text));
    } catch (err: any) {
      console.error(err);
      res.json({
        stealthScore: isSecured ? 80 : 40,
        visualRisk: "Low",
        sizeRisk: "Low",
        cryptoRisk: isSecured ? "Low" : "High",
        analysisText: "Gagal memproses analisis AI. Analisis statis lokal menunjukkan enkripsi sandi " + (isSecured ? "sudah aktif dan aman." : "belum aktif. Sangat direkomendasikan memakai kata sandi!"),
        tips: ["Gunakan sandi yang kuat", "Gunakan cover PNG berkualitas tinggi"]
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: any, res: any) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server", err);
});

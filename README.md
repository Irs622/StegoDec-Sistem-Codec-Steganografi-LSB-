# StegoDec — Sistem Codec & Steganografi LSB (Image, Audio, Video)

StegoDec adalah aplikasi berbasis web (Flask Single Page Application) yang mengintegrasikan sistem **Codec Multimedia (Kompresi/Dekompresi)**, **Kriptografi Simetris Vigenere-XOR**, dan **Steganografi LSB (Least Significant Bit)** untuk Gambar, Audio, dan Video. Proyek ini dibangun untuk memenuhi persyaratan UAS Capstone Project Sistem Multimedia.

---

## 🛠️ Fitur Utama

Aplikasi ini menggunakan pendekatan antarmuka terpadu (SPA) dengan empat pilar fitur utama:

1. **🖼️ Image Hub**:
   * **Steganografi**: Penyisipan pesan terenkripsi-terkompresi (zlib + XOR) secara acak (PRNG) pada piksel LSB gambar PNG.
   * **Codec**: Kompresi gambar lossy/lossless menggunakan format JPEG, WebP, dan PNG dengan parameter kualitas (1-100) atau tingkat kompresi (0-9).
2. **🎵 Audio Hub**:
   * **Steganografi**: Penyisipan pesan bit LSB pada file suara WAV (PCM 8/16-bit).
   * **Codec**: Kompresi audio WAV melalui teknik *downsampling* (pengurangan frekuensi sampel) dan reduksi kedalaman bit (bit depth reduction).
3. **🎥 Video Hub**:
   * **Steganografi**: Penyisipan pesan bit LSB spasial-temporal pada video AVI menggunakan codec lossless (FFV1/HuffYUV) untuk mencegah kerusakan bit akibat re-kompresi.
   * **Codec**: Kompresi video dengan penurunan skala resolusi dan pemangkasan frame rate (FPS).
4. **🛠️ Sandbox Tools**:
   * Eksperimen mandiri Kriptografi (Vigenere-XOR) dan kompresi data lossless (Zlib Deflate) secara terpisah langsung dari dashboard tanpa memerlukan berkas media pembawa.

---

## 🚀 Cara Menjalankan Aplikasi Secara Lokal

### Prasyarat
- Python 3.9+ terinstal di sistem Anda.

### 1. Setup Virtual Environment (Direkomendasikan)
Aktifkan virtual environment di direktori proyek:

```bash
# Untuk MacOS / Linux
python3 -m venv venv
source venv/bin/activate

# Untuk Windows
python -m venv venv
venv\Scripts\activate
```

### 2. Install Dependensi
Pasang semua pustaka Python yang diperlukan:

```bash
pip install -r requirements.txt
```

### 3. Jalankan Server Flask
Luncurkan aplikasi server Flask:

```bash
python3 app.py
```

Setelah server aktif, buka browser Anda dan akses:
👉 **`http://localhost:5001`**

---

## 📂 Struktur Direktori Proyek

```
hushmedia/
├── app.py                  # Core backend Flask (Routing, API, & Algoritma Codec/Steganografi)
├── requirements.txt        # Daftar pustaka dependensi (Flask, OpenCV-Python, NumPy, dll)
├── templates/
│   └── index.html          # Frontend SPA Dashboard (Image, Audio, Video, & Sandbox Hub)
├── static/
│   ├── css/
│   │   └── style.css       # Tema visual gelap premium, grid neon, & animasi transisi
│   └── js/
│       └── app.js          # Controller logika frontend, AJAX fetch API, & event listeners
├── uploads/                # Tempat penyimpanan sementara file unggahan cover/stego (auto-created)
├── defense_arguments.md    # Panduan argumen pertahanan sidang UAS
└── LAPORAN_UAS_GUIDE.md    # Draf laporan Kerja Praktek & script video presentasi 15 menit
```

---

## ❓ FAQ Sidang Capstone UAS

**Q: Mengapa file video stego harus disimpan dalam format AVI (FFV1)?**  
A: Kebanyakan format video standar seperti MP4 menggunakan kompresi inter-frame lossy (H.264/H.265) yang menduga-duga dan menyederhanakan piksel antar frame untuk menghemat memori. Hal ini merusak bit LSB tempat kita menyembunyikan data. Codec **FFV1 (lossless)** menjamin setiap bit LSB frame video tersimpan utuh tanpa ada perubahan visual.

**Q: Bagaimana cara memastikan bahwa steganografi suara tidak mengubah suara aslinya?**  
A: LSB audio menyisipkan bit pada bit amplitudo terendah PCM WAV. Untuk data teks rahasia yang terkompresi Zlib (ukuran sangat kecil), modifikasi amplitudo ini jauh di bawah ambang batas pendengaran manusia (kebisingan latar belakang kurang dari -70dB), sehingga secara auditori tidak terdengar perbedaan (*imperceptible*).

**Q: Kenapa steganografi media rusak saat dikirim langsung di WhatsApp?**  
A: WhatsApp/Telegram melakukan kompresi media secara otomatis untuk menghemat bandwidth. Untuk mencegah stego rusak, file stego PNG/WAV/AVI harus dikirimkan dalam bentuk opsi **"Kirim Dokumen" (Send as Document)** agar file terkirim secara utuh (*byte-by-byte*) tanpa kompresi platform.

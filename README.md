# StegoDec — Sistem Codec & Steganografi LSB

StegoDec adalah proyek Capstone UAS untuk sistem Codec (Kompresi Lossless) terintegrasi dengan Steganografi LSB (Least Significant Bit) dan proteksi kriptografi Vigenere-XOR pada platform Python Flask.

---

## 🛠️ Fitur Utama

1. **Lossless Codec**: Kompresi teks rahasia menggunakan pustaka `zlib` (level 9) sebelum proses embedding guna meminimalisir payload bit size.
2. **Steganografi LSB (Least Significant Bit)**: Menyisipkan pesan ke bit terbawah (Least Significant Bit) dari data piksel gambar kontainer PNG (lossless format) untuk menjamin data tidak rusak oleh kompresi gambar.
3. **Kriptografi Vigenere-XOR**: Enkripsi teks opsional sebelum kompresi menggunakan Vigenere cipher berbasis operasi bitwise XOR dengan garam (salt) acak.
4. **Interactive Dashboard**: Panel monitoring statistik kompresi dan utilisasi kapasitas piksel gambar kontainer secara langsung setelah proses encode/decode.

---

## 🚀 Cara Menjalankan Aplikasi Secara Lokal

### Prasyarat
- Python 3.8+ terinstall pada sistem.

### 1. Setup Virtual Environment (Direkomendasikan)
Buat dan aktifkan virtual environment untuk mengisolasi dependensi proyek:

```bash
# Untuk MacOS / Linux
python3 -m venv venv
source venv/bin/activate

# Untuk Windows
python -m venv venv
venv\Scripts\activate
```

### 2. Install Dependensi
Pasang semua paket yang dibutuhkan via `pip`:

```bash
pip install -r requirements.txt
```

### 3. Jalankan Server Flask
Luncurkan server Flask lokal:

```bash
python app.py
```

Setelah server aktif, buka peramban dan akses:
**`http://localhost:5000`**

---

## 📂 Struktur Direktori Proyek

- `app.py`: Backend Flask utama yang memuat route `/encode`, `/decode`, dan implementasi steganografi LSB/kompresi.
- `requirements.txt`: Daftar dependensi Python (Flask, OpenCV-Python, NumPy, dll).
- `templates/`: Direktori file UI template (HTML).
  - `index.html`: UI Dashboard utama.
- `static/`: Berisi aset statis frontend.
  - `css/style.css`: Kustomisasi visual dan animasi.
  - `js/app.js`: Script frontend interaktif untuk upload file, preview, dan query API Flask.
- `uploads/`: Direktori penyimpanan sementara untuk file cover dan stego hasil pemrosesan (dibuat otomatis).
- `defense_arguments.md`: Berkas panduan argumen pertahanan sidang UAS mengenai batasan kompresi lossy.

---

## ❓ FAQ Sidang Capstone

**Q: Mengapa pesan stego rusak saat dikirim biasa lewat WhatsApp/Social Media?**  
A: Aplikasi media sosial secara otomatis melakukan kompresi *lossy* (JPEG) yang merubah nilai piksel halus guna menghemat bandwidth. StegoDec dirancang menggunakan format **PNG (lossless)** untuk kebutuhan penyimpanan lokal (*cold storage*) atau pengiriman dokumen tanpa kompresi (*send as document*). Penjelasan lengkap & skrip argumen untuk menjawab penguji dapat dibaca di berkas [defense_arguments.md](file:///Users/mac/Downloads/hushmedia/defense_arguments.md).

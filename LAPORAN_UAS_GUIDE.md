# 📝 Panduan Laporan UAS & Alur Video Presentasi (UAS Capstone Project)

Dokumen ini dibuat untuk membantu Anda menyelesaikan dua poin terakhir dari syarat UAS Sistem Multimedia Anda:
1. **Laporan Aplikasi** (sesuai template Kerja Praktek/KP).
2. **Video Presentasi Demo Aplikasi** (maksimal 15 menit).

---

## 📂 PART 1: Draf Konten Laporan UAS (Untuk Disalin ke Template KP Anda)

Anda dapat menyalin bagian-bagian di bawah ini dan menyesuaikannya ke dalam dokumen template laporan Kerja Praktek (Microsoft Word) Anda:

### BAB I: PENDAHULUAN
*   **Latar Belakang**: Pengiriman data sensitif di internet menghadapi ancaman penyadapan. Steganografi spasial (LSB) digunakan untuk menyembunyikan data di dalam media pembawa. Namun, steganografi saja tidak cukup karena ukuran berkas rahasia yang besar dapat merusak visual/auditori media pembawa. Oleh karena itu, diintegrasikan sistem **Codec Kompresi (Zlib)** untuk mengecilkan payload pesan, serta **Kriptografi Vigenere-XOR** untuk mengamankan pesan sebelum disisipkan. Selain itu, sistem juga menyediakan **Codec Kompresi Media** (Gambar, Audio, Video) untuk mendemonstrasikan aspek kompresi multimedia.
*   **Tujuan**:
    1. Mengimplementasikan steganografi LSB teracak (PRNG) pada media Gambar (PNG), Audio (WAV), dan Video (AVI).
    2. Mengimplementasikan codec kompresi multimedia pada Gambar (JPEG/WebP), Audio (Downsampling WAV), dan Video (Resolution/FPS scaling).
    3. Membangun aplikasi berbasis web (Flask) yang mudah digunakan.

### BAB II: LANDASAN TEORI
1.  **Steganografi LSB (Least Significant Bit)**: Teknik menyembunyikan data dengan mengganti bit terakhir (paling tidak signifikan) dari data piksel gambar atau amplitudo audio PCM dengan bit pesan rahasia.
2.  **LSB Scrambling (PRNG)**: Pengacakan indeks piksel/sampel media pembawa menggunakan generator angka acak semu (PRNG) berbasis *seed* stabil. Ini mencegah penyerang mengekstrak pesan secara berurutan (*steganalysis resistance*).
3.  **Lossless Codec (Zlib/Deflate)**: Algoritma kompresi data teks rahasia menggabungkan Huffman coding dan LZ77 untuk mengurangi payload bit sebelum proses penyisipan.
4.  **Kompresi Media**:
    *   **Gambar (JPEG/WebP)**: Menggunakan transformasi kosinus diskrit (DCT) dan kuantisasi untuk mengurangi komponen frekuensi tinggi visual (lossy).
    *   **Audio WAV (Downsampling & Bit Depth)**: Mengurangi frekuensi sampling (misal 44.1kHz -> 16kHz) dan resolusi bit (16-bit -> 8-bit PCM) untuk memotong ukuran file audio secara signifikan.
    *   **Video (Resolution & FPS Scaling)**: Mengurangi dimensi spasial piksel frame (misal 50% skala) dan memotong frame per detik (FPS) untuk mengecilkan ukuran data aliran video.

### BAB III: IMPLEMENTASI & PENGUJIAN
*(Gunakan tabel hasil uji unit test di walkthrough.md sebagai data pengujian resmi Anda)*

*   **Tabel Pengujian Steganografi & Codec**:
    *   **Gambar (stego_out.png)**: Keberhasilan Ekstraksi = 100%, Rasio Kompresi Pesan = -11.9% (overhead untuk teks sangat pendek).
    *   **Audio (stego_out.wav)**: Keberhasilan Ekstraksi = 100%, Freq = 16kHz, Sampwidth = 16-bit.
    *   **Video (stego_out_video.avi)**: Keberhasilan Ekstraksi = 100% menggunakan codec lossless FFV1.
    *   **Kompresi Audio WAV**: Ukuran awal 64 KB -> Ukuran terkompresi 16 KB (Rasio Efisiensi = 74.9%).
    *   **Kompresi Video AVI**: Ukuran awal 1.0 MB -> Ukuran terkompresi 14 KB (Rasio Efisiensi = 98.6%).

---

## 🎥 PART 2: Alur & Script Presentasi Video Demo (Maksimal 15 Menit)

Berikut adalah panduan pembagian waktu dan naskah bicara agar video presentasi demo Anda terstruktur dengan sangat baik dan terlihat profesional di mata dosen penguji:

### ⏱️ Pembagian Waktu Video (Timeline)
*   **Menit 00:00 - 02:00 (Pembukaan & Pengenalan Konsep)**: Perkenalan anggota kelompok, nama proyek (StegoDec), dan latar belakang integrasi Codec + Steganografi Gambar/Audio/Video.
*   **Menit 02:00 - 04:30 (Teori & Arsitektur Sistem)**: Penjelasan singkat alur kerja: Pesan -> Enkripsi Vigenere-XOR -> Kompresi Zlib -> LSB Scrambling -> Penyisipan ke Container (PNG/WAV/AVI). Jelaskan juga pentingnya format lossless agar bit LSB tidak rusak.
*   **Menit 04:30 - 07:00 (Demo Live 1: Image Hub)**:
    *   Tunjukkan cara kompresi Gambar (JPEG/WebP) dan tunjukkan grafik rasio ukuran file.
    *   Tunjukkan encode pesan ke PNG, download stego PNG, lalu lakukan decode untuk memulihkan pesan asli.
*   **Menit 07:00 - 09:30 (Demo Live 2: Audio Hub)**:
    *   Tunjukkan cara unggah berkas audio `.wav`.
    *   Lakukan kompresi audio (pilih downsampling 2x dan 8-bit), unduh audio hasil kompresi, dan perdengarkan bahwa kualitas audio menurun tapi ukuran file menyusut drastis.
    *   Lakukan encode pesan ke dalam file audio `.wav`, unduh, lalu decode kembali menggunakan password.
*   **Menit 09:30 - 12:00 (Demo Live 3: Video Hub)**:
    *   Tunjukkan unggah video `.mp4`.
    *   Kompresi video ke resolusi 50% dan 15 FPS, lalu unduh hasilnya.
    *   Lakukan encode stego ke video `.avi`, unduh, lalu decode kembali di panel kanan.
*   **Menit 12:00 - 15:00 (Penjelasan Kode Singkat & Penutup)**:
    *   Perlihatkan sekilas struktur proyek (`app.py` dan `app.js`).
    *   Jelaskan argumen pertahanan (kenapa steganografi LSB harus dikirim sebagai file dokumen utuh di WhatsApp/Telegram agar tidak ter-kompresi otomatis).
    *   Tutup presentasi dengan ucapan terima kasih.

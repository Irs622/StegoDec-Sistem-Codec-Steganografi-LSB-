# Argumen Sidang & Pertahanan Proyek: Desain Sistem StegoDec

Dokumen ini disusun untuk membantu menjawab pertanyaan kritis dari dosen penguji saat sidang Capstone/Tugas Akhir mengenai batasan steganografi spasial Least Significant Bit (LSB) terhadap kompresi lossy (seperti kompresi gambar otomatis pada aplikasi chat WhatsApp, Telegram, Instagram, dll).

---

## ❓ Pertanyaan Kritis Penguji (The Core Problem)
> *"Mengapa Anda menggunakan steganografi LSB? Jika gambar stego ini dikirim melalui WhatsApp, Telegram, atau diunggah ke media sosial, kompresi JPEG akan merusak bit-bit LSB tersebut, dan pesan rahasia tidak akan bisa diekstrak lagi (data loss). Bukankah sistem ini menjadi tidak berguna untuk transfer file di internet?"*

---

## 💡 Strategi Jawaban & Argumen Pertahanan

Anda dapat menjawab pertanyaan ini dengan membagi argumen menjadi **tiga pilar utama**:

### 1. Penegasan Batasan Desain & Use Case Sistem (Design Scope & Intent)
*   **Jawaban**: "StegoDec **sejak awal dirancang khusus untuk Media Penyimpanan Lokal (Cold Storage) atau Saluran Transfer Dokumen Tanpa Kompresi (Lossless Channels)**. Sistem ini bukan dirancang untuk steganografi media sosial (social steganography) yang bersifat publik."
*   **Penjelasan Detail**:
    *   **Cold Storage / Local Encryption Archive**: Pengguna ingin menyimpan teks rahasia (seperti kunci privat kripto, kata sandi, atau data medis sensitif) di dalam komputer lokal atau hard disk eksternal mereka tanpa mencurigakan. Menyimpan file teks mentah `.txt` sangat rawan dicurigai, namun menyimpannya sebagai file foto kenangan `.png` (stego) di hard disk lokal tidak akan mengundang perhatian pihak luar (membingungkan analisis/steganalysis).
    *   **Lossless Document Attachment**: Jika harus ditransfer melalui jaringan, file dikirim sebagai **file dokumen utuh (attachment document)** bukan sebagai kompresi gambar chat. Contohnya, mengirim via email (attachment asli), Google Drive (shared file), sFTP, atau mengirim via Telegram/WhatsApp dengan opsi "Kirim sebagai File/Dokumen" yang menjaga integritas biner berkas 100% tanpa kompresi byte.

### 2. Justifikasi Teknis Pemilihan Format PNG & Lossless Codec
*   **Jawaban**: "Sistem kami secara ketat membatasi output hanya dalam format **PNG (Portable Network Graphics)** yang menggunakan kompresi DEFLATE (lossless). Kami sengaja menghindari format lossy seperti JPEG."
*   **Penjelasan Detail**:
    *   Sifat kompresi JPEG didasarkan pada *Discrete Cosine Transform* (DCT) yang membuang frekuensi tinggi (detail halus piksel) untuk menghemat ukuran. Ini secara otomatis merusak bit terakhir (LSB) dari setiap piksel.
    *   Dengan menggunakan format PNG, kompresinya bersifat matematis-lossless. Setiap piksel yang kita modifikasi dengan LSB Scrambling akan tetap identik 100% dari sisi pengirim hingga penerima selama berkas ditransfer sebagai dokumen asli.
    *   Integrasi **zlib (level 9) compression** memperkuat aspek ini. Dengan memperkecil ukuran bit payload teks rahasia terlebih dahulu, jumlah piksel gambar yang perlu dimodifikasi menjadi jauh lebih sedikit (payload bit size minimal), meminimalkan distorsi visual dan membuat analisis statistik LSB menjadi semakin sulit dideteksi (*steganalysis resistance*).

### 3. Kelemahan Steganografi Robust (Transform Domain) yang Berdampak pada Payload
*   **Jawaban**: "Meskipun ada steganografi yang tahan kompresi (seperti metode domain frekuensi/transformasi seperti DCT/DWT), metode tersebut memiliki kompromi berupa **kapasitas payload yang sangat kecil dan kompleksitas komputasi yang tinggi**."
*   **Penjelasan Detail**:
    *   Steganografi berbasis LSB dipilih karena memiliki **kapasitas penyimpanan yang sangat besar** (maksimal 3 bit per piksel pada gambar RGB). Hal ini sangat cocok untuk menyembunyikan dokumen teks berukuran menengah hingga besar yang sudah dikompresi oleh modul Codec.
    *   Di sisi lain, metode tahan kompresi (seperti menyisipkan bit pada koefisien DCT JPEG) hanya mampu menampung sedikit data sebelum kualitas gambar menurun secara drastis secara visual.

---

## 📝 Contoh Skrip Jawaban Verbal Saat Sidang

> *"Terima kasih atas pertanyaannya Bapak/Ibu Penguji. Pertanyaan tersebut sangat tepat mengenai batasan umum steganografi LSB spasial.*
> 
> *Sistem StegoDec yang saya kembangkan dirancang dengan batasan operasional (operational scope) khusus. Sistem ini ditujukan untuk **Cold Storage lokal** atau **Transfer Dokumen Lossless**, bukan untuk publikasi media sosial.*
> 
> *Pengguna sistem ini dituntut untuk mengirimkan berkas stego dalam bentuk **dokumen asli (file attachment)** jika ditransfer via email atau aplikasi chat (seperti fitur 'Send as Document' di Telegram/WhatsApp), guna menghindari re-kompresi lossy oleh penyedia platform.*
> 
> *Untuk mendukung use case tersebut, StegoDec membatasi format kontainer hanya dalam **PNG (lossless)** dan mengintegrasikan **Lossless Codec zlib level 9** untuk mengecilkan payload biner secara maksimal. Hal ini menjamin data biner yang disisipkan dapat diekstrak kembali dengan akurasi 100% tanpa kehilangan bit satupun (zero-error extraction), sebuah karakteristik yang sangat krusial untuk data teks rahasia."*

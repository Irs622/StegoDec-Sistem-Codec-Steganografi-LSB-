from flask import Flask, request, render_template, send_file, jsonify
from werkzeug.utils import secure_filename
import cv2
import numpy as np
import zlib
import os
import base64
import random
import uuid
import hashlib

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)


# ==========================================
# FUNGSI ENKRIPSI / DEKRIPSI PASSWORD
# (XOR-Vigenere Cipher dengan Salt Acak)
# ==========================================

def encrypt_text(text, password=None):
    """Enkripsi teks menggunakan XOR-Vigenere cipher dengan salt acak."""
    if not password:
        return text

    salt = str(random.randint(100, 999))
    stretched = password + salt

    key_sum = sum(ord(c) * (i + 1) for i, c in enumerate(stretched))

    text_bytes = text.encode('utf-8')
    result = bytearray()
    for i, byte_val in enumerate(text_bytes):
        k = ord(stretched[i % len(stretched)])
        encrypted = byte_val ^ ((k + (i * 7) + (key_sum % 256)) % 256)
        result.append(encrypted & 0xFF)

    return f"SECURE_{salt}_" + base64.b64encode(bytes(result)).decode('ascii')


def decrypt_text(encrypted_text, password=None):
    """Dekripsi teks yang dienkripsi dengan XOR-Vigenere cipher."""
    if not encrypted_text.startswith("SECURE_"):
        return encrypted_text  # Tidak dienkripsi, kembalikan apa adanya

    if not password:
        raise ValueError("Pesan ini terkunci! Harap masukkan Kata Sandi untuk membuka.")

    try:
        parts = encrypted_text.split("_", 2)
        if len(parts) < 3:
            raise ValueError("Data terkorupsi")

        salt = parts[1]
        cipher_bytes = base64.b64decode(parts[2])
        stretched = password + salt

        key_sum = sum(ord(c) * (i + 1) for i, c in enumerate(stretched))

        result = bytearray()
        for i, byte_val in enumerate(cipher_bytes):
            k = ord(stretched[i % len(stretched)])
            decrypted = byte_val ^ ((k + (i * 7) + (key_sum % 256)) % 256)
            result.append(decrypted & 0xFF)

        return bytes(result).decode('utf-8')
    except UnicodeDecodeError:
        raise ValueError("Kata sandi salah atau data rusak!")
    except ValueError:
        raise
    except Exception:
        raise ValueError("Kata sandi salah atau data rusak!")


# ==========================================
# FUNGSI ALGORITMA CODEC & STEGANOGRAFI
# ==========================================

# Delimiter untuk menandai akhir payload dalam piksel gambar
DELIMITER = b'====STEGODEC_END===='


def get_scrambled_indices(total_pixels, password=None):
    """Menghasilkan array indeks piksel yang diacak secara konsisten menggunakan seed dari password."""
    indices = np.arange(total_pixels, dtype=np.int32)
    
    # Gunakan password (atau default seed jika tidak ada) untuk mengacak indeks
    seed_str = password if password else "STEGODEC_DEFAULT_SEED"
    
    # Hasilkan seed 32-bit integer yang stabil menggunakan hashlib SHA-256
    seed_hash = int(hashlib.sha256(seed_str.encode('utf-8')).hexdigest(), 16) % (2**32)
    
    # Inisialisasi PRNG NumPy yang aman dengan seed tersebut
    rng = np.random.default_rng(seed_hash)
    rng.shuffle(indices)
    
    return indices


def encode_image_stego(image_path, secret_message, output_path, password=None):
    """
    Fase Encode — Menggabungkan Codec (Kompresi) dan Steganografi:

    1. Enkripsi pesan dengan password (opsional — XOR-Vigenere)
    2. CODEC: Kompresi lossless pesan dengan zlib
    3. Tambahkan delimiter setelah data terkompresi
    4. STEGANOGRAFI: Sisipkan bit biner secara acak (PRNG) ke LSB piksel gambar
    5. Simpan hasil sebagai PNG (format lossless, menjaga integritas bit)
    """
    # Step 0: Enkripsi dengan password jika diberikan
    processed_message = encrypt_text(secret_message, password)

    # Step 1: CODEC — Kompresi lossless dengan zlib (level 9 = kompresi maksimal)
    raw_bytes = processed_message.encode('utf-8')
    compressed = zlib.compress(raw_bytes, 9)

    # Tambahkan delimiter SETELAH kompresi agar bisa dideteksi saat decode
    payload = compressed + DELIMITER

    # Konversi seluruh payload menjadi numpy array bit (0 dan 1) secara vectorized
    payload_np = np.frombuffer(payload, dtype=np.uint8)
    bits = np.unpackbits(payload_np)
    n_bits = len(bits)

    # Step 2: STEGANOGRAFI — Baca gambar dengan OpenCV
    img = cv2.imread(image_path, cv2.IMREAD_UNCHANGED)
    if img is None:
        raise ValueError("Gagal membaca file gambar. Format tidak didukung.")

    # Konversi grayscale ke BGR jika perlu
    if len(img.shape) == 2:
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)

    flat_img = img.flatten()

    # Cek apakah gambar cukup besar untuk menampung payload
    if n_bits > len(flat_img):
        raise ValueError(
            f"Gambar terlalu kecil untuk menampung pesan ini! "
            f"Kapasitas: {len(flat_img)} bit, dibutuhkan: {n_bits} bit. "
            f"Gunakan gambar yang lebih besar."
        )

    # Dapatkan indeks piksel yang diacak berdasarkan password
    scrambled_indices = get_scrambled_indices(len(flat_img), password)
    target_indices = scrambled_indices[:n_bits]

    # Sisipkan bit secara vectorized
    flat_img[target_indices] = (flat_img[target_indices] & 0xFE) | bits

    # Kembalikan array ke bentuk matriks gambar semula
    encoded_img = flat_img.reshape(img.shape)

    # Simpan sebagai PNG agar bit tidak rusak (format lossless)
    cv2.imwrite(output_path, encoded_img)

    # Hitung statistik untuk ditampilkan di frontend
    original_size = len(raw_bytes)
    compressed_size = len(compressed)
    compression_ratio = (1 - compressed_size / max(original_size, 1)) * 100

    return {
        'original_size': original_size,
        'compressed_size': compressed_size,
        'compression_ratio': round(compression_ratio, 1),
        'bits_embedded': n_bits,
        'image_capacity': len(flat_img),
        'capacity_used': round(n_bits / len(flat_img) * 100, 2)
    }


def decode_image_stego(image_path, password=None):
    """
    Fase Decode — Membongkar Steganografi dan Dekompresi Codec:

    1. STEGANOGRAFI: Baca piksel gambar, ekstrak LSB dari indeks piksel yang diacak
    2. Kumpulkan bit menjadi bytes, cari delimiter
    3. CODEC: Dekompresi zlib untuk mengembalikan data asli
    4. Dekripsi password jika data terenkripsi
    """
    # Step 1: STEGANOGRAFI — Baca gambar
    img = cv2.imread(image_path, cv2.IMREAD_UNCHANGED)
    if img is None:
        raise ValueError("Gagal membaca file gambar.")

    if len(img.shape) == 2:
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)

    flat_img = img.flatten()

    # Dapatkan indeks piksel yang diacak berdasarkan password
    scrambled_indices = get_scrambled_indices(len(flat_img), password)

    # Ambil LSB dari piksel berdasarkan urutan acak secara vectorized
    lsb_bits = flat_img[scrambled_indices] & 1

    # Gabungkan bit kembali menjadi bytes
    extracted_bytes = np.packbits(lsb_bits).tobytes()

    # Cari penanda delimiter di dalam bytes secara efisien
    delim_idx = extracted_bytes.find(DELIMITER)
    if delim_idx != -1:
        # Ambil data terkompresi (tanpa delimiter)
        compressed_data = extracted_bytes[:delim_idx]
        try:
            # Step 2: CODEC — Dekompresi zlib
            decompressed = zlib.decompress(compressed_data)
            raw_message = decompressed.decode('utf-8')

            # Step 3: Dekripsi password jika ada
            final_message = decrypt_text(raw_message, password)

            return {
                'success': True,
                'message': final_message,
                'compressed_size': len(compressed_data),
                'decompressed_size': len(decompressed),
                'is_encrypted': raw_message.startswith("SECURE_")
            }
        except ValueError as ve:
            # Password salah atau data terenkripsi tanpa password
            return {'success': False, 'error': str(ve)}
        except Exception:
            return {'success': False, 'error': 'Dekompresi gagal. File mungkin rusak atau kunci sandi salah.'}

    return {'success': False, 'error': 'Pesan rahasia tidak ditemukan dalam gambar ini. Pastikan kunci sandi benar.'}


# ==========================================
# ROUTING FLASK (MENGHUBUNGKAN KE FRONTEND)
# ==========================================

@app.route('/')
def index():
    """Halaman utama — memuat UI dari templates/index.html"""
    return render_template('index.html')


@app.route('/encode', methods=['POST'])
def encode():
    """
    Endpoint Encode — menerima file gambar + pesan rahasia,
    menjalankan kompresi zlib + steganografi LSB,
    mengembalikan JSON berisi statistik + URL download hasil.
    """
    if 'file' not in request.files or 'message' not in request.form:
        return jsonify({"success": False, "error": "Data tidak lengkap. Unggah file dan isi pesan."}), 400

    file = request.files['file']
    message = request.form['message'].strip()
    password = request.form.get('password', '').strip() or None

    if not file.filename or not message:
        return jsonify({"success": False, "error": "File dan pesan rahasia wajib diisi."}), 400

    # Simpan file upload sementara
    safe_name = secure_filename(file.filename)
    input_path = os.path.join(app.config['UPLOAD_FOLDER'], f'in_{safe_name}')

    # Generate nama unik untuk output agar tidak bentrok
    result_name = f'stego_{uuid.uuid4().hex[:8]}.png'
    output_path = os.path.join(app.config['UPLOAD_FOLDER'], result_name)

    file.save(input_path)

    try:
        stats = encode_image_stego(input_path, message, output_path, password)
        return jsonify({
            'success': True,
            'download_url': f'/download/{result_name}',
            'filename': result_name,
            **stats
        })
    except ValueError as ve:
        return jsonify({"success": False, "error": str(ve)}), 400
    except Exception as e:
        return jsonify({"success": False, "error": f"Terjadi kesalahan server: {str(e)}"}), 500
    finally:
        # Bersihkan file input sementara
        if os.path.exists(input_path):
            os.remove(input_path)


@app.route('/decode', methods=['POST'])
def decode():
    """
    Endpoint Decode — menerima file gambar stego,
    mengekstrak LSB dan dekompresi zlib,
    mengembalikan JSON berisi pesan rahasia.
    """
    if 'file' not in request.files:
        return jsonify({"success": False, "error": "Tidak ada file yang diunggah."}), 400

    file = request.files['file']
    password = request.form.get('password', '').strip() or None

    if not file.filename:
        return jsonify({"success": False, "error": "Tidak ada file yang dipilih."}), 400

    safe_name = secure_filename(file.filename)
    input_path = os.path.join(app.config['UPLOAD_FOLDER'], f'dec_{safe_name}')
    file.save(input_path)

    try:
        result = decode_image_stego(input_path, password)
        return jsonify(result)
    except Exception as e:
        return jsonify({"success": False, "error": f"Terjadi kesalahan: {str(e)}"}), 500
    finally:
        # Bersihkan file sementara
        if os.path.exists(input_path):
            os.remove(input_path)


@app.route('/download/<filename>')
def download_file(filename):
    """Endpoint untuk mengunduh file hasil steganografi."""
    safe_name = secure_filename(filename)
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], safe_name)
    if not os.path.exists(file_path):
        return jsonify({"error": "File tidak ditemukan."}), 404
    return send_file(file_path, as_attachment=True, download_name=safe_name)


import threading
import time

def cleanup_uploads_periodically():
    """Background thread to delete uploaded files older than 10 minutes (600 seconds) every 5 minutes."""
    while True:
        try:
            now = time.time()
            folder = app.config['UPLOAD_FOLDER']
            if os.path.exists(folder):
                for f in os.listdir(folder):
                    file_path = os.path.join(folder, f)
                    if os.path.isfile(file_path) and now - os.path.getmtime(file_path) > 600:
                        os.remove(file_path)
                        print(f"[*] Cleaned up old file: {f}")
        except Exception as e:
            print(f"Error in cleanup thread: {e}")
        time.sleep(300)  # Run every 5 minutes

# Start the cleanup thread as daemon
cleanup_thread = threading.Thread(target=cleanup_uploads_periodically, daemon=True)
cleanup_thread.start()


if __name__ == '__main__':
    print("=" * 50)
    print("  StegoDec — Sistem Codec & Steganografi")
    print("  Server berjalan di http://localhost:5000")
    print("=" * 50)
    app.run(debug=True, port=5000)

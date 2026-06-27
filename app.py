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
import wave

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
    """Menghasilkan array indeks piksel yang diacak secara konsisten menggunakan seed konstan."""
    indices = np.arange(total_pixels, dtype=np.int32)
    
    # Gunakan default seed yang konstan agar delimiter selalu dapat dibaca dari piksel-piksel yang sama
    seed_str = "STEGODEC_DEFAULT_SEED"
    
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

    # Dapatkan indeks piksel yang diacak berdasarkan seed konstan
    scrambled_indices = get_scrambled_indices(len(flat_img), password)

    # Ambil LSB dari piksel berdasarkan urutan acak secara vectorized
    lsb_bits = flat_img[scrambled_indices] & 1

    # Gabungkan bit kembali menjadi bytes
    extracted_bytes = np.packbits(lsb_bits).tobytes()

    # Cari penanda delimiter di dalam bytes secara efisien
    delim_idx = extracted_bytes.find(DELIMITER)
    if delim_idx == -1:
        return {'success': False, 'error': 'Bukan berkas stego (delimiter tidak ditemukan)'}

    # Ambil data terkompresi (tanpa delimiter)
    compressed_data = extracted_bytes[:delim_idx]
    try:
        # Step 2: CODEC — Dekompresi zlib
        decompressed = zlib.decompress(compressed_data)
        raw_message = decompressed.decode('utf-8')
    except Exception:
        # Jika dekompresi gagal, data terkompresi rusak / bukan berkas stego yang valid
        return {'success': False, 'error': 'Bukan berkas stego (delimiter tidak ditemukan)'}

    # Step 3: Dekripsi password jika ada
    if raw_message.startswith("SECURE_"):
        if not password:
            return {'success': False, 'error': 'Pesan ini terkunci! Harap masukkan Kata Sandi untuk membuka.'}
        try:
            final_message = decrypt_text(raw_message, password)
            return {
                'success': True,
                'message': final_message,
                'compressed_size': len(compressed_data),
                'decompressed_size': len(decompressed),
                'is_encrypted': True
            }
        except ValueError as ve:
            error_str = str(ve)
            if "Kata sandi salah" in error_str or "kunci sandi salah" in error_str:
                return {'success': False, 'error': 'Password salah (data gagal didekripsi)'}
            return {'success': False, 'error': error_str}
        except Exception:
            return {'success': False, 'error': 'Password salah (data gagal didekripsi)'}
    else:
        # File tidak terenkripsi
        return {
            'success': True,
            'message': raw_message,
            'compressed_size': len(compressed_data),
            'decompressed_size': len(decompressed),
            'is_encrypted': False
        }


# ==========================================
# AUDIO & VIDEO STEGANOGRAPHY + CODEC ALGORITHMS
# ==========================================

def encode_audio_stego(audio_path, secret_message, output_path, password=None):
    """Menyisipkan pesan terenkripsi dan terkompresi ke LSB piksel audio WAV PCM."""
    processed_message = encrypt_text(secret_message, password)
    raw_bytes = processed_message.encode('utf-8')
    compressed = zlib.compress(raw_bytes, 9)
    payload = compressed + DELIMITER

    payload_np = np.frombuffer(payload, dtype=np.uint8)
    bits = np.unpackbits(payload_np)
    n_bits = len(bits)

    with wave.open(audio_path, 'rb') as wav_in:
        params = wav_in.getparams()
        n_channels = params.nchannels
        sampwidth = params.sampwidth
        n_frames = params.nframes
        frames = wav_in.readframes(n_frames)

    if sampwidth == 1:
        audio_data = np.frombuffer(frames, dtype=np.uint8).copy()
    elif sampwidth == 2:
        audio_data = np.frombuffer(frames, dtype=np.int16).copy()
    else:
        raise ValueError("Hanya mendukung file WAV 8-bit atau 16-bit PCM.")

    if n_bits > len(audio_data):
        raise ValueError(
            f"File audio terlalu pendek! Kapasitas LSB: {len(audio_data)} bit, "
            f"Dibutuhkan: {n_bits} bit. Gunakan file WAV yang lebih panjang."
        )

    scrambled_indices = get_scrambled_indices(len(audio_data), password)
    target_indices = scrambled_indices[:n_bits]

    if sampwidth == 1:
        audio_data[target_indices] = (audio_data[target_indices] & 0xFE) | bits
    else:
        audio_data[target_indices] = (audio_data[target_indices] & ~1) | bits

    with wave.open(output_path, 'wb') as wav_out:
        wav_out.setparams(params)
        wav_out.writeframes(audio_data.tobytes())

    original_size = len(raw_bytes)
    compressed_size = len(compressed)
    compression_ratio = (1 - compressed_size / max(original_size, 1)) * 100

    return {
        'original_size': original_size,
        'compressed_size': compressed_size,
        'compression_ratio': round(compression_ratio, 1),
        'bits_embedded': n_bits,
        'audio_capacity': len(audio_data),
        'capacity_used': round(n_bits / len(audio_data) * 100, 2)
    }


def decode_audio_stego(audio_path, password=None):
    """Mengekstrak pesan dari LSB audio WAV PCM."""
    with wave.open(audio_path, 'rb') as wav_in:
        params = wav_in.getparams()
        sampwidth = params.sampwidth
        n_frames = params.nframes
        frames = wav_in.readframes(n_frames)

    if sampwidth == 1:
        audio_data = np.frombuffer(frames, dtype=np.uint8)
    elif sampwidth == 2:
        audio_data = np.frombuffer(frames, dtype=np.int16)
    else:
        raise ValueError("Hanya mendukung file WAV 8-bit atau 16-bit PCM.")

    scrambled_indices = get_scrambled_indices(len(audio_data), password)
    lsb_bits = audio_data[scrambled_indices] & 1
    extracted_bytes = np.packbits(lsb_bits).tobytes()

    delim_idx = extracted_bytes.find(DELIMITER)
    if delim_idx == -1:
        return {'success': False, 'error': 'Bukan berkas stego audio (delimiter tidak ditemukan)'}

    compressed_data = extracted_bytes[:delim_idx]
    try:
        decompressed = zlib.decompress(compressed_data)
        raw_message = decompressed.decode('utf-8')
    except Exception:
        return {'success': False, 'error': 'Bukan berkas stego audio (data terkompresi rusak)'}

    if raw_message.startswith("SECURE_"):
        if not password:
            return {'success': False, 'error': 'Pesan ini terkunci! Harap masukkan Kata Sandi untuk membuka.'}
        try:
            final_message = decrypt_text(raw_message, password)
            return {
                'success': True,
                'message': final_message,
                'compressed_size': len(compressed_data),
                'decompressed_size': len(decompressed),
                'is_encrypted': True
            }
        except ValueError as ve:
            error_str = str(ve)
            if "Kata sandi salah" in error_str or "kunci sandi salah" in error_str:
                return {'success': False, 'error': 'Password salah (data gagal didekripsi)'}
            return {'success': False, 'error': error_str}
        except Exception:
            return {'success': False, 'error': 'Password salah (data gagal didekripsi)'}
    else:
        return {
            'success': True,
            'message': raw_message,
            'compressed_size': len(compressed_data),
            'decompressed_size': len(decompressed),
            'is_encrypted': False
        }


def encode_video_stego(video_path, secret_message, output_path, password=None):
    """Menyisipkan pesan ke LSB frame video AVI lossless."""
    processed_message = encrypt_text(secret_message, password)
    raw_bytes = processed_message.encode('utf-8')
    compressed = zlib.compress(raw_bytes, 9)
    payload = compressed + DELIMITER

    payload_np = np.frombuffer(payload, dtype=np.uint8)
    bits = np.unpackbits(payload_np)
    n_bits = len(bits)

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError("Gagal membuka file video.")

    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps <= 0 or np.isnan(fps):
        fps = 24.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    # Coba menggunakan codec FFV1 lossless
    fourcc = cv2.VideoWriter_fourcc(*'FFV1')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
    if not out.isOpened():
        # Fallback ke raw/uncompressed
        out = cv2.VideoWriter(output_path, 0, fps, (width, height))
        if not out.isOpened():
            fourcc = cv2.VideoWriter_fourcc(*'I420')
            out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
            if not out.isOpened():
                cap.release()
                raise ValueError("Tidak dapat menginisialisasi VideoWriter.")

    bits_embedded = 0
    frames_processed = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if bits_embedded < n_bits:
            flat_frame = frame.flatten()
            remaining_bits = n_bits - bits_embedded
            chunk_size = min(len(flat_frame), remaining_bits)

            scrambled = get_scrambled_indices(len(flat_frame), password)
            target_indices = scrambled[:chunk_size]

            frame_bits = bits[bits_embedded : bits_embedded + chunk_size]
            flat_frame[target_indices] = (flat_frame[target_indices] & 0xFE) | frame_bits

            frame = flat_frame.reshape(frame.shape)
            bits_embedded += chunk_size

        out.write(frame)
        frames_processed += 1

    cap.release()
    out.release()

    if bits_embedded < n_bits:
        if os.path.exists(output_path):
            os.remove(output_path)
        raise ValueError(
            f"Video terlalu pendek! Kapasitas LSB: {frames_processed * width * height * 3} bit, "
            f"Dibutuhkan: {n_bits} bit. Gunakan file video yang lebih panjang."
        )

    original_size = len(raw_bytes)
    compressed_size = len(compressed)
    compression_ratio = (1 - compressed_size / max(original_size, 1)) * 100
    video_capacity = frames_processed * width * height * 3

    return {
        'original_size': original_size,
        'compressed_size': compressed_size,
        'compression_ratio': round(compression_ratio, 1),
        'bits_embedded': n_bits,
        'video_capacity': video_capacity,
        'capacity_used': round(n_bits / max(video_capacity, 1) * 100, 4)
    }


def decode_video_stego(video_path, password=None):
    """Mengekstrak pesan dari LSB frame video AVI."""
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError("Gagal membuka file video.")

    all_extracted_bytes = bytearray()
    found_delim = False

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        flat_frame = frame.flatten()
        scrambled = get_scrambled_indices(len(flat_frame), password)

        frame_bits = flat_frame[scrambled] & 1
        frame_bytes = np.packbits(frame_bits).tobytes()
        all_extracted_bytes.extend(frame_bytes)

        delim_idx = all_extracted_bytes.find(DELIMITER)
        if delim_idx != -1:
            found_delim = True
            break

    cap.release()

    if not found_delim:
        return {'success': False, 'error': 'Bukan berkas stego video (delimiter tidak ditemukan)'}

    delim_idx = all_extracted_bytes.find(DELIMITER)
    compressed_data = bytes(all_extracted_bytes[:delim_idx])
    try:
        decompressed = zlib.decompress(compressed_data)
        raw_message = decompressed.decode('utf-8')
    except Exception:
        return {'success': False, 'error': 'Bukan berkas stego video (data terkompresi rusak)'}

    if raw_message.startswith("SECURE_"):
        if not password:
            return {'success': False, 'error': 'Pesan ini terkunci! Harap masukkan Kata Sandi untuk membuka.'}
        try:
            final_message = decrypt_text(raw_message, password)
            return {
                'success': True,
                'message': final_message,
                'compressed_size': len(compressed_data),
                'decompressed_size': len(decompressed),
                'is_encrypted': True
            }
        except ValueError as ve:
            error_str = str(ve)
            if "Kata sandi salah" in error_str or "kunci sandi salah" in error_str:
                return {'success': False, 'error': 'Password salah (data gagal didekripsi)'}
            return {'success': False, 'error': error_str}
        except Exception:
            return {'success': False, 'error': 'Password salah (data gagal didekripsi)'}
    else:
        return {
            'success': True,
            'message': raw_message,
            'compressed_size': len(compressed_data),
            'decompressed_size': len(decompressed),
            'is_encrypted': False
        }


# ==========================================
# MEDIA COMPRESSION CODECS ALGORITHMS
# ==========================================

def compress_image_file(input_path, output_path, format_type, quality):
    """Kompresi berkas gambar (JPEG/WebP/PNG)."""
    img = cv2.imread(input_path)
    if img is None:
        raise ValueError("Gagal membaca berkas gambar.")

    quality = int(quality)
    if format_type.upper() == 'JPEG':
        cv2.imwrite(output_path, img, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
    elif format_type.upper() == 'WEBP':
        cv2.imwrite(output_path, img, [int(cv2.IMWRITE_WEBP_QUALITY), quality])
    elif format_type.upper() == 'PNG':
        comp_level = int((100 - quality) / 10)
        comp_level = max(0, min(9, comp_level))
        cv2.imwrite(output_path, img, [int(cv2.IMWRITE_PNG_COMPRESSION), comp_level])
    else:
        raise ValueError("Format gambar tidak didukung.")

    original_size = os.path.getsize(input_path)
    compressed_size = os.path.getsize(output_path)
    ratio = (1 - compressed_size / max(original_size, 1)) * 100

    return {
        'original_size': original_size,
        'compressed_size': compressed_size,
        'compression_ratio': round(ratio, 1),
        'format_type': format_type.upper(),
        'quality_setting': quality
    }


def compress_audio_file(input_path, output_path, sample_rate_factor, bit_depth_factor):
    """Kompresi WAV audio (downsampling & bit-depth reduction)."""
    with wave.open(input_path, 'rb') as wav_in:
        params = wav_in.getparams()
        n_channels = params.nchannels
        sampwidth = params.sampwidth
        framerate = params.framerate
        n_frames = params.nframes
        frames = wav_in.readframes(n_frames)

    if sampwidth == 1:
        audio_data = np.frombuffer(frames, dtype=np.uint8).copy()
    elif sampwidth == 2:
        audio_data = np.frombuffer(frames, dtype=np.int16).copy()
    else:
        raise ValueError("Hanya mendukung file WAV 8-bit atau 16-bit PCM.")

    audio_data = audio_data.reshape(-1, n_channels)
    step = int(sample_rate_factor)
    if step < 1:
        step = 1

    compressed_data = audio_data[::step]
    new_framerate = int(framerate / step)

    new_sampwidth = sampwidth
    if bit_depth_factor == '8' and sampwidth == 2:
        # 16-bit to 8-bit
        compressed_data = ((compressed_data.astype(np.int32) + 32768) // 256).astype(np.uint8)
        new_sampwidth = 1
    elif bit_depth_factor == '16' and sampwidth == 1:
        # 8-bit to 16-bit
        compressed_data = (compressed_data.astype(np.int32) * 256 - 32768).astype(np.int16)
        new_sampwidth = 2

    with wave.open(output_path, 'wb') as wav_out:
        wav_out.setnchannels(n_channels)
        wav_out.setsampwidth(new_sampwidth)
        wav_out.setframerate(new_framerate)
        wav_out.writeframes(compressed_data.tobytes())

    original_size = os.path.getsize(input_path)
    compressed_size = os.path.getsize(output_path)
    ratio = (1 - compressed_size / max(original_size, 1)) * 100

    return {
        'original_size': original_size,
        'compressed_size': compressed_size,
        'compression_ratio': round(ratio, 1),
        'original_samplerate': framerate,
        'new_samplerate': new_framerate,
        'original_bitdepth': sampwidth * 8,
        'new_bitdepth': new_sampwidth * 8
    }


def compress_video_file(input_path, output_path, scale_factor, target_fps):
    """Kompresi video (resolution scaling & frame-rate reduction)."""
    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        raise ValueError("Gagal membuka file video.")

    orig_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    orig_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    orig_fps = cap.get(cv2.CAP_PROP_FPS)
    if orig_fps <= 0 or np.isnan(orig_fps):
        orig_fps = 24.0

    new_width = int(orig_width * scale_factor)
    new_height = int(orig_height * scale_factor)

    new_width = max(16, (new_width // 2) * 2)
    new_height = max(16, (new_height // 2) * 2)

    out_fps = float(target_fps)
    if out_fps > orig_fps:
        out_fps = orig_fps

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, out_fps, (new_width, new_height))
    if not out.isOpened():
        fourcc = cv2.VideoWriter_fourcc(*'XVID')
        out = cv2.VideoWriter(output_path, fourcc, out_fps, (new_width, new_height))
        if not out.isOpened():
            cap.release()
            raise ValueError("Tidak dapat menginisialisasi VideoWriter untuk kompresi.")

    frame_interval = max(1, int(orig_fps / out_fps))
    count = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if count % frame_interval == 0:
            resized_frame = cv2.resize(frame, (new_width, new_height), interpolation=cv2.INTER_AREA)
            out.write(resized_frame)
        count += 1

    cap.release()
    out.release()

    original_size = os.path.getsize(input_path)
    compressed_size = os.path.getsize(output_path)
    ratio = (1 - compressed_size / max(original_size, 1)) * 100

    return {
        'original_size': original_size,
        'compressed_size': compressed_size,
        'compression_ratio': round(ratio, 1),
        'original_resolution': f"{orig_width}x{orig_height}",
        'new_resolution': f"{new_width}x{new_height}",
        'original_fps': round(orig_fps, 1),
        'new_fps': round(out_fps, 1)
    }


# ==========================================
# FLASK ROUTING (MENGHUBUNGKAN KE FRONTEND)
# ==========================================

@app.route('/')
def index():
    """Halaman utama — memuat UI dari templates/index.html"""
    return render_template('index.html')


@app.route('/protocol-labs')
def protocol_labs():
    """Halaman Protocol Labs (Agent Handbook)"""
    return render_template('protocol_labs.html')


# ==========================================
# ROUTING API BARU (AUDIO / VIDEO / CODEC)
# ==========================================

@app.route('/encode/audio', methods=['POST'])
def encode_audio():
    if 'file' not in request.files or 'message' not in request.form:
        return jsonify({"success": False, "error": "Data tidak lengkap. Unggah file WAV dan isi pesan."}), 400

    file = request.files['file']
    message = request.form['message'].strip()
    password = request.form.get('password', '').strip() or None

    if not file.filename or not message:
        return jsonify({"success": False, "error": "File WAV dan pesan rahasia wajib diisi."}), 400

    safe_name = secure_filename(file.filename)
    if not safe_name.lower().endswith('.wav'):
        return jsonify({"success": False, "error": "Hanya mendukung file audio berformat .WAV."}), 400

    input_path = os.path.join(app.config['UPLOAD_FOLDER'], f'audio_in_{safe_name}')
    result_name = f'stego_audio_{uuid.uuid4().hex[:8]}.wav'
    output_path = os.path.join(app.config['UPLOAD_FOLDER'], result_name)

    file.save(input_path)

    try:
        stats = encode_audio_stego(input_path, message, output_path, password)
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
        if os.path.exists(input_path):
            os.remove(input_path)


@app.route('/decode/audio', methods=['POST'])
def decode_audio():
    if 'file' not in request.files:
        return jsonify({"success": False, "error": "Tidak ada file audio yang diunggah."}), 400

    file = request.files['file']
    password = request.form.get('password', '').strip() or None

    if not file.filename:
        return jsonify({"success": False, "error": "Tidak ada file audio yang dipilih."}), 400

    safe_name = secure_filename(file.filename)
    input_path = os.path.join(app.config['UPLOAD_FOLDER'], f'audio_dec_{safe_name}')
    file.save(input_path)

    try:
        result = decode_audio_stego(input_path, password)
        return jsonify(result)
    except Exception as e:
        return jsonify({"success": False, "error": f"Terjadi kesalahan: {str(e)}"}), 500
    finally:
        if os.path.exists(input_path):
            os.remove(input_path)


@app.route('/encode/video', methods=['POST'])
def encode_video():
    if 'file' not in request.files or 'message' not in request.form:
        return jsonify({"success": False, "error": "Data tidak lengkap. Unggah file video dan isi pesan."}), 400

    file = request.files['file']
    message = request.form['message'].strip()
    password = request.form.get('password', '').strip() or None

    if not file.filename or not message:
        return jsonify({"success": False, "error": "File video dan pesan rahasia wajib diisi."}), 400

    safe_name = secure_filename(file.filename)
    input_path = os.path.join(app.config['UPLOAD_FOLDER'], f'video_in_{safe_name}')
    result_name = f'stego_video_{uuid.uuid4().hex[:8]}.avi'
    output_path = os.path.join(app.config['UPLOAD_FOLDER'], result_name)

    file.save(input_path)

    try:
        stats = encode_video_stego(input_path, message, output_path, password)
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
        if os.path.exists(input_path):
            os.remove(input_path)


@app.route('/decode/video', methods=['POST'])
def decode_video():
    if 'file' not in request.files:
        return jsonify({"success": False, "error": "Tidak ada file video yang diunggah."}), 400

    file = request.files['file']
    password = request.form.get('password', '').strip() or None

    if not file.filename:
        return jsonify({"success": False, "error": "Tidak ada file video yang dipilih."}), 400

    safe_name = secure_filename(file.filename)
    input_path = os.path.join(app.config['UPLOAD_FOLDER'], f'video_dec_{safe_name}')
    file.save(input_path)

    try:
        result = decode_video_stego(input_path, password)
        return jsonify(result)
    except Exception as e:
        return jsonify({"success": False, "error": f"Terjadi kesalahan: {str(e)}"}), 500
    finally:
        if os.path.exists(input_path):
            os.remove(input_path)


@app.route('/codec/compress/image', methods=['POST'])
def codec_compress_image():
    if 'file' not in request.files:
        return jsonify({"success": False, "error": "Unggah gambar terlebih dahulu."}), 400

    file = request.files['file']
    format_type = request.form.get('format', 'JPEG').strip()
    quality = request.form.get('quality', '70').strip()

    if not file.filename:
        return jsonify({"success": False, "error": "File gambar wajib dipilih."}), 400

    safe_name = secure_filename(file.filename)
    input_path = os.path.join(app.config['UPLOAD_FOLDER'], f'img_comp_in_{safe_name}')
    ext = format_type.lower()
    result_name = f'compressed_img_{uuid.uuid4().hex[:8]}.{ext}'
    output_path = os.path.join(app.config['UPLOAD_FOLDER'], result_name)

    file.save(input_path)

    try:
        stats = compress_image_file(input_path, output_path, format_type, quality)
        return jsonify({
            'success': True,
            'download_url': f'/download/{result_name}',
            'filename': result_name,
            **stats
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if os.path.exists(input_path):
            os.remove(input_path)


@app.route('/codec/compress/audio', methods=['POST'])
def codec_compress_audio():
    if 'file' not in request.files:
        return jsonify({"success": False, "error": "Unggah file WAV terlebih dahulu."}), 400

    file = request.files['file']
    rate_factor = request.form.get('rate_factor', '2').strip()
    bit_depth = request.form.get('bit_depth', '8').strip()

    if not file.filename:
        return jsonify({"success": False, "error": "File audio wajib dipilih."}), 400

    safe_name = secure_filename(file.filename)
    if not safe_name.lower().endswith('.wav'):
        return jsonify({"success": False, "error": "Hanya mendukung file WAV untuk kompresi audio."}), 400

    input_path = os.path.join(app.config['UPLOAD_FOLDER'], f'aud_comp_in_{safe_name}')
    result_name = f'compressed_aud_{uuid.uuid4().hex[:8]}.wav'
    output_path = os.path.join(app.config['UPLOAD_FOLDER'], result_name)

    file.save(input_path)

    try:
        stats = compress_audio_file(input_path, output_path, rate_factor, bit_depth)
        return jsonify({
            'success': True,
            'download_url': f'/download/{result_name}',
            'filename': result_name,
            **stats
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if os.path.exists(input_path):
            os.remove(input_path)


@app.route('/codec/compress/video', methods=['POST'])
def codec_compress_video():
    if 'file' not in request.files:
        return jsonify({"success": False, "error": "Unggah video terlebih dahulu."}), 400

    file = request.files['file']
    scale = request.form.get('scale', '0.5').strip()
    fps = request.form.get('fps', '15').strip()

    if not file.filename:
        return jsonify({"success": False, "error": "File video wajib dipilih."}), 400

    safe_name = secure_filename(file.filename)
    input_path = os.path.join(app.config['UPLOAD_FOLDER'], f'vid_comp_in_{safe_name}')
    result_name = f'compressed_vid_{uuid.uuid4().hex[:8]}.mp4'
    output_path = os.path.join(app.config['UPLOAD_FOLDER'], result_name)

    file.save(input_path)

    try:
        scale_val = float(scale)
        fps_val = float(fps)
        stats = compress_video_file(input_path, output_path, scale_val, fps_val)
        return jsonify({
            'success': True,
            'download_url': f'/download/{result_name}',
            'filename': result_name,
            **stats
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if os.path.exists(input_path):
            os.remove(input_path)


# ==========================================
# STANDALONE SANDBOX API ENDPOINTS
# ==========================================

@app.route('/demo/crypto/encrypt', methods=['POST'])
def demo_crypto_encrypt():
    message = request.form.get('message', '').strip()
    password = request.form.get('password', '').strip() or None
    if not message:
        return jsonify({"success": False, "error": "Pesan wajib diisi."}), 400
    
    try:
        encrypted = encrypt_text(message, password)
        return jsonify({"success": True, "encrypted": encrypted})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/demo/crypto/decrypt', methods=['POST'])
def demo_crypto_decrypt():
    encrypted = request.form.get('encrypted', '').strip()
    password = request.form.get('password', '').strip() or None
    if not encrypted:
        return jsonify({"success": False, "error": "Pesan terenkripsi wajib diisi."}), 400
    
    try:
        decrypted = decrypt_text(encrypted, password)
        return jsonify({"success": True, "decrypted": decrypted})
    except ValueError as ve:
        return jsonify({"success": False, "error": str(ve)}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500




@app.route('/demo/codec/compress', methods=['POST'])
def demo_codec_compress():
    text = request.form.get('text', '').strip()
    if not text:
        return jsonify({"success": False, "error": "Teks wajib diisi."}), 400
    
    try:
        raw_bytes = text.encode('utf-8')
        compressed = zlib.compress(raw_bytes, 9)
        return jsonify({
            "success": True,
            "hex": compressed.hex(),
            "base64": base64.b64encode(compressed).decode('ascii'),
            "original_size": len(raw_bytes),
            "compressed_size": len(compressed),
            "ratio": round((1 - len(compressed) / max(len(raw_bytes), 1)) * 100, 1)
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/demo/codec/decompress', methods=['POST'])
def demo_codec_decompress():
    hex_data = request.form.get('hex_data', '').strip()
    if not hex_data:
        return jsonify({"success": False, "error": "Data hex wajib diisi."}), 400
    
    try:
        compressed_bytes = bytes.fromhex(hex_data)
        decompressed = zlib.decompress(compressed_bytes)
        return jsonify({
            "success": True,
            "text": decompressed.decode('utf-8')
        })
    except Exception as e:
        return jsonify({"success": False, "error": f"Dekompresi gagal: {str(e)}"}), 400



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
    print("  Server berjalan di http://localhost:5001")
    print("=" * 50)
    app.run(debug=True, port=5001)

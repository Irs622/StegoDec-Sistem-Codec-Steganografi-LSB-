# 📐 Technical Documentation — StegoDec System Design

This document provides a deep-dive technical reference for the StegoDec multimedia steganography and codec system, covering theoretical foundations, implementation decisions, and benchmark results.

---

## 1. Background & Problem Statement

Transmitting sensitive data over public networks exposes it to eavesdropping. While encryption protects *content*, it does not hide the *existence* of communication (traffic analysis). Steganography addresses this gap by concealing data inside innocuous carrier files.

StegoDec integrates three complementary layers to produce a robust covert communication system:

| Layer | Role |
|---|---|
| **Vigenere-XOR Cryptography** | Protects message confidentiality |
| **Zlib Deflate Compression** | Minimises payload size, reducing carrier distortion |
| **LSB Scrambling (PRNG)** | Hides the encrypted payload inside media |

Additionally, the system provides standalone **Multimedia Codec** tools (lossy/lossless compression for Image, Audio, and Video) to demonstrate the trade-offs between file size and quality.

---

## 2. Theoretical Foundations

### 2.1 LSB (Least Significant Bit) Steganography

LSB steganography replaces the lowest-order bit of each pixel (image), PCM sample (audio), or frame pixel (video) with a bit from the secret payload. Since the LSB contributes only `2⁰ = 1` to the overall value out of a possible 255, the perceptual impact is negligible.

### 2.2 PRNG-Based Index Scrambling

Naive sequential LSB embedding is detectable via statistical analysis (e.g. chi-square steganalysis). StegoDec uses a **PRNG seeded from the user's password** to randomise the order in which carrier positions are written:

```
seed  = SHA-256(password)
index_list = shuffle(all_carrier_positions, seed=seed)
for bit, position in zip(payload_bits, index_list):
    carrier[position] = (carrier[position] & ~1) | bit
```

This distribution of modified bits closely matches natural carrier noise, significantly increasing resistance to statistical detection.

### 2.3 Vigenere-XOR Cipher with Random Salt

```
plaintext  →  UTF-8 bytes
           →  XOR with keystream (password + 3-digit random salt, with positional modifiers)
           →  base64 encode
           →  prefix: SECURE_{salt}_{ciphertext}
```

The per-message random salt prevents identical plaintexts from producing the same ciphertext under the same key (known-plaintext attack resistance).

### 2.4 Lossless Codec — Zlib / Deflate

Zlib at compression level 9 applies **LZ77** (duplicate string elimination) followed by **Huffman Coding** (variable-length bit representation) to the payload. For English text, this typically yields 60–80% size reduction, directly reducing the number of carrier positions that must be modified.

### 2.5 Media Codec Techniques

| Media | Compression Technique | Type |
|---|---|---|
| Image → JPEG | Discrete Cosine Transform (DCT) + Quantisation | Lossy |
| Image → WebP | Predictive coding + entropy coding | Lossy/Lossless |
| Image → PNG | DEFLATE | Lossless |
| Audio → WAV | Downsampling (e.g. 44.1 kHz → 16 kHz) + Bit-depth reduction (16-bit → 8-bit) | Lossy |
| Video → AVI | Resolution scaling + FPS reduction | Lossy |

---

## 3. Implementation Notes

### 3.1 Why Lossless Carriers for Steganography?

Lossy codecs (JPEG, MP4/H.264) discard sub-perceptual detail to reduce file size, which includes LSB data. StegoDec enforces lossless output formats for all stego operations:

| Carrier | Format | Guarantee |
|---|---|---|
| Image | PNG (DEFLATE) | Pixel-perfect preservation |
| Audio | WAV (PCM, uncompressed) | Sample-exact preservation |
| Video | AVI (FFV1 codec) | Frame-exact, lossless intra-frame |

### 3.2 Video Steganography — Why FFV1 over HuffYUV?

FFV1 is an open, standardised lossless video codec (IETF RFC 9043) with superior compression ratios compared to HuffYUV, while still providing mathematically lossless reconstruction. It is well-supported in OpenCV via FFmpeg and produces smaller AVI files for equivalent lossless quality.

### 3.3 Payload Capacity Limits

| Carrier | Maximum Payload (bytes) |
|---|---|
| Image (W × H, RGB) | `(W × H × 3) / 8` − header |
| Audio (N samples, 16-bit) | `N / 8` |
| Video (F frames, W × H, RGB) | `(F × W × H × 3) / 8` − header |

Zlib pre-compression dramatically increases the effective message capacity for text-based payloads.

---

## 4. Benchmark Results

| Test | Input | Output | Result |
|---|---|---|---|
| Image stego round-trip | — | — | ✅ 100% bit-accurate extraction |
| Audio stego round-trip | — | — | ✅ 100% bit-accurate extraction |
| Video stego round-trip | — | — | ✅ 100% bit-accurate extraction |
| Audio codec (WAV) | 64 KB | 16 KB | 74.9% reduction |
| Video codec (AVI) | 1.0 MB | 14 KB | 98.6% reduction |
| Message Zlib compression | Variable | Variable | ~60–80% reduction (English text) |

Perceptual impact of audio LSB embedding was measured at **< −70 dB SNR**, which is below the threshold of human hearing.

---

## 5. Deployment Architecture

```
Browser (SPA)
     │  AJAX (multipart/form-data)
     ▼
Flask REST API (app.py)
     │
     ├── /encode|decode/* ── Algorithm modules (OpenCV, wave, zlib)
     ├── /compress/*      ── Codec modules
     └── /sandbox/*       ── Standalone crypto/compression tools
     │
     ▼
Uploads temp directory (ephemeral, auto-cleaned)
```

The application is stateless per-request — uploaded files are processed and deleted immediately after the response is served.


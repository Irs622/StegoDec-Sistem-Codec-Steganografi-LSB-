# 🔐 Design Decisions & Security Analysis — StegoDec

This document explains the key design decisions behind StegoDec's steganography pipeline and addresses the most common security-critical questions about the system's threat model and operational scope.

---

## 1. Operational Scope & Threat Model

StegoDec is designed for **two specific use cases**:

| Use Case | Description |
|---|---|
| **Cold Storage / Local Archive** | Storing sensitive data (e.g. private keys, credentials, confidential notes) inside innocuous-looking image or audio files on local disk. A PNG photo among thousands raises no suspicion; a plaintext `.txt` file does. |
| **Lossless Document Transfer** | Sharing stego files via channels that preserve binary integrity — email attachments, Google Drive, Dropbox, SFTP, or "Send as Document" mode in Telegram/WhatsApp — where the file is transmitted byte-for-byte without re-encoding. |

> **Out of scope**: Social steganography (embedding in files shared via platform media feeds). Social media platforms (Instagram, Twitter, Telegram media, WhatsApp media) automatically re-compress uploaded images and videos, destroying LSB data. This is a known limitation of all spatial-domain steganography, not a flaw unique to StegoDec.

---

## 2. Why LSB Instead of Transform-Domain Steganography?

Transform-domain methods (e.g. embedding in DCT coefficients of JPEG) are robust against JPEG re-compression, but come with significant trade-offs:

| Property | LSB (Spatial Domain) | DCT/DWT (Transform Domain) |
|---|---|---|
| **Payload capacity** | High — up to 3 bits/pixel for RGB images | Low — typically < 0.1 bits/pixel to avoid visible artefacts |
| **Computational complexity** | O(n) — very fast | O(n log n) — requires transform & inverse transform |
| **Lossless channel requirement** | Yes | No (survives some lossy compression) |
| **Implementation complexity** | Simple | Complex coefficient manipulation required |

For StegoDec's target use cases (local storage and lossless transfer), LSB offers superior capacity and simplicity at the cost of lossy-channel robustness — an acceptable trade-off given the defined operational scope.

---

## 3. Why PNG / WAV / AVI (FFV1) as Carriers?

All stego output formats in StegoDec are **strictly lossless**:

| Format | Compression | Bit-accuracy |
|---|---|---|
| **PNG** | DEFLATE (lossless) | ✅ Every pixel stored exactly as written |
| **WAV (PCM)** | None | ✅ Every sample stored exactly as written |
| **AVI (FFV1)** | Lossless intra-frame (IETF RFC 9043) | ✅ Every frame pixel stored exactly as written |
| ~~JPEG~~ | DCT (lossy) | ❌ Quantisation destroys LSBs |
| ~~MP4 (H.264)~~ | Inter-frame (lossy) | ❌ Temporal prediction destroys LSBs |

Using a lossless container is the single most important requirement for correct LSB extraction. StegoDec enforces this at the API level — the encode endpoints always return the lossless format regardless of input format.

---

## 4. Steganalysis Resistance

### 4.1 Sequential LSB — Vulnerable

A naive implementation embeds bits at positions 0, 1, 2, 3, … in order. Statistical tools (chi-square test, RS analysis) can detect the resulting unnatural bit distribution and confirm that a file contains hidden data.

### 4.2 PRNG Scrambling — Mitigated

StegoDec derives a PRNG seed from the user's password and uses it to shuffle the list of all carrier positions before writing:

```
Modified positions are indistinguishable from random channel noise
without the seed (i.e. without the password).
```

This provides **security through obscurity combined with a secret key** — a significant improvement over sequential LSB, though not a cryptographic guarantee.

### 4.3 Zlib Pre-compression — Reduces Footprint

Compressing the payload before embedding reduces the number of carrier positions that must be modified. Fewer modifications = smaller statistical deviation from an unmodified carrier = harder steganalysis detection.

---

## 5. Sending Stego Files Safely

| Transfer Method | Preserves Binary? | Safe for Stego? |
|---|---|---|
| Email attachment | ✅ Yes | ✅ Yes |
| Google Drive / Dropbox (download link) | ✅ Yes | ✅ Yes |
| SFTP / SCP | ✅ Yes | ✅ Yes |
| Telegram — "Send as File / Document" | ✅ Yes | ✅ Yes |
| WhatsApp — "Send as Document" | ✅ Yes | ✅ Yes |
| Telegram / WhatsApp — media (image/video) | ❌ Re-compressed | ❌ **Destroys LSBs** |
| Instagram / Twitter upload | ❌ Re-compressed | ❌ **Destroys LSBs** |

**Rule of thumb**: If the platform shows a preview or thumbnail before sending, it is re-compressing the file. Always use the document/file attachment option.

---

## 6. Cryptographic Limitations & Recommendations

The Vigenere-XOR cipher used in StegoDec is a **lightweight symmetric cipher** designed for ease of implementation and zero external dependencies. It is **not** an industry-standard cipher (e.g. AES-256-GCM) and does not provide formal cryptographic security guarantees.

**Recommendations for high-security deployments**:
- Pre-encrypt sensitive content with a strong cipher (e.g. GPG / AES-GCM) before passing it to StegoDec.
- Use StegoDec as a steganographic transport layer on top of an existing encryption layer.
- Treat the Vigenere-XOR layer as obfuscation, not primary security.


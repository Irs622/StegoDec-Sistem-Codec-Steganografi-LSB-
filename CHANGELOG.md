# Changelog

All notable changes to **StegoDec** are documented here.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) · versioning follows [Semantic Versioning](https://semver.org/).

---

## [v2.0.0] — 2026-08-19 🚀 *Production Release*

### 🌐 Deployment
- Deployed publicly to **Hugging Face Spaces** via Docker SDK — fully accessible at [huggingface.co/spaces/irsal622/stegodec](https://huggingface.co/spaces/irsal622/stegodec)
- All four feature hubs (Image, Audio, Video, Sandbox) verified working in production

### 📝 Documentation
- Completely rewrote `README.md` as a portfolio-quality document:
  - Hero header with technology badges (Python, Flask, OpenCV, Docker)
  - GitHub Stars, Release, and Live Demo badges with correct links
  - Live UI preview screenshot (`assets/demo.png`)
  - Architecture diagram with ASCII data-flow
  - Full REST API reference tables (Image / Audio / Video / Sandbox endpoints)
  - Algorithm Deep Dive — PRNG scrambling, Vigenere-XOR, lossless carrier table
  - Performance benchmark table
  - Collapsible FAQ section
  - Docker and Hugging Face deployment guides
- Rewrote `LAPORAN_UAS_GUIDE.md` → **Technical Documentation** covering:
  - Problem statement and system layer overview
  - Theoretical foundations (LSB, PRNG, Vigenere-XOR, Zlib, media codecs)
  - Implementation notes and payload capacity limits
  - Benchmark results table
  - Deployment architecture diagram
- Rewrote `defense_arguments.md` → **Design Decisions & Security Analysis** covering:
  - Operational scope and threat model
  - LSB vs transform-domain steganography comparison
  - Lossless carrier format justification
  - Steganalysis resistance analysis (sequential → PRNG → Zlib footprint)
  - Safe transfer channel guide (table format)
  - Cryptographic limitations and recommendations
- Added `assets/demo.png` — live screenshot of the production dashboard

---

## [v1.0.0] — Initial Development

### ✨ Added
- **Image Hub** — LSB steganography (PRNG-scrambled) + JPEG/WebP/PNG codec
- **Audio Hub** — LSB steganography on PCM WAV + downsampling/bit-depth codec
- **Video Hub** — per-frame LSB steganography on AVI (FFV1/lossless) + resolution/FPS codec
- **Sandbox Tools** — standalone Vigenere-XOR cipher and Zlib compress/decompress playground
- Flask REST API backend (`app.py`) with all encode/decode/compress endpoints
- Single Page Application (SPA) frontend with dark-mode cyberpunk design
- `Dockerfile` for containerised deployment
- `vercel.json` for experimental serverless deployment
- Vigenere-XOR cipher with random salt (steganalysis resistance)
- Zlib level-9 pre-compression of payloads before embedding

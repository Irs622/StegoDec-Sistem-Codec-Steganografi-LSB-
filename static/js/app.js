/**
 * StegoDec — Frontend Interactivity
 * Handles file uploads, form submissions via fetch API,
 * result display, stats updates, and UI state management.
 */
document.addEventListener('DOMContentLoaded', function () {

    // ==========================================
    // INITIALIZE LUCIDE ICONS
    // ==========================================
    lucide.createIcons();

    // ==========================================
    // STATE
    // ==========================================
    let encoderFile = null;
    let decoderFile = null;
    let encoderImageCapacity = 0;

    // ==========================================
    // DOM REFERENCES
    // ==========================================

    // Encoder elements
    const encoderInput = document.getElementById('encoder-file-input');
    const encoderEmpty = document.getElementById('encoder-empty');
    const encoderInfo = document.getElementById('encoder-info');
    const encoderPreviewImg = document.getElementById('encoder-preview-img');
    const encoderFileName = document.getElementById('encoder-file-name');
    const encoderFileDetails = document.getElementById('encoder-file-details');
    const secretMessage = document.getElementById('secret-message');
    const charCount = document.getElementById('char-count');
    const encodePassword = document.getElementById('encode-password');
    const encodeBtn = document.getElementById('encode-btn');
    const encodeBtnText = document.getElementById('encode-btn-text');
    const encodeBtnIcon = document.getElementById('encode-btn-icon');
    const encodeResult = document.getElementById('encode-result');
    const downloadLink = document.getElementById('download-link');

    // Decoder elements
    const decoderInput = document.getElementById('decoder-file-input');
    const decoderEmpty = document.getElementById('decoder-empty');
    const decoderInfo = document.getElementById('decoder-info');
    const decoderPreviewImg = document.getElementById('decoder-preview-img');
    const decoderFileName = document.getElementById('decoder-file-name');
    const decoderFileDetails = document.getElementById('decoder-file-details');
    const decodePassword = document.getElementById('decode-password');
    const decodeBtn = document.getElementById('decode-btn');
    const decodeBtnText = document.getElementById('decode-btn-text');
    const decodeResultEmpty = document.getElementById('decode-result-empty');
    const decodeResultSuccess = document.getElementById('decode-result-success');
    const decodeResultError = document.getElementById('decode-result-error');
    const extractedMessage = document.getElementById('extracted-message');
    const decodeErrorText = document.getElementById('decode-error-text');

    // Stats elements
    const statsEmpty = document.getElementById('stats-empty');
    const statsContent = document.getElementById('stats-content');

    // ==========================================
    // UPTIME TIMER
    // ==========================================
    let uptimeSeconds = 36840; // Start at 10:14:00
    const uptimeEl = document.getElementById('uptime-display');

    setInterval(function () {
        uptimeSeconds++;
        const h = Math.floor(uptimeSeconds / 3600);
        const m = Math.floor((uptimeSeconds % 3600) / 60);
        const s = uptimeSeconds % 60;
        uptimeEl.textContent =
            String(h).padStart(2, '0') + ':' +
            String(m).padStart(2, '0') + ':' +
            String(s).padStart(2, '0');
    }, 1000);

    // ==========================================
    // DYNAMIC CAPACITY INDICATOR HELPERS
    // ==========================================
    function updateCapacityIndicator() {
        const indicator = document.getElementById('capacity-indicator');
        if (!encoderFile || encoderImageCapacity === 0) {
            indicator.classList.add('hidden');
            return;
        }

        const message = secretMessage.value;
        const pwd = encodePassword.value;

        // Estimasi byte payload: XOR-Vigenere + zlib + Delimiter
        // zlib kompresi teks umumnya menghemat 50%, tapi untuk teks pendek ada overhead.
        // Sebagai estimasi aman batas atas, kita gunakan panjang terenkripsi + delimiter.
        const payloadLength = pwd ? (12 + Math.ceil(message.length / 3) * 4) : message.length;
        const delimiterLength = 20; // ====STEGODEC_END====
        const estimatedBits = (payloadLength + delimiterLength) * 8;

        indicator.classList.remove('hidden');

        const capacityRibu = (encoderImageCapacity / 1000).toFixed(1);

        if (estimatedBits > encoderImageCapacity) {
            indicator.className = "text-[10px] font-mono text-[#e22718] uppercase mt-2 font-bold animate-pulse";
            indicator.textContent = `Kapasitas gambar ini: ${capacityRibu} ribu bit. Pesan Anda saat ini: ${estimatedBits} bit (Terlalu Besar)`;
        } else {
            indicator.className = "text-[10px] font-mono text-green-400 uppercase mt-2";
            indicator.textContent = `Kapasitas gambar ini: ${capacityRibu} ribu bit. Pesan Anda saat ini: ${estimatedBits} bit (Aman)`;
        }
    }

    // ==========================================
    // CHARACTER COUNTER & INPUT LISTENERS
    // ==========================================
    secretMessage.addEventListener('input', function () {
        charCount.textContent = secretMessage.value.length + ' CHR';
        updateCapacityIndicator();
    });

    encodePassword.addEventListener('input', function () {
        updateCapacityIndicator();
    });

    // ==========================================
    // ENCODER FILE INPUT
    // ==========================================
    encoderInput.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;

        encoderFile = file;

        // Toggle display
        encoderEmpty.classList.add('hidden');
        encoderInfo.classList.remove('hidden');

        // Update file info
        encoderFileName.textContent = file.name;
        encoderFileDetails.textContent =
            'IMAGE \u2022 ' + (file.size / 1024).toFixed(1) + ' KB \u2022 ' + (file.type || 'binary');

        // Show image preview and calculate capacity
        encoderPreviewImg.classList.add('hidden');
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function () {
                encoderPreviewImg.src = reader.result;
                encoderPreviewImg.classList.remove('hidden');

                // Dapatkan resolusi gambar
                const img = new Image();
                img.src = reader.result;
                img.onload = function () {
                    encoderImageCapacity = img.naturalWidth * img.naturalHeight * 3; // RGB channels
                    updateCapacityIndicator();
                };
            };
            reader.readAsDataURL(file);
        } else {
            encoderImageCapacity = 0;
            updateCapacityIndicator();
        }

        // Reset previous results
        encodeResult.classList.add('hidden');
        statsContent.classList.add('hidden');
        statsEmpty.classList.remove('hidden');
    });

    // ==========================================
    // DECODER FILE INPUT
    // ==========================================
    decoderInput.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;

        decoderFile = file;

        // Toggle display
        decoderEmpty.classList.add('hidden');
        decoderInfo.classList.remove('hidden');

        // Update file info
        decoderFileName.textContent = file.name;
        decoderFileDetails.textContent =
            'IMAGE \u2022 ' + (file.size / 1024).toFixed(1) + ' KB \u2022 ' + (file.type || 'binary');

        // Show image preview
        decoderPreviewImg.classList.add('hidden');
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function () {
                decoderPreviewImg.src = reader.result;
                decoderPreviewImg.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }

        // Reset results
        decodeResultSuccess.classList.add('hidden');
        decodeResultError.classList.add('hidden');
        decodeResultEmpty.classList.remove('hidden');
    });

    // ==========================================
    // ENCODE — SUBMIT TO /encode
    // ==========================================
    encodeBtn.addEventListener('click', async function () {
        if (!encoderFile) {
            alert('Harap unggah file gambar cover terlebih dahulu.');
            return;
        }

        const message = secretMessage.value.trim();
        if (!message) {
            alert('Harap ketik pesan rahasia yang ingin disembunyikan.');
            return;
        }

        const password = encodePassword.value;

        // Build FormData (enctype="multipart/form-data")
        const formData = new FormData();
        formData.append('file', encoderFile);
        formData.append('message', message);
        if (password) formData.append('password', password);

        // Loading state
        encodeBtn.disabled = true;
        encodeBtnIcon.classList.add('hidden');
        encodeBtnText.textContent = 'MEMPROSES PENYISIPAN...';

        try {
            const response = await fetch('/encode', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                // Show download link
                downloadLink.href = data.download_url;
                downloadLink.setAttribute('download', data.filename);
                encodeResult.classList.remove('hidden');

                // Update stats panel
                updateStats(data);
            } else {
                alert('Error: ' + data.error);
            }
        } catch (err) {
            alert('Terjadi kesalahan koneksi: ' + err.message);
        } finally {
            encodeBtn.disabled = false;
            encodeBtnIcon.classList.remove('hidden');
            encodeBtnText.textContent = 'PROCESS & HUSH MEDIA';
        }
    });

    // ==========================================
    // DECODE — SUBMIT TO /decode
    // ==========================================
    decodeBtn.addEventListener('click', async function () {
        if (!decoderFile) {
            alert('Harap unggah file gambar stego yang ingin di-decode.');
            return;
        }

        const password = decodePassword.value;

        // Build FormData
        const formData = new FormData();
        formData.append('file', decoderFile);
        if (password) formData.append('password', password);

        // Loading state
        decodeBtn.disabled = true;
        decodeBtnText.textContent = 'MENGEKSTRAK...';

        try {
            const response = await fetch('/decode', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            // Hide empty state
            decodeResultEmpty.classList.add('hidden');

            if (data.success) {
                // Show success
                decodeResultError.classList.add('hidden');
                decodeResultSuccess.classList.remove('hidden');
                extractedMessage.textContent = data.message;

                // Update decode stats if available
                if (data.compressed_size !== undefined) {
                    var dc = document.getElementById('decode-compressed');
                    var dd = document.getElementById('decode-decompressed');
                    var de = document.getElementById('decode-encrypted');
                    if (dc) dc.textContent = data.compressed_size + ' bytes';
                    if (dd) dd.textContent = data.decompressed_size + ' bytes';
                    if (de) de.textContent = data.is_encrypted ? 'YA (XOR-Vigenere)' : 'TIDAK';
                }
            } else {
                // Show error
                decodeResultSuccess.classList.add('hidden');
                decodeResultError.classList.remove('hidden');
                decodeErrorText.textContent = data.error;
            }
        } catch (err) {
            decodeResultEmpty.classList.add('hidden');
            decodeResultSuccess.classList.add('hidden');
            decodeResultError.classList.remove('hidden');
            decodeErrorText.textContent = 'Koneksi gagal: ' + err.message;
        } finally {
            decodeBtn.disabled = false;
            decodeBtnText.textContent = 'PROSES EKSTRAKSI (START DECODE)';
        }
    });

    // ==========================================
    // UPDATE STATS PANEL (after encode)
    // ==========================================
    function updateStats(data) {
        statsEmpty.classList.add('hidden');
        statsContent.classList.remove('hidden');
        statsContent.classList.add('fade-in');

        document.getElementById('stat-original').textContent = data.original_size + ' bytes';
        document.getElementById('stat-compressed').textContent = data.compressed_size + ' bytes';
        document.getElementById('stat-ratio').textContent = data.compression_ratio + '%';
        document.getElementById('stat-bits').textContent = Number(data.bits_embedded).toLocaleString() + ' bits';
        document.getElementById('stat-capacity').textContent = Number(data.image_capacity).toLocaleString() + ' bits';
        document.getElementById('stat-usage').textContent = data.capacity_used + '%';

        // Update progress bar
        var bar = document.getElementById('capacity-progress');
        if (bar) {
            bar.style.width = Math.min(data.capacity_used, 100) + '%';
        }
    }

    // ==========================================
    // COPY TO CLIPBOARD
    // ==========================================
    window.copyExtractedMessage = function () {
        var msg = extractedMessage.textContent;
        navigator.clipboard.writeText(msg).then(function () {
            var btn = document.getElementById('copy-result-btn');
            var icon = btn.querySelector('[data-lucide]');
            if (icon) {
                icon.setAttribute('data-lucide', 'check');
                icon.classList.add('text-green-500');
                lucide.createIcons();
                setTimeout(function () {
                    icon.setAttribute('data-lucide', 'copy');
                    icon.classList.remove('text-green-500');
                    lucide.createIcons();
                }, 2000);
            }
        });
    };

});

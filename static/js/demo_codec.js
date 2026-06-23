/**
 * StegoDec — Codec Demo Logic
 */
document.addEventListener('DOMContentLoaded', function () {

    // DOM Elements
    const compressText = document.getElementById('compress-text');
    const compressBtn = document.getElementById('compress-btn');
    const hexResult = document.getElementById('hex-result');
    const copyHexBtn = document.getElementById('copy-hex-btn');

    const decompressHex = document.getElementById('decompress-hex');
    const decompressBtn = document.getElementById('decompress-btn');
    const decompressedResult = document.getElementById('decompressed-result');

    // Stats Elements
    const codecOriginal = document.getElementById('codec-original');
    const codecCompressed = document.getElementById('codec-compressed');
    const codecRatio = document.getElementById('codec-ratio');

    // Bar Chart Elements
    const barOriginal = document.getElementById('bar-original');
    const barOriginalLabel = document.getElementById('bar-original-label');
    const barCompressed = document.getElementById('bar-compressed');
    const barCompressedLabel = document.getElementById('bar-compressed-label');

    // ==========================================
    // COMPRESS HANDLER
    // ==========================================
    compressBtn.addEventListener('click', async function () {
        const text = compressText.value.trim();

        if (!text) {
            alert('Masukkan Plaintext terlebih dahulu.');
            return;
        }

        compressBtn.disabled = true;
        compressBtn.textContent = 'MEMPROSES...';

        try {
            const formData = new FormData();
            formData.append('text', text);

            const response = await fetch('/demo/codec/compress', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                hexResult.textContent = data.hex;
                hexResult.classList.remove('text-red-500');
                hexResult.classList.add('text-[#0066b1]');
                copyHexBtn.classList.remove('hidden');

                // Update Stats
                codecOriginal.textContent = data.original_size + ' bytes';
                codecCompressed.textContent = data.compressed_size + ' bytes';
                codecRatio.textContent = data.ratio + '%';

                // Update Chart
                barOriginalLabel.textContent = data.original_size + ' bytes';
                barCompressedLabel.textContent = data.compressed_size + ' bytes';

                // Calculate ratios for the bar charts
                barOriginal.style.width = '100%';
                const percentage = Math.max(0, Math.min(100, (data.compressed_size / data.original_size) * 100));
                barCompressed.style.width = percentage + '%';
            } else {
                hexResult.textContent = 'Error: ' + data.error;
                hexResult.classList.add('text-red-500');
                copyHexBtn.classList.add('hidden');
            }
        } catch (err) {
            hexResult.textContent = 'Koneksi gagal: ' + err.message;
            hexResult.classList.add('text-red-500');
        } finally {
            compressBtn.disabled = false;
            compressBtn.textContent = 'PROSES KOMPRESI';
        }
    });

    // ==========================================
    // DECOMPRESS HANDLER
    // ==========================================
    decompressBtn.addEventListener('click', async function () {
        const hex = decompressHex.value.trim();

        if (!hex) {
            alert('Masukkan Hex Dump terlebih dahulu.');
            return;
        }

        decompressBtn.disabled = true;
        decompressBtn.textContent = 'MEMPROSES...';

        try {
            const formData = new FormData();
            formData.append('hex_data', hex);

            const response = await fetch('/demo/codec/decompress', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                decompressedResult.textContent = data.text;
                decompressedResult.classList.remove('text-red-500');
                decompressedResult.classList.add('text-green-400');
            } else {
                decompressedResult.textContent = data.error;
                decompressedResult.classList.remove('text-green-400');
                decompressedResult.classList.add('text-red-500');
            }
        } catch (err) {
            decompressedResult.textContent = 'Koneksi gagal: ' + err.message;
            decompressedResult.classList.add('text-red-500');
        } finally {
            decompressBtn.disabled = false;
            decompressBtn.textContent = 'PROSES DEKOMPRESI';
        }
    });

    // ==========================================
    // COPY BUTTON
    // ==========================================
    copyHexBtn.addEventListener('click', function () {
        navigator.clipboard.writeText(hexResult.textContent).then(function () {
            const icon = copyHexBtn.querySelector('i');
            if (icon) {
                icon.setAttribute('data-lucide', 'check');
                copyHexBtn.classList.add('bg-green-600');
                lucide.createIcons();
                setTimeout(function () {
                    icon.setAttribute('data-lucide', 'copy');
                    copyHexBtn.classList.remove('bg-green-600');
                    lucide.createIcons();
                }, 2000);
            }
        });
    });

});

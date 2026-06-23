/**
 * StegoDec — Steganography Demo Logic
 */
document.addEventListener('DOMContentLoaded', function () {

    // ==========================================
    // ENCODER DOM ELEMENTS
    // ==========================================
    const encodeFileInput = document.getElementById('stego-encode-file');
    const encodeEmpty = document.getElementById('stego-encode-empty');
    const encodeInfo = document.getElementById('stego-encode-info');
    const encodePreview = document.getElementById('stego-encode-preview');
    const encodeFilename = document.getElementById('stego-encode-filename');
    const stegoMessage = document.getElementById('stego-message');
    const encodePassword = document.getElementById('stego-encode-password');
    const encodeBtn = document.getElementById('stego-encode-btn');
    const encodeResultDiv = document.getElementById('stego-encode-result');
    const downloadLink = document.getElementById('stego-download-link');

    // ==========================================
    // DECODER DOM ELEMENTS
    // ==========================================
    const decodeFileInput = document.getElementById('stego-decode-file');
    const decodeEmpty = document.getElementById('stego-decode-empty');
    const decodeInfo = document.getElementById('stego-decode-info');
    const decodePreview = document.getElementById('stego-decode-preview');
    const decodeFilename = document.getElementById('stego-decode-filename');
    const decodePassword = document.getElementById('stego-decode-password');
    const decodeBtn = document.getElementById('stego-decode-btn');
    const decodeResult = document.getElementById('stego-decode-result');

    // ==========================================
    // LOG TABLE ELEMENTS
    // ==========================================
    const pixelChangedCount = document.getElementById('stego-pixels-changed-count');
    const pixelLogBody = document.getElementById('stego-pixel-log-body');

    let encodeFile = null;
    let decodeFile = null;
    let encoderImageCapacity = 0;

    // ==========================================
    // DYNAMIC CAPACITY INDICATOR HELPERS
    // ==========================================
    function updateCapacityIndicator() {
        const indicator = document.getElementById('stego-capacity-indicator');
        if (!encodeFile || encoderImageCapacity === 0) {
            indicator.classList.add('hidden');
            return;
        }

        const message = stegoMessage.value;
        const delimiterLength = 20; // ====STEGODEC_END====
        const estimatedBits = (message.length + delimiterLength) * 8;

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

    stegoMessage.addEventListener('input', function () {
        updateCapacityIndicator();
    });

    // ==========================================
    // ENCODE FILE UPLOAD PREVIEW
    // ==========================================
    encodeFileInput.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;

        encodeFile = file;
        encodeEmpty.classList.add('hidden');
        encodeInfo.classList.remove('hidden');
        encodeFilename.textContent = file.name;

        encodePreview.classList.add('hidden');
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function () {
                encodePreview.src = reader.result;
                encodePreview.classList.remove('hidden');

                const img = new Image();
                img.src = reader.result;
                img.onload = function () {
                    encoderImageCapacity = img.naturalWidth * img.naturalHeight * 3;
                    updateCapacityIndicator();
                };
            };
            reader.readAsDataURL(file);
        } else {
            encoderImageCapacity = 0;
            updateCapacityIndicator();
        }

        // Reset previous results
        encodeResultDiv.classList.add('hidden');
    });

    // ==========================================
    // DECODE FILE UPLOAD PREVIEW
    // ==========================================
    decodeFileInput.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;

        decodeFile = file;
        decodeEmpty.classList.add('hidden');
        decodeInfo.classList.remove('hidden');
        decodeFilename.textContent = file.name;

        decodePreview.classList.add('hidden');
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function () {
                decodePreview.src = reader.result;
                decodePreview.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }

        // Reset previous results
        decodeResult.textContent = '-';
        decodeResult.classList.remove('text-red-500', 'text-green-400');
    });

    // ==========================================
    // SUBMIT ENCODE
    // ==========================================
    encodeBtn.addEventListener('click', async function () {
        const message = stegoMessage.value.trim();
        const password = encodePassword.value;

        if (!encodeFile) {
            alert('Silakan pilih file gambar cover terlebih dahulu.');
            return;
        }
        if (!message) {
            alert('Masukkan pesan yang ingin disisipkan.');
            return;
        }

        encodeBtn.disabled = true;
        encodeBtn.textContent = 'MENYISIPKAN...';

        const formData = new FormData();
        formData.append('file', encodeFile);
        formData.append('message', message);
        if (password) formData.append('password', password);

        try {
            const response = await fetch('/demo/stego/encode', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                // Show download link
                downloadLink.href = data.download_url;
                downloadLink.setAttribute('download', data.filename);
                encodeResultDiv.classList.remove('hidden');

                // Update pixel count logger
                pixelChangedCount.textContent = 'TOTAL PIXEL BERUBAH: ' + Number(data.total_changed_pixels).toLocaleString() + ' PIXEL';

                // Populate pixel logger table
                pixelLogBody.innerHTML = '';
                const channelsMap = ['Blue (B)', 'Green (G)', 'Red (R)'];

                data.changed_pixels_sample.forEach((pixel, idx) => {
                    const row = document.createElement('tr');
                    row.className = 'border-b border-[#111] hover:bg-[#080808] font-mono text-[11px]';
                    
                    const diffVal = pixel.new_val - pixel.old_val;
                    const diffString = diffVal > 0 ? '+' + diffVal : diffVal;
                    const diffClass = diffVal > 0 ? 'text-green-400 font-bold' : 'text-red-500 font-bold';

                    row.innerHTML = `
                        <td class="py-2 px-3 text-slate-500">#${idx + 1}</td>
                        <td class="py-2 px-3 text-white">Baris: ${pixel.row}, Kolom: ${pixel.col}</td>
                        <td class="py-2 px-3 font-semibold text-slate-400">${channelsMap[pixel.channel] || 'Unknown'}</td>
                        <td class="py-2 px-3 text-center text-slate-400">${pixel.old_val}</td>
                        <td class="py-2 px-3 text-center text-white font-bold">${pixel.new_val}</td>
                        <td class="py-2 px-3 text-right ${diffClass}">${diffString}</td>
                    `;
                    pixelLogBody.appendChild(row);
                });

                if (data.changed_pixels_sample.length === 0) {
                    pixelLogBody.innerHTML = `
                        <tr>
                            <td colspan="6" class="py-8 text-center text-slate-500">Tidak ada perubahan piksel (pesan kosong atau kapasitas 0).</td>
                        </tr>
                    `;
                }

            } else {
                alert('Penyisipan gagal: ' + data.error);
            }
        } catch (err) {
            alert('Kesalahan koneksi: ' + err.message);
        } finally {
            encodeBtn.disabled = false;
            encodeBtn.textContent = 'SISIPKAN PESAN KE LSB';
        }
    });

    // ==========================================
    // SUBMIT DECODE
    // ==========================================
    decodeBtn.addEventListener('click', async function () {
        const password = decodePassword.value;

        if (!decodeFile) {
            alert('Silakan pilih file gambar stego terlebih dahulu.');
            return;
        }

        decodeBtn.disabled = true;
        decodeBtn.textContent = 'MENGEKSTRAK...';

        const formData = new FormData();
        formData.append('file', decodeFile);
        if (password) formData.append('password', password);

        try {
            const response = await fetch('/demo/stego/decode', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                decodeResult.textContent = data.extracted_message;
                decodeResult.classList.remove('text-red-500');
                decodeResult.classList.add('text-green-400');
            } else {
                decodeResult.textContent = data.error;
                decodeResult.classList.remove('text-green-400');
                decodeResult.classList.add('text-red-500');
            }
        } catch (err) {
            decodeResult.textContent = 'Koneksi gagal: ' + err.message;
            decodeResult.classList.add('text-red-500');
        } finally {
            decodeBtn.disabled = false;
            decodeBtn.textContent = 'PROSES EKSTRAKSI LSB';
        }
    });

});

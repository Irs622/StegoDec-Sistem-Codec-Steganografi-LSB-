/**
 * StegoDec — Frontend Interactivity
 * Handles file uploads, form submissions via fetch API,
 * result display, stats updates, and UI state management
 * for Image, Audio, and Video steganography & codec systems.
 */
document.addEventListener('DOMContentLoaded', function () {

    // ==========================================
    // INITIALIZE LUCIDE ICONS
    // ==========================================
    lucide.createIcons();

    // ==========================================
    // STATE
    // ==========================================
    let currentMediaTab = 'image'; // 'image', 'audio', 'video'
    let currentEncoderMode = 'stego'; // 'stego', 'codec'
    let currentDecoderMode = 'stego'; // 'stego', 'codec'

    let encoderFile = null;
    let decoderFile = null;
    let codecFile = null;
    let inspectorFile = null;
    let encoderImageCapacity = 0;

    // ==========================================
    // DOM REFERENCES
    // ==========================================

    // Stego Encoder elements
    const encoderInput = document.getElementById('encoder-file-input');
    const encoderEmpty = document.getElementById('encoder-empty');
    const encoderInfo = document.getElementById('encoder-info');
    const encoderPreviewImg = document.getElementById('encoder-preview-img');
    const encoderMediaPreviewContainer = document.getElementById('encoder-media-preview-container');
    const encoderFileName = document.getElementById('encoder-file-name');
    const encoderFileDetails = document.getElementById('encoder-file-details');
    const encoderUploadLabel = document.getElementById('encoder-upload-label');
    const encoderDragText = document.getElementById('encoder-drag-text');
    const encoderSupportedFormats = document.getElementById('encoder-supported-formats');

    const secretMessage = document.getElementById('secret-message');
    const charCount = document.getElementById('char-count');
    const encodePassword = document.getElementById('encode-password');
    const encodeBtn = document.getElementById('encode-btn');
    const encodeBtnText = document.getElementById('encode-btn-text');
    const encodeBtnIcon = document.getElementById('encode-btn-icon');
    const encodeResult = document.getElementById('encode-result');
    const downloadLink = document.getElementById('download-link');

    // Codec Compressor elements
    const codecFileInput = document.getElementById('codec-file-input');
    const codecEmpty = document.getElementById('codec-empty');
    const codecInfo = document.getElementById('codec-info');
    const codecPreviewImg = document.getElementById('codec-preview-img');
    const codecMediaPreviewContainer = document.getElementById('codec-media-preview-container');
    const codecFileName = document.getElementById('codec-file-name');
    const codecFileDetails = document.getElementById('codec-file-details');
    const codecDragText = document.getElementById('codec-drag-text');
    const codecSupportedFormats = document.getElementById('codec-supported-formats');
    const codecBtn = document.getElementById('codec-btn');
    const codecResult = document.getElementById('codec-result');
    const codecDownloadLink = document.getElementById('codec-download-link');

    // Stego Decoder elements
    const decoderInput = document.getElementById('decoder-file-input');
    const decoderEmpty = document.getElementById('decoder-empty');
    const decoderInfo = document.getElementById('decoder-info');
    const decoderPreviewImg = document.getElementById('decoder-preview-img');
    const decoderMediaPreviewContainer = document.getElementById('decoder-media-preview-container');
    const decoderFileName = document.getElementById('decoder-file-name');
    const decoderFileDetails = document.getElementById('decoder-file-details');
    const decoderUploadLabel = document.getElementById('decoder-upload-label');
    const decoderDragText = document.getElementById('decoder-drag-text');
    const decoderSupportedFormats = document.getElementById('decoder-supported-formats');

    const decodePassword = document.getElementById('decode-password');
    const decodeBtn = document.getElementById('decode-btn');
    const decodeBtnText = document.getElementById('decode-btn-text');
    const decodeResultEmpty = document.getElementById('decode-result-empty');
    const decodeResultSuccess = document.getElementById('decode-result-success');
    const decodeResultError = document.getElementById('decode-result-error');
    const extractedMessage = document.getElementById('extracted-message');
    const decodeErrorText = document.getElementById('decode-error-text');

    // Codec Inspector elements
    const inspectorFileInput = document.getElementById('inspector-file-input');
    const inspectorEmpty = document.getElementById('inspector-empty');
    const inspectorInfo = document.getElementById('inspector-info');
    const inspectorPreviewImg = document.getElementById('inspector-preview-img');
    const inspectorMediaPreviewContainer = document.getElementById('inspector-media-preview-container');
    const inspectorFileName = document.getElementById('inspector-file-name');
    const inspectorFileDetails = document.getElementById('inspector-file-details');
    const inspectorDragText = document.getElementById('inspector-drag-text');
    const inspectorSupportedFormats = document.getElementById('inspector-supported-formats');
    const inspectResultEmpty = document.getElementById('inspect-result-empty');
    const inspectResultSuccess = document.getElementById('inspect-result-success');
    const inspectDetailsTable = document.getElementById('inspect-details-table');

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
        if (uptimeEl) {
            uptimeEl.textContent =
                String(h).padStart(2, '0') + ':' +
                String(m).padStart(2, '0') + ':' +
                String(s).padStart(2, '0');
        }
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
        const payloadLength = pwd ? (12 + Math.ceil(message.length / 3) * 4) : message.length;
        const delimiterLength = 20; // ====STEGODEC_END====
        const estimatedBits = (payloadLength + delimiterLength) * 8;

        indicator.classList.remove('hidden');

        const capacityRibu = (encoderImageCapacity / 1000).toFixed(1);

        if (estimatedBits > encoderImageCapacity) {
            indicator.className = "text-[10px] font-mono text-[#e22718] uppercase mt-2 font-bold animate-pulse";
            indicator.textContent = `Kapasitas media ini: ${capacityRibu} ribu bit. Pesan Anda: ${estimatedBits} bit (Terlalu Besar)`;
        } else {
            indicator.className = "text-[10px] font-mono text-green-400 uppercase mt-2";
            indicator.textContent = `Kapasitas media ini: ${capacityRibu} ribu bit. Pesan Anda: ${estimatedBits} bit (Aman)`;
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
    // MEDIA PREVIEW GENERATOR
    // ==========================================
    function showMediaPreview(file, imgElement, containerElement) {
        imgElement.classList.add('hidden');
        containerElement.classList.add('hidden');
        containerElement.innerHTML = '';

        if (!file) return;

        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function () {
                imgElement.src = reader.result;
                imgElement.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        } else if (file.type.startsWith('audio/') || file.name.endsWith('.wav')) {
            const audio = document.createElement('audio');
            audio.controls = true;
            audio.className = 'w-full max-w-[280px] h-8 mt-2';
            audio.src = URL.createObjectURL(file);
            containerElement.appendChild(audio);
            containerElement.classList.remove('hidden');
        } else if (file.type.startsWith('video/') || file.name.endsWith('.mp4') || file.name.endsWith('.avi')) {
            const video = document.createElement('video');
            video.controls = true;
            video.muted = true;
            video.className = 'max-h-24 w-auto object-contain border border-[#3c3c3c] mt-2';
            video.src = URL.createObjectURL(file);
            containerElement.appendChild(video);
            containerElement.classList.remove('hidden');
        }
    }

    // ==========================================
    // FILE INPUT LISTENERS (ENCODER, DECODER, CODEC, INSPECTOR)
    // ==========================================

    encoderInput.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;

        encoderFile = file;

        encoderEmpty.classList.add('hidden');
        encoderInfo.classList.remove('hidden');

        encoderFileName.textContent = file.name;
        encoderFileDetails.textContent =
            currentMediaTab.toUpperCase() + ' \u2022 ' + (file.size / 1024).toFixed(1) + ' KB';

        showMediaPreview(file, encoderPreviewImg, encoderMediaPreviewContainer);

        // Hitung estimasi kapasitas
        encoderImageCapacity = 0;
        if (currentMediaTab === 'image' && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function () {
                const img = new Image();
                img.src = reader.result;
                img.onload = function () {
                    encoderImageCapacity = img.naturalWidth * img.naturalHeight * 3; // LSB RGB
                    updateCapacityIndicator();
                };
            };
            reader.readAsDataURL(file);
        } else if (currentMediaTab === 'audio' && (file.type.startsWith('audio/') || file.name.endsWith('.wav'))) {
            encoderImageCapacity = Math.max(0, file.size - 44); // Perkiraan data byte PCM
            updateCapacityIndicator();
        } else if (currentMediaTab === 'video' && (file.type.startsWith('video/') || file.name.endsWith('.mp4') || file.name.endsWith('.avi'))) {
            const video = document.createElement('video');
            video.src = URL.createObjectURL(file);
            video.addEventListener('loadedmetadata', function () {
                const fps = 24.0;
                const frames = Math.max(1, Math.round(video.duration * fps));
                encoderImageCapacity = video.videoWidth * video.videoHeight * 3 * frames;
                updateCapacityIndicator();
            });
        } else {
            updateCapacityIndicator();
        }

        encodeResult.classList.add('hidden');
        statsContent.classList.add('hidden');
        statsEmpty.classList.remove('hidden');
    });

    decoderInput.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;

        decoderFile = file;

        decoderEmpty.classList.add('hidden');
        decoderInfo.classList.remove('hidden');

        decoderFileName.textContent = file.name;
        decoderFileDetails.textContent =
            currentMediaTab.toUpperCase() + ' \u2022 ' + (file.size / 1024).toFixed(1) + ' KB';

        showMediaPreview(file, decoderPreviewImg, decoderMediaPreviewContainer);

        decodeResultSuccess.classList.add('hidden');
        decodeResultError.classList.add('hidden');
        decodeResultEmpty.classList.remove('hidden');
    });

    codecFileInput.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;

        codecFile = file;

        codecEmpty.classList.add('hidden');
        codecInfo.classList.remove('hidden');

        codecFileName.textContent = file.name;
        codecFileDetails.textContent =
            currentMediaTab.toUpperCase() + ' \u2022 ' + (file.size / 1024).toFixed(1) + ' KB';

        showMediaPreview(file, codecPreviewImg, codecMediaPreviewContainer);
        document.getElementById('codec-result').classList.add('hidden');
    });

    inspectorFileInput.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;

        inspectorFile = file;

        inspectorEmpty.classList.add('hidden');
        inspectorInfo.classList.remove('hidden');

        inspectorFileName.textContent = file.name;
        inspectorFileDetails.textContent =
            currentMediaTab.toUpperCase() + ' \u2022 ' + (file.size / 1024).toFixed(1) + ' KB';

        showMediaPreview(file, inspectorPreviewImg, inspectorMediaPreviewContainer);
        inspectMediaMetadata(file);
    });

    // ==========================================
    // METADATA INSPECTION ANALYZER
    // ==========================================
    function inspectMediaMetadata(file) {
        inspectResultEmpty.classList.add('hidden');
        inspectResultSuccess.classList.remove('hidden');

        const table = inspectDetailsTable;
        table.innerHTML = '';

        const addRow = (label, val) => {
            const row = document.createElement('div');
            row.className = "flex justify-between border-b border-[#262626] pb-1.5";
            row.innerHTML = `<span class="text-[#bbbbbb]">${label}</span><span class="text-white font-bold">${val}</span>`;
            table.appendChild(row);
        };

        addRow('FILE_NAME', file.name);
        addRow('FILE_SIZE', (file.size / (1024 * 1024)).toFixed(2) + ' MB');
        addRow('MIME_TYPE', file.type || 'unknown/binary');

        if (file.type.startsWith('image/')) {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            img.onload = function () {
                addRow('IMAGE_WIDTH', img.naturalWidth + ' px');
                addRow('IMAGE_HEIGHT', img.naturalHeight + ' px');
                addRow('ASPECT_RATIO', (img.naturalWidth / img.naturalHeight).toFixed(2));
                addRow('TOTAL_PIXELS', (img.naturalWidth * img.naturalHeight).toLocaleString() + ' px');
            };
        } else if (file.type.startsWith('audio/') || file.name.endsWith('.wav')) {
            const audio = document.createElement('audio');
            audio.src = URL.createObjectURL(file);
            audio.addEventListener('loadedmetadata', function () {
                addRow('AUDIO_DURATION', audio.duration.toFixed(2) + ' sec');
                addRow('CHANNELS', 'Stereo / Mono (Dynamic)');
            });
        } else if (file.type.startsWith('video/') || file.name.endsWith('.mp4') || file.name.endsWith('.avi')) {
            const video = document.createElement('video');
            video.src = URL.createObjectURL(file);
            video.addEventListener('loadedmetadata', function () {
                addRow('VIDEO_WIDTH', video.videoWidth + ' px');
                addRow('VIDEO_HEIGHT', video.videoHeight + ' px');
                addRow('VIDEO_DURATION', video.duration.toFixed(2) + ' sec');
            });
        }
    }

    // ==========================================
    // ENCODER SUBMIT (STEGO ENCODE / HIDE)
    // ==========================================
    encodeBtn.addEventListener('click', async function () {
        if (!encoderFile) {
            alert('Harap unggah file cover terlebih dahulu.');
            return;
        }

        const message = secretMessage.value.trim();
        if (!message) {
            alert('Harap ketik pesan rahasia yang ingin disembunyikan.');
            return;
        }

        const password = encodePassword.value;

        const formData = new FormData();
        formData.append('file', encoderFile);
        formData.append('message', message);
        if (password) formData.append('password', password);

        encodeBtn.disabled = true;
        encodeBtnIcon.classList.add('hidden');
        encodeBtnText.textContent = 'MEMPROSES PENYISIPAN...';

        let endpoint = '/encode';
        if (currentMediaTab === 'audio') endpoint = '/encode/audio';
        else if (currentMediaTab === 'video') endpoint = '/encode/video';

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                downloadLink.href = data.download_url;
                downloadLink.setAttribute('download', data.filename);
                encodeResult.classList.remove('hidden');
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
    // DECODER SUBMIT (STEGO DECODE / EXTRACT)
    // ==========================================
    decodeBtn.addEventListener('click', async function () {
        if (!decoderFile) {
            alert('Harap unggah file stego terlebih dahulu.');
            return;
        }

        const password = decodePassword.value;

        const formData = new FormData();
        formData.append('file', decoderFile);
        if (password) formData.append('password', password);

        decodeBtn.disabled = true;
        decodeBtnText.textContent = 'MENGEKSTRAK...';

        let endpoint = '/decode';
        if (currentMediaTab === 'audio') endpoint = '/decode/audio';
        else if (currentMediaTab === 'video') endpoint = '/decode/video';

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            decodeResultEmpty.classList.add('hidden');

            if (data.success) {
                decodeResultError.classList.add('hidden');
                decodeResultSuccess.classList.remove('hidden');
                extractedMessage.textContent = data.message;

                if (data.compressed_size !== undefined) {
                    var dc = document.getElementById('decode-compressed');
                    var dd = document.getElementById('decode-decompressed');
                    var de = document.getElementById('decode-encrypted');
                    if (dc) dc.textContent = data.compressed_size + ' bytes';
                    if (dd) dd.textContent = data.decompressed_size + ' bytes';
                    if (de) de.textContent = data.is_encrypted ? 'YA' : 'TIDAK';
                }
            } else {
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
    // CODEC SUBMIT (COMPRESS MEDIA)
    // ==========================================
    codecBtn.addEventListener('click', async function () {
        if (!codecFile) {
            alert('Harap unggah file media yang ingin dikompresi.');
            return;
        }

        const formData = new FormData();
        formData.append('file', codecFile);

        let endpoint = '/codec/compress/image';
        if (currentMediaTab === 'image') {
            formData.append('format', document.getElementById('codec-img-format').value);
            formData.append('quality', document.getElementById('codec-img-quality').value);
            endpoint = '/codec/compress/image';
        } else if (currentMediaTab === 'audio') {
            formData.append('rate_factor', document.getElementById('codec-aud-rate').value);
            formData.append('bit_depth', document.getElementById('codec-aud-depth').value);
            endpoint = '/codec/compress/audio';
        } else if (currentMediaTab === 'video') {
            formData.append('scale', document.getElementById('codec-vid-scale').value);
            formData.append('fps', document.getElementById('codec-vid-fps').value);
            endpoint = '/codec/compress/video';
        }

        codecBtn.disabled = true;
        codecBtn.textContent = 'MEMPROSES KOMPRESI...';

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                codecDownloadLink.href = data.download_url;
                codecDownloadLink.setAttribute('download', data.filename);
                document.getElementById('codec-result').classList.remove('hidden');
                updateCodecStats(data);
            } else {
                alert('Error: ' + data.error);
            }
        } catch (err) {
            alert('Terjadi kesalahan koneksi: ' + err.message);
        } finally {
            codecBtn.disabled = false;
            codecBtn.textContent = 'START COMPRESS CODEC';
        }
    });

    // ==========================================
    // STATS UPDATING LOGIC
    // ==========================================
    function updateStats(data) {
        statsEmpty.classList.add('hidden');
        statsContent.classList.remove('hidden');
        statsContent.classList.add('fade-in');

        document.getElementById('stat-original').textContent = formatBytes(data.original_size);
        document.getElementById('stat-compressed').textContent = formatBytes(data.compressed_size);
        document.getElementById('stat-ratio').textContent = data.compression_ratio + '%';
        
        const bitsEl = document.getElementById('stat-bits');
        const capEl = document.getElementById('stat-capacity');
        const usageEl = document.getElementById('stat-usage');

        if (data.bits_embedded !== undefined) {
            bitsEl.textContent = Number(data.bits_embedded).toLocaleString() + ' bits';
        }
        if (data.image_capacity !== undefined) {
            capEl.textContent = Number(data.image_capacity).toLocaleString() + ' bits';
        } else if (data.audio_capacity !== undefined) {
            capEl.textContent = Number(data.audio_capacity).toLocaleString() + ' bits';
        } else if (data.video_capacity !== undefined) {
            capEl.textContent = Number(data.video_capacity).toLocaleString() + ' bits';
        }
        
        if (data.capacity_used !== undefined) {
            usageEl.textContent = data.capacity_used + '%';
            var bar = document.getElementById('capacity-progress');
            if (bar) {
                bar.style.width = Math.min(data.capacity_used, 100) + '%';
            }
        }
    }

    function updateCodecStats(data) {
        statsEmpty.classList.add('hidden');
        statsContent.classList.remove('hidden');
        statsContent.classList.add('fade-in');

        document.getElementById('stat-original').textContent = formatBytes(data.original_size);
        document.getElementById('stat-compressed').textContent = formatBytes(data.compressed_size);
        document.getElementById('stat-ratio').textContent = data.compression_ratio + '%';
        
        const bitsEl = document.getElementById('stat-bits');
        const capEl = document.getElementById('stat-capacity');
        const usageEl = document.getElementById('stat-usage');
        const bar = document.getElementById('capacity-progress');

        if (currentMediaTab === 'image') {
            bitsEl.textContent = `Quality: ${data.quality_setting}%`;
            capEl.textContent = `Format: ${data.format_type}`;
            usageEl.textContent = 'N/A';
            if (bar) bar.style.width = '100%';
        } else if (currentMediaTab === 'audio') {
            bitsEl.textContent = `Bit Depth: ${data.new_bitdepth}-bit`;
            capEl.textContent = `Freq: ${data.new_samplerate} Hz`;
            usageEl.textContent = 'N/A';
            if (bar) bar.style.width = '100%';
        } else if (currentMediaTab === 'video') {
            bitsEl.textContent = `FPS: ${data.new_fps}`;
            capEl.textContent = `Res: ${data.new_resolution}`;
            usageEl.textContent = 'N/A';
            if (bar) bar.style.width = '100%';
        }
    }

    function formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // ==========================================
    // WINDOW GLOBAL INTERFACE FOR TABS & SWITCHING
    // ==========================================
    window.switchMediaTab = function (tab) {
        currentMediaTab = tab;
        
        const tabs = ['image', 'audio', 'video'];
        tabs.forEach(t => {
            const btn = document.getElementById(`tab-${t}-btn`);
            if (t === tab) {
                btn.className = "flex-1 min-w-[120px] py-3 text-xs font-mono font-bold tracking-[2px] uppercase rounded-none transition-all flex items-center justify-center gap-2 cursor-pointer bg-white text-black border-none";
            } else {
                btn.className = "flex-1 min-w-[120px] py-3 text-xs font-mono font-bold tracking-[2px] uppercase rounded-none transition-all flex items-center justify-center gap-2 cursor-pointer bg-[#000000] text-[#bbbbbb] hover:text-white border border-transparent hover:border-[#3c3c3c]";
            }
        });
        
        const moduleIds = {
            image: ['IMAGE_HUB_ENCODER', 'IMAGE_HUB_DECODER'],
            audio: ['AUDIO_HUB_ENCODER', 'AUDIO_HUB_DECODER'],
            video: ['VIDEO_HUB_ENCODER', 'VIDEO_HUB_DECODER']
        };
        document.getElementById('encoder-module-id').textContent = `[ ${moduleIds[tab][0]} ]`;
        document.getElementById('decoder-module-id').textContent = `[ ${moduleIds[tab][1]} ]`;
        
        encoderFile = null;
        decoderFile = null;
        codecFile = null;
        inspectorFile = null;
        encoderImageCapacity = 0;
        
        updateFileInputsForTab(tab);
        
        document.getElementById('settings-image').classList.add('hidden');
        document.getElementById('settings-audio').classList.add('hidden');
        document.getElementById('settings-video').classList.add('hidden');
        document.getElementById(`settings-${tab}`).classList.remove('hidden');
        
        resetAllPanelStates();
        lucide.createIcons();
    };

    function updateFileInputsForTab(tab) {
        const acceptTypes = {
            image: { accept: 'image/png', label: '01. UNGGAH COVER CONTAINER (GAMBAR PNG)', drag: 'DRAG & DROP COVER IMAGE (MAX 16MB)', supported: 'SUPPORTED: PNG (UNTUK LSB LOSSLESS)' },
            audio: { accept: '.wav', label: '01. UNGGAH COVER CONTAINER (AUDIO WAV)', drag: 'DRAG & DROP COVER AUDIO (MAX 16MB)', supported: 'SUPPORTED: WAV (PCM 8/16-BIT)' },
            video: { accept: '.avi,.mp4', label: '01. UNGGAH COVER CONTAINER (VIDEO AVI/MP4)', drag: 'DRAG & DROP COVER VIDEO (MAX 16MB)', supported: 'SUPPORTED: AVI (LOSSLESS FFV1) / MP4' }
        };
        const decoderTypes = {
            image: { accept: 'image/png', label: '01. UNGGAH FILE STEGO (GAMBAR PNG)', drag: 'UPLOAD IMAGE STEGO HERE', supported: 'MASUKKAN FILE GAMBAR PNG HASIL SISIPAN' },
            audio: { accept: '.wav', label: '01. UNGGAH FILE STEGO (AUDIO WAV)', drag: 'UPLOAD AUDIO STEGO HERE', supported: 'MASUKKAN FILE AUDIO WAV HASIL SISIPAN' },
            video: { accept: '.avi', label: '01. UNGGAH FILE STEGO (VIDEO AVI)', drag: 'UPLOAD VIDEO STEGO HERE', supported: 'MASUKKAN FILE VIDEO AVI HASIL SISIPAN' }
        };
        const codecTypes = {
            image: { accept: 'image/*', drag: 'DRAG & DROP IMAGE FILE (MAX 16MB)', supported: 'SUPPORTED: PNG, JPG, JPEG, WEBP' },
            audio: { accept: '.wav', drag: 'DRAG & DROP AUDIO FILE (MAX 16MB)', supported: 'SUPPORTED: WAV (PCM 8/16-BIT)' },
            video: { accept: '.mp4,.avi,.mkv', drag: 'DRAG & DROP VIDEO FILE (MAX 16MB)', supported: 'SUPPORTED: MP4, AVI, MKV' }
        };
        
        encoderInput.setAttribute('accept', acceptTypes[tab].accept);
        encoderUploadLabel.textContent = acceptTypes[tab].label;
        encoderDragText.textContent = acceptTypes[tab].drag;
        encoderSupportedFormats.textContent = acceptTypes[tab].supported;
        
        decoderInput.setAttribute('accept', decoderTypes[tab].accept);
        decoderUploadLabel.textContent = decoderTypes[tab].label;
        decoderDragText.textContent = decoderTypes[tab].drag;
        decoderSupportedFormats.textContent = decoderTypes[tab].supported;

        codecFileInput.setAttribute('accept', codecTypes[tab].accept);
        codecDragText.textContent = codecTypes[tab].drag;
        codecSupportedFormats.textContent = codecTypes[tab].supported;

        inspectorFileInput.setAttribute('accept', codecTypes[tab].accept);
        inspectorDragText.textContent = codecTypes[tab].drag;
        inspectorSupportedFormats.textContent = codecTypes[tab].supported;
    }

    function resetAllPanelStates() {
        encoderEmpty.classList.remove('hidden');
        encoderInfo.classList.add('hidden');
        encoderPreviewImg.src = '';
        encoderPreviewImg.classList.add('hidden');
        encoderMediaPreviewContainer.innerHTML = '';
        encoderMediaPreviewContainer.classList.add('hidden');
        secretMessage.value = '';
        charCount.textContent = '0 CHR';
        encodePassword.value = '';
        capacityIndicator.classList.add('hidden');
        encodeResult.classList.add('hidden');

        decoderEmpty.classList.remove('hidden');
        decoderInfo.classList.add('hidden');
        decoderPreviewImg.src = '';
        decoderPreviewImg.classList.add('hidden');
        decoderMediaPreviewContainer.innerHTML = '';
        decoderMediaPreviewContainer.classList.add('hidden');
        decodePassword.value = '';
        decodeResultSuccess.classList.add('hidden');
        decodeResultError.classList.add('hidden');
        decodeResultEmpty.classList.remove('hidden');

        codecEmpty.classList.remove('hidden');
        codecInfo.classList.add('hidden');
        codecPreviewImg.src = '';
        codecPreviewImg.classList.add('hidden');
        codecMediaPreviewContainer.innerHTML = '';
        codecMediaPreviewContainer.classList.add('hidden');
        codecResult.classList.add('hidden');

        inspectorEmpty.classList.remove('hidden');
        inspectorInfo.classList.add('hidden');
        inspectorPreviewImg.src = '';
        inspectorPreviewImg.classList.add('hidden');
        inspectorMediaPreviewContainer.innerHTML = '';
        inspectorMediaPreviewContainer.classList.add('hidden');
        inspectResultSuccess.classList.add('hidden');
        inspectResultEmpty.classList.remove('hidden');
        inspectDetailsTable.innerHTML = '';

        statsContent.classList.add('hidden');
        statsEmpty.classList.remove('hidden');
    }

    window.switchEncoderMode = function (mode) {
        currentEncoderMode = mode;
        const stegoBtn = document.getElementById('encoder-mode-stego');
        const codecBtn = document.getElementById('encoder-mode-codec');
        const stegoPanel = document.getElementById('encoder-stego-panel');
        const codecPanel = document.getElementById('encoder-codec-panel');
        const encodeBtn = document.getElementById('encode-btn');
        const compressBtn = document.getElementById('codec-btn');
        const banner = document.getElementById('encoder-banner-color');

        if (mode === 'stego') {
            stegoBtn.className = "flex-1 pb-2 text-center text-[#e22718] border-b-2 border-[#e22718] tracking-widest uppercase transition-all";
            codecBtn.className = "flex-1 pb-2 text-center text-slate-500 hover:text-white border-b-2 border-transparent tracking-widest uppercase transition-all";
            stegoPanel.classList.remove('hidden');
            codecPanel.classList.add('hidden');
            encodeBtn.classList.remove('hidden');
            compressBtn.classList.add('hidden');
            banner.className = "absolute top-0 right-0 w-16 h-[2px] bg-[#e22718]";
            
            if (!document.getElementById('encode-result').classList.contains('hidden')) {
                document.getElementById('encode-result').classList.remove('hidden');
            }
            document.getElementById('codec-result').classList.add('hidden');
        } else {
            stegoBtn.className = "flex-1 pb-2 text-center text-slate-500 hover:text-white border-b-2 border-transparent tracking-widest uppercase transition-all";
            codecBtn.className = "flex-1 pb-2 text-center text-[#0066b1] border-b-2 border-[#0066b1] tracking-widest uppercase transition-all";
            stegoPanel.classList.add('hidden');
            codecPanel.classList.remove('hidden');
            encodeBtn.classList.add('hidden');
            compressBtn.classList.remove('hidden');
            banner.className = "absolute top-0 right-0 w-16 h-[2px] bg-[#0066b1]";
            
            document.getElementById('encode-result').classList.add('hidden');
            if (!document.getElementById('codec-result').classList.contains('hidden')) {
                document.getElementById('codec-result').classList.remove('hidden');
            }
        }
    };

    window.switchDecoderMode = function (mode) {
        currentDecoderMode = mode;
        const stegoBtn = document.getElementById('decoder-mode-stego');
        const codecBtn = document.getElementById('decoder-mode-codec');
        const stegoPanel = document.getElementById('decoder-stego-panel');
        const codecPanel = document.getElementById('decoder-codec-panel');
        const banner = document.getElementById('decoder-banner-color');

        if (mode === 'stego') {
            stegoBtn.className = "flex-1 pb-2 text-center text-[#60a5fa] border-b-2 border-[#60a5fa] tracking-widest uppercase transition-all";
            codecBtn.className = "flex-1 pb-2 text-center text-slate-500 hover:text-white border-b-2 border-transparent tracking-widest uppercase transition-all";
            stegoPanel.classList.remove('hidden');
            codecPanel.classList.add('hidden');
            banner.className = "absolute top-0 right-0 w-16 h-[2px] bg-[#1c69d4]";
        } else {
            stegoBtn.className = "flex-1 pb-2 text-center text-slate-500 hover:text-white border-b-2 border-transparent tracking-widest uppercase transition-all";
            codecBtn.className = "flex-1 pb-2 text-center text-blue-400 border-b-2 border-blue-400 tracking-widest uppercase transition-all";
            stegoPanel.classList.add('hidden');
            codecPanel.classList.remove('hidden');
            banner.className = "absolute top-0 right-0 w-16 h-[2px] bg-[#60a5fa]";
        }
    };

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

/**
 * StegoDec — Cryptography Demo Logic
 */
document.addEventListener('DOMContentLoaded', function () {

    // DOM Elements
    const encryptMessage = document.getElementById('encrypt-message');
    const encryptPassword = document.getElementById('encrypt-password');
    const encryptBtn = document.getElementById('encrypt-btn');
    const encryptedResult = document.getElementById('encrypted-result');
    const copyEncryptedBtn = document.getElementById('copy-encrypted-btn');

    const decryptCiphertext = document.getElementById('decrypt-ciphertext');
    const decryptPassword = document.getElementById('decrypt-password');
    const decryptBtn = document.getElementById('decrypt-btn');
    const decryptedResult = document.getElementById('decrypted-result');

    // Stats Elements
    const cryptoSalt = document.getElementById('crypto-salt');
    const cryptoStretched = document.getElementById('crypto-stretched');
    const cryptoChecksum = document.getElementById('crypto-checksum');

    // Helper: Calculate checksum like Python Vigenere-XOR backend
    function calculateChecksum(password, salt) {
        const stretched = password + salt;
        let sum = 0;
        for (let i = 0; i < stretched.length; i++) {
            sum += stretched.charCodeAt(i) * (i + 1);
        }
        return sum;
    }

    // ==========================================
    // ENCRYPT HANDLER
    // ==========================================
    encryptBtn.addEventListener('click', async function () {
        const message = encryptMessage.value.trim();
        const password = encryptPassword.value;

        if (!message) {
            alert('Masukkan Plaintext terlebih dahulu.');
            return;
        }

        encryptBtn.disabled = true;
        encryptBtn.textContent = 'MEMPROSES...';

        try {
            const formData = new FormData();
            formData.append('message', message);
            if (password) formData.append('password', password);

            const response = await fetch('/demo/crypto/encrypt', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                encryptedResult.textContent = data.encrypted;
                encryptedResult.classList.remove('text-red-500');
                encryptedResult.classList.add('text-amber-500');
                copyEncryptedBtn.classList.remove('hidden');

                // Extract metadata if secured
                if (data.encrypted.startsWith('SECURE_')) {
                    const parts = data.encrypted.split('_');
                    const salt = parts[1];
                    cryptoSalt.textContent = salt;
                    cryptoStretched.textContent = password + ' + ' + salt;
                    cryptoChecksum.textContent = calculateChecksum(password, salt);
                } else {
                    cryptoSalt.textContent = 'TIDAK ADA (Tanpa Password)';
                    cryptoStretched.textContent = 'TIDAK ADA';
                    cryptoChecksum.textContent = 'TIDAK ADA';
                }
            } else {
                encryptedResult.textContent = 'Error: ' + data.error;
                encryptedResult.classList.add('text-red-500');
                copyEncryptedBtn.classList.add('hidden');
            }
        } catch (err) {
            encryptedResult.textContent = 'Koneksi gagal: ' + err.message;
            encryptedResult.classList.add('text-red-500');
        } finally {
            encryptBtn.disabled = false;
            encryptBtn.textContent = 'PROSES ENKRIPSI';
        }
    });

    // ==========================================
    // DECRYPT HANDLER
    // ==========================================
    decryptBtn.addEventListener('click', async function () {
        const ciphertext = decryptCiphertext.value.trim();
        const password = decryptPassword.value;

        if (!ciphertext) {
            alert('Masukkan Ciphertext terlebih dahulu.');
            return;
        }

        decryptBtn.disabled = true;
        decryptBtn.textContent = 'MEMPROSES...';

        try {
            const formData = new FormData();
            formData.append('encrypted', ciphertext);
            if (password) formData.append('password', password);

            const response = await fetch('/demo/crypto/decrypt', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                decryptedResult.textContent = data.decrypted;
                decryptedResult.classList.remove('text-red-500');
                decryptedResult.classList.add('text-green-400');
            } else {
                decryptedResult.textContent = data.error;
                decryptedResult.classList.remove('text-green-400');
                decryptedResult.classList.add('text-red-500');
            }
        } catch (err) {
            decryptedResult.textContent = 'Koneksi gagal: ' + err.message;
            decryptedResult.classList.add('text-red-500');
        } finally {
            decryptBtn.disabled = false;
            decryptBtn.textContent = 'PROSES DEKRIPSI';
        }
    });

    // ==========================================
    // COPY BUTTON
    // ==========================================
    copyEncryptedBtn.addEventListener('click', function () {
        navigator.clipboard.writeText(encryptedResult.textContent).then(function () {
            const icon = copyEncryptedBtn.querySelector('i');
            if (icon) {
                icon.setAttribute('data-lucide', 'check');
                copyEncryptedBtn.classList.add('bg-green-600');
                lucide.createIcons();
                setTimeout(function () {
                    icon.setAttribute('data-lucide', 'copy');
                    copyEncryptedBtn.classList.remove('bg-green-600');
                    lucide.createIcons();
                }, 2000);
            }
        });
    });

});

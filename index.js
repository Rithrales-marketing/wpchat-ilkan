const express = require('express');
const crypto = require('crypto');
const app = express();
app.use(express.json());

const PRIVATE_KEY = process.env.PRIVATE_KEY;

app.post('/webhook', (req, res) => {
  console.log('Gelen istek:', JSON.stringify(req.body, null, 2));

  try {
    const { encrypted_aes_key, encrypted_flow_data, initial_vector } = req.body;

    // AES key'i çöz
    const decryptedAesKey = crypto.privateDecrypt(
      {
        key: PRIVATE_KEY,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      Buffer.from(encrypted_aes_key, 'base64')
    );

    // Flow verisini çöz
    const iv = Buffer.from(initial_vector, 'base64');
    const encryptedData = Buffer.from(encrypted_flow_data, 'base64');
    const TAG_LENGTH = 16;
    const encryptedBody = encryptedData.subarray(0, -TAG_LENGTH);
    const authTag = encryptedData.subarray(-TAG_LENGTH);

    const decipher = crypto.createDecipheriv('aes-128-gcm', decryptedAesKey, iv);
    decipher.setAuthTag(authTag);
    const decryptedBody = JSON.parse(decipher.update(encryptedBody) + decipher.final('utf-8'));

    console.log('Çözülen veri:', JSON.stringify(decryptedBody, null, 2));

    const screen = decryptedBody.screen;
    const data = decryptedBody.data || {};
    const mr_cevap = data.mr_cevap;

    let response;
    if (screen === 'SORU_BIR') {
      if (mr_cevap === 'hayir') {
        console.log('Hayır → UYARI_EKRANI');
        response = { screen: 'UYARI_EKRANI', data: {} };
      } else {
        console.log('Evet → AGRI_SORUSU');
        response = { screen: 'AGRI_SORUSU', data: {} };
      }
    } else {
      response = { screen: 'AGRI_SORUSU', data: {} };
    }

    // Cevabı şifrele
    const responseIv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-128-gcm', decryptedAesKey, responseIv);
    const encryptedResponse = Buffer.concat([
      cipher.update(JSON.stringify(response), 'utf-8'),
      cipher.final(),
      cipher.getAuthTag()
    ]);

    return res.json({
      encrypted_flow_data: encryptedResponse.toString('base64'),
      initial_vector: responseIv.toString('base64')
    });

  } catch (err) {
    console.error('Hata:', err);
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Sunucu ${PORT} portunda çalışıyor`));
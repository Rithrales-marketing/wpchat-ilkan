const express = require('express');
const app = express();
app.use(express.json());

app.post('/webhook', (req, res) => {
  console.log('Gelen istek:', JSON.stringify(req.body, null, 2));

  const screen = req.body.screen;
  const data = req.body.data || {};
  const mr_cevap = data.mr_cevap;

  if (screen === 'SORU_BIR') {
    if (mr_cevap === 'hayir') {
      console.log('Hayır seçildi → UYARI_EKRANI');
      return res.json({
        screen: 'UYARI_EKRANI',
        data: {}
      });
    } else {
      console.log('Evet seçildi → AGRI_SORUSU');
      return res.json({
        screen: 'AGRI_SORUSU',
        data: {}
      });
    }
  }

  return res.json({
    screen: 'AGRI_SORUSU',
    data: {}
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Sunucu ${PORT} portunda çalışıyor`));
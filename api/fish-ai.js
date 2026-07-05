export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      answer: '這個 API 只接受 POST 請求。'
    });
  }

  return res.status(200).json({
    answer: '後端測試成功！前端已經成功連到 Vercel API。'
  });
}

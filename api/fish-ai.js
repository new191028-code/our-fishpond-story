export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ answer: '這個 API 只接受 POST 請求。' });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.Gemini_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      answer: '後端找不到 Gemini API Key，請確認 Vercel 的 Environment Variables 是否有設定 Gemini_API_KEY 或 GEMINI_API_KEY。'
    });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};

  const question = body.question || '';
  const currentTitle = body.currentTitle || '目前還在探索頁';
  const currentArticleText = body.currentArticleText || '';

  const prompt = `
你是「魚塭 AI 小助手」，要用繁體中文回答小學生也能懂的內容。

目前章節：
${currentTitle}

目前文章內容：
${currentArticleText.slice(0, 9000)}

學生問題：
${question}

回答規則：
1. 請根據文章內容回答。
2. 語氣親切、簡單、清楚。
3. 如果學生問「重點」，請整理成 3 到 5 點。
4. 如果學生問「出題」，請出 3 題問答題，並附答案。
5. 不要亂編文章沒有的資料。
`;

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }]
            }
          ]
        })
      }
    );

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      return res.status(500).json({
        answer: 'Gemini API 回傳錯誤，請檢查 API Key 是否正確，或模型名稱是否可用。'
      });
    }

    const answer =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      '我目前沒有產生答案，請再問一次。';

    return res.status(200).json({ answer });
  } catch (error) {
    return res.status(500).json({
      answer: 'AI 小助手後端發生錯誤，請稍後再試。'
    });
  }
}

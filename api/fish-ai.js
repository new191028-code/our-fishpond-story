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

  const apiKey = process.env.GEMINI_API_KEY || process.env.Gemini_API_KEY;

  if (!apiKey) {
    return res.status(200).json({
      answer: '後端有連到，但找不到 Gemini API Key。請確認 Vercel Environment Variables 裡有 Gemini_API_KEY 或 GEMINI_API_KEY。'
    });
  }

  let body = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  } catch (error) {
    return res.status(200).json({
      answer: '後端有連到，但前端送來的資料格式不是正確 JSON。'
    });
  }

  const question = body.question || '你是誰';
  const currentTitle = body.currentTitle || '目前還在探索頁';
  const currentArticleText = body.currentArticleText || '';

  const prompt = `
你是「魚塭 AI 小助手」，請用繁體中文回答，對象是國小學生。

目前章節：
${currentTitle}

目前文章內容：
${currentArticleText.slice(0, 4000)}

學生問題：
${question}

回答規則：
1. 回答要簡單、親切、清楚。
2. 如果學生問重點，整理成 3 到 5 點。
3. 如果學生問出題，請出 3 題問答題並附答案。
4. 不要亂編文章沒有的資料。
`;

  try {
    const model = 'gemini-2.5-flash';

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
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
      return res.status(200).json({
        answer:
          '後端有成功連到 Gemini，但 Gemini 回傳錯誤：\n\n' +
          '模型：' + model + '\n\n' +
          '狀態碼：' + geminiRes.status + '\n\n' +
          '錯誤訊息：' + (data?.error?.message || JSON.stringify(data))
      });
    }

    const answer =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      'Gemini 有回應，但沒有產生文字答案。';

    return res.status(200).json({ answer });
  } catch (error) {
    return res.status(200).json({
      answer:
        '後端執行時發生錯誤：\n\n' +
        String(error?.message || error)
    });
  }
}

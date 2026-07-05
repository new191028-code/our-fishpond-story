export default async function handler(req, res) {
  // 允許前端網頁呼叫這個 API
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 瀏覽器會先送 OPTIONS 試探請求，這是正常的
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 這個 API 只接受 POST
  // 所以直接用網址列打開 /api/fish-ai 會看到這句，這是正常的
  if (req.method !== 'POST') {
    return res.status(405).json({
      answer: '這個 API 只接受 POST 請求。'
    });
  }

  // 從 Vercel Environment Variables 讀取 Gemini API Key
  // 支援兩種名稱，避免大小寫不一致讀不到
  const apiKey = process.env.GEMINI_API_KEY || process.env.Gemini_API_KEY;

  if (!apiKey) {
    return res.status(200).json({
      answer:
        '後端有連到，但找不到 Gemini API Key。\n\n' +
        '請到 Vercel → Environment Variables 確認有設定 GEMINI_API_KEY 或 Gemini_API_KEY。'
    });
  }

  // 讀取前端送來的資料
  let body = {};

  try {
    body = typeof req.body === 'string'
      ? JSON.parse(req.body)
      : req.body || {};
  } catch (error) {
    return res.status(200).json({
      answer: '後端有連到，但前端送來的資料格式不是正確 JSON。'
    });
  }

  const question = body.question || '你是誰';
  const currentArticleId = body.currentArticleId || null;
  const currentTitle = body.currentTitle || '目前還在探索頁';
  const currentArticleText = body.currentArticleText || '';

  // 控制文章長度，避免吃掉太多 token
  const articleText = String(currentArticleText).slice(0, 4000);

  // 給 Gemini 的完整指令
  const prompt = `
你是「魚塭 AI 小助手」，是這個教學網頁裡的 AI 助教。

你的任務：
你要幫國小學生理解「我們的漁塭發生了什麼事」這個網頁內容。

目前章節 ID：
${currentArticleId || '無'}

目前章節標題：
${currentTitle}

目前章節文章內容：
${articleText || '目前使用者還沒有進入文章章節。'}

學生的問題：
${question}

回答規則：
1. 請使用繁體中文回答。
2. 語氣要親切、簡單、像在跟小學生說明。
3. 如果問題跟文章有關，請優先根據文章內容回答。
4. 如果學生問「這章重點」，請整理成 3 到 5 點。
5. 如果學生問「更簡單說明」，請用更白話的方式解釋。
6. 如果學生問「出題」，請出 3 題問答題，並附答案。
7. 如果問題不在文章內容裡，可以用一般知識簡單回答，但要提醒：「這不是本文直接提到的內容」。
8. 不要編造不存在的文章資料。
9. 回答不要太長，除非學生要求詳細說明。
`;

  // 這裡設定可用模型
  // 會先試 gemini-2.5-flash，失敗再試 gemini-2.5-flash-lite
  const models = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite'
  ];

  const errorMessages = [];

  for (const model of models) {
    try {
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
                parts: [
                  {
                    text: prompt
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.6,
              topP: 0.9,
              maxOutputTokens: 800
            }
          })
        }
      );

      const data = await geminiRes.json();

      if (!geminiRes.ok) {
        const errorText =
          data?.error?.message ||
          JSON.stringify(data);

        errorMessages.push(
          `模型：${model}\n狀態碼：${geminiRes.status}\n錯誤訊息：${errorText}`
        );

        // 如果是模型暫時忙碌或額度問題，就試下一個模型
        continue;
      }

      const answer =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        'Gemini 有回應，但沒有產生文字答案。';

      return res.status(200).json({
        answer
      });
    } catch (error) {
      errorMessages.push(
        `模型：${model}\n後端執行錯誤：${String(error?.message || error)}`
      );

      continue;
    }
  }

  // 如果所有模型都失敗，顯示完整錯誤，方便除錯
  return res.status(200).json({
    answer:
      '後端有成功啟動，但 Gemini 目前無法正常回應。\n\n' +
      '可能原因：\n' +
      '1. Gemini 模型目前太多人使用。\n' +
      '2. API Key 的免費額度用完。\n' +
      '3. 目前模型暫時不可用。\n\n' +
      '詳細錯誤：\n\n' +
      errorMessages.join('\n\n---\n\n')
  });
}

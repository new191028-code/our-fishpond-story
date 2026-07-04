export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      answer: "這個 AI 小助手只接受 POST 請求。"
    });
  }

  try {
    const {
      question,
      currentTitle,
      currentArticleText
    } = req.body;

    if (!question || !question.trim()) {
      return res.status(200).json({
        answer: "請先輸入你的問題。"
      });
    }

    const prompt = `
你是「魚塭 AI 小助手」，服務對象是國小學生。
請用繁體中文回答，語氣親切、簡單、清楚。
回答不要太長，盡量控制在 150 字以內。

目前章節：
${currentTitle || "魚塭主題"}

目前文章內容：
${currentArticleText || "沒有提供文章內容"}

學生的問題：
${question}

請優先根據文章內容回答。
如果文章沒有提到，可以用簡單方式補充，但不要亂編資料。
`;

    const geminiRes = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ]
        })
      }
    );

    const geminiData = await geminiRes.json();

    const answer =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "AI 小助手暫時沒有產生回答，請再問一次。";

    return res.status(200).json({
      answer
    });

  } catch (error) {
    return res.status(500).json({
      answer: "AI 小助手暫時連不上，請稍後再試。"
    });
  }
}

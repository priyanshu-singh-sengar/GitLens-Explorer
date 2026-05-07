const axios = require("axios");

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// -------------------------
// TIMEOUT WRAPPER
// -------------------------
function withTimeout(promise, ms) {
  let timer;

  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error("AI request timed out"));
      }, ms);
    })
  ]).finally(() => clearTimeout(timer)); // THIS LINE FIXES JEST HANG
}

// -------------------------
// GEMINI CALL
// -------------------------
async function callGemini(prompt) {
  const API_KEY = process.env.GEMINI_API_KEY;

  console.log("📡 Sending request to Gemini...");
  console.log("🔑 GEMINI API KEY:", API_KEY ? "FOUND" : "MISSING");

  if (!API_KEY) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  try {
    const response = await axios.post(
      `${GEMINI_URL}?key=${API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }]
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 60000 // 60 seconds
      }
    );

    console.log("✅ Gemini responded");
    const data = response.data;
    
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("No text returned from Gemini");

    return text;
  } catch (err) {
    console.error("❌ Gemini API ERROR:", err.response?.data?.error?.message || err.message);
    throw err;
  }
}

// -------------------------
// DEEPSEEK FALLBACK CALL
// -------------------------
async function callDeepSeek(prompt) {
  const API_KEY = process.env.DEEPSEEK_API_KEY;

  console.log("📡 Sending request to DeepSeek (OpenRouter)...");
  console.log("🔑 DEEPSEEK API KEY:", API_KEY ? "FOUND" : "MISSING");

  if (!API_KEY) {
    throw new Error("Missing DEEPSEEK_API_KEY");
  }

  try {
    const response = await axios.post(
      OPENROUTER_URL,
      {
        model: "deepseek/deepseek-chat",
        messages: [{ role: "user", content: prompt }]
      },
      {
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 60000 // 60 seconds
      }
    );

    console.log("✅ DeepSeek responded");
    const data = response.data;

    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error("No text returned from DeepSeek");

    return text;
  } catch (err) {
    console.error("❌ DeepSeek API ERROR:", err.response?.data || err.message);
    throw err;
  }
}

// -------------------------
// AI ORCHESTRATOR
// -------------------------
async function callAI(prompt) {
  const MAX_RETRIES = 2;
  let lastErr = null;

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      return await callGemini(prompt);
    } catch (err) {
      lastErr = err;
      console.log(`⚠️ Gemini attempt ${i + 1} failed: ${err.message}. Trying DeepSeek...`);
      
      try {
        return await callDeepSeek(prompt);
      } catch (dsErr) {
        lastErr = dsErr;
        console.log(`⚠️ DeepSeek attempt ${i + 1} failed: ${dsErr.message}`);
      }
    }
    
    if (i < MAX_RETRIES - 1) {
      console.log(`⏳ Waiting 2 seconds before retry...`);
      await new Promise(res => setTimeout(res, 2000));
    }
  }

  throw new Error(`All AI models failed. Last error: ${lastErr?.message}`);
}

// -------------------------
// SUMMARIZE REPO
// -------------------------
async function summarizeRepo(repoName, files) {

  console.log("🚀 summarizeRepo called");
  const limitedFiles = files.slice(0, 10);

  const prompt = `Repository: ${repoName}

Important files:
${limitedFiles.map(f => f.name).join("\n")}

Explain:
1. What this repository does
2. Where to start reading
3. Main architecture`;

  console.log("🧠 Prompt preview:", prompt.slice(0, 200));

  try {
    const result = await withTimeout(callAI(prompt), 120000); 

    if (!result) throw new Error("Empty AI response");

    console.log("✅ Summary generated");
    return result;

  } catch (err) {
    console.error("❌ Repo summary failed entirely:", err.message);
    throw err;
  }
}

// -------------------------
// EXPLAIN FILE
// -------------------------
async function explainCode(filePath, code) {

  console.log("📄 explainCode called:", filePath);

  if (!code || typeof code !== "string") {
    throw new Error("Invalid code received");
  }

  const truncatedCode = code.substring(0, 6000);

  const prompt = `Explain the following code file.

File path: ${filePath}

Code:
${truncatedCode}

Explain:
1. What this file does
2. Important parts
3. How it fits in project`;

  try {
    const result = await withTimeout(callAI(prompt), 120000); 

    if (!result) throw new Error("Empty AI response");

    console.log("✅ Explanation generated");
    return result;

  } catch (err) {
    console.error("❌ Code explanation failed entirely:", err.message);
    return "Explanation unavailable";
  }
}

// -------------------------
// CHAT WITH AI
// -------------------------
async function chatWithAI(owner, repo, contextPath, chatHistory, fileContent = null) {
  console.log("💬 chatWithAI called for:", contextPath);

  let systemPrompt = `You are an expert programming assistant analyzing the GitHub repository ${owner}/${repo}.\n`;
  if (contextPath) {
    systemPrompt += `The user is currently asking about the file or folder: ${contextPath}\n`;
  }
  if (fileContent) {
    const truncatedCode = fileContent.substring(0, 8000);
    systemPrompt += `\nHere is the content of ${contextPath}:\n\n${truncatedCode}\n\n`;
  }

  // Format chat history into a single string
  let historyPrompt = "Conversation history:\n";
  for (const msg of chatHistory) {
    const role = msg.role === "user" ? "User" : "AI";
    historyPrompt += `${role}: ${msg.text}\n`;
  }

  const prompt = `${systemPrompt}\n${historyPrompt}\nAI:`;

  try {
    const result = await withTimeout(callAI(prompt), 120000);
    if (!result) throw new Error("Empty AI response");
    
    console.log("✅ Chat response generated");
    return result;
  } catch (err) {
    console.error("❌ Chat generation failed:", err.message);
    throw err;
  }
}

module.exports = {
  summarizeRepo,
  explainCode,
  chatWithAI
};
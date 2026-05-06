const axios = require("axios");

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";

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
  console.log("🔑 API KEY:", API_KEY ? "FOUND" : "MISSING");

  if (!API_KEY) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  try {

    const response = await axios.post(
      `${GEMINI_URL}?key=${API_KEY}`,
      {
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ]
      },
      {
        headers: {
          "Content-Type": "application/json"
        },
        timeout: 60000 // 60 seconds
      }
    );

    console.log("✅ Gemini responded");

    const data = response.data;

    // 🔍 Debug full response
    console.log("GEMINI RAW RESPONSE:", JSON.stringify(data, null, 2));

    const candidates = data?.candidates;

    if (!candidates || candidates.length === 0) {
      throw new Error("No candidates returned from Gemini");
    }

    const parts = candidates[0]?.content?.parts;

    if (!parts || parts.length === 0) {
      throw new Error("Empty parts from Gemini");
    }

    const text = parts[0]?.text;

    if (!text) {
      throw new Error("No text returned from Gemini");
    }

    return text;

  } catch (err) {

    console.error("❌ Gemini API ERROR:");
    console.error(err.response?.data || err.message);

    throw err;
  }
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

    const result = await withTimeout(callGemini(prompt), 60000); // Increased from 15s to 60s

    if (!result) {
      throw new Error("Empty AI response");
    }

    console.log("✅ Summary generated");

    return result;

  } catch (err) {

    console.error("❌ Gemini repo summary failed:", err.message);

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

    const result = await withTimeout(callGemini(prompt), 60000); // Increased from 15s to 60s

    if (!result) {
      throw new Error("Empty AI response");
    }

    console.log("✅ Explanation generated");

    return result;

  } catch (err) {

    console.error("❌ Gemini code explanation failed:", err.message);

    return "Explanation unavailable";
  }
}

module.exports = {
  summarizeRepo,
  explainCode
};
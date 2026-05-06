// Must be at top — jest hoists this
jest.mock("axios");

describe("AI Service", () => {

  let aiService;
  let axios;

  beforeEach(() => {
    jest.resetModules();
    // Re-require axios mock and ai.service after every module reset
    jest.mock("axios");
    axios = require("axios");
    process.env.GEMINI_API_KEY = "test-api-key";
    aiService = require("../modules/ai/ai.service");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockSuccess = (text) => {
    axios.post.mockResolvedValue({
      data: {
        candidates: [{ content: { parts: [{ text }] } }]
      }
    });
  };

  // -------------------------
  // callGemini (via summarizeRepo)
  // -------------------------
  describe("callGemini", () => {

    it("should throw if GEMINI_API_KEY is missing", async () => {
      jest.resetModules();
      delete process.env.GEMINI_API_KEY;
      jest.mock("axios");
      const aiServiceNoKey = require("../modules/ai/ai.service");

      await expect(
        aiServiceNoKey.summarizeRepo("my-repo", [])
      ).rejects.toThrow("Missing GEMINI_API_KEY");
    });

    it("should throw if candidates array is empty", async () => {
      axios.post.mockResolvedValue({ data: { candidates: [] } });

      await expect(
        aiService.summarizeRepo("my-repo", [{ name: "index.js" }])
      ).rejects.toThrow("No candidates returned from Gemini");
    });

    it("should throw if parts array is empty", async () => {
      axios.post.mockResolvedValue({
        data: { candidates: [{ content: { parts: [] } }] }
      });

      await expect(
        aiService.summarizeRepo("my-repo", [{ name: "index.js" }])
      ).rejects.toThrow("Empty parts from Gemini");
    });

    it("should throw if text field is missing", async () => {
      axios.post.mockResolvedValue({
        data: { candidates: [{ content: { parts: [{}] } }] }
      });

      await expect(
        aiService.summarizeRepo("my-repo", [{ name: "index.js" }])
      ).rejects.toThrow("No text returned from Gemini");
    });

    it("should throw if axios.post rejects", async () => {
      axios.post.mockRejectedValue(new Error("Network error"));

      await expect(
        aiService.summarizeRepo("my-repo", [{ name: "index.js" }])
      ).rejects.toThrow("Network error");
    });
  });

  // -------------------------
  // summarizeRepo
  // -------------------------
  describe("summarizeRepo", () => {

    it("should return AI summary on success", async () => {
      mockSuccess("This repo is an API server.");

      const result = await aiService.summarizeRepo("my-repo", [
        { name: "index.js" },
        { name: "server.js" }
      ]);

      expect(result).toBe("This repo is an API server.");
      expect(axios.post).toHaveBeenCalledTimes(1);
    });

    it("should slice files to first 10", async () => {
      mockSuccess("Summary");

      const files = Array.from({ length: 20 }, (_, i) => ({ name: `file${i}.js` }));
      await aiService.summarizeRepo("big-repo", files);

      const promptText = axios.post.mock.calls[0][1].contents[0].parts[0].text;
      expect(promptText).toContain("file9.js");
      expect(promptText).not.toContain("file10.js");
    });

    it("should include repo name and file names in the prompt", async () => {
      mockSuccess("ok");

      await aiService.summarizeRepo("cool-repo", [{ name: "app.js" }]);

      const promptText = axios.post.mock.calls[0][1].contents[0].parts[0].text;
      expect(promptText).toContain("cool-repo");
      expect(promptText).toContain("app.js");
    });

    it("should throw when AI returns empty text", async () => {
      axios.post.mockResolvedValue({
        data: { candidates: [{ content: { parts: [{ text: "" }] } }] }
      });

      await expect(
        aiService.summarizeRepo("my-repo", [{ name: "index.js" }])
      ).rejects.toThrow();
    });

    it("should propagate error when Gemini fails", async () => {
      axios.post.mockRejectedValue(new Error("Gemini down"));

      await expect(
        aiService.summarizeRepo("my-repo", [])
      ).rejects.toThrow("Gemini down");
    });
  });

  // -------------------------
  // explainCode
  // -------------------------
  describe("explainCode", () => {

    it("should return explanation on success", async () => {
      mockSuccess("This file handles routing.");

      const result = await aiService.explainCode(
        "routes/index.js",
        "const express = require('express');"
      );

      expect(result).toBe("This file handles routing.");
    });

    it("should throw if code is null", async () => {
      await expect(
        aiService.explainCode("file.js", null)
      ).rejects.toThrow("Invalid code received");
    });

    it("should throw if code is not a string", async () => {
      await expect(
        aiService.explainCode("file.js", 12345)
      ).rejects.toThrow("Invalid code received");
    });

    it("should truncate code to 6000 chars", async () => {
      mockSuccess("Explained.");

      const longCode = "x".repeat(10000);
      await aiService.explainCode("big.js", longCode);

      const promptText = axios.post.mock.calls[0][1].contents[0].parts[0].text;
      expect(promptText).toContain("x".repeat(6000));
      expect(promptText).not.toContain("x".repeat(6001));
    });

    it("should include file path in prompt", async () => {
      mockSuccess("ok");

      await aiService.explainCode("utils/helper.js", "function add() {}");

      const promptText = axios.post.mock.calls[0][1].contents[0].parts[0].text;
      expect(promptText).toContain("utils/helper.js");
    });

    it("should return 'Explanation unavailable' when Gemini fails", async () => {
      axios.post.mockRejectedValue(new Error("Timeout"));

      const result = await aiService.explainCode("file.js", "some code");

      expect(result).toBe("Explanation unavailable");
    });

    it("should return 'Explanation unavailable' when text is empty", async () => {
      axios.post.mockResolvedValue({
        data: { candidates: [{ content: { parts: [{ text: "" }] } }] }
      });

      const result = await aiService.explainCode("file.js", "some code");

      expect(result).toBe("Explanation unavailable");
    });
  });
});
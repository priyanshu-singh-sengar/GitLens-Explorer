const repoService = require("../modules/repo/repo.service");

// MOCK AXIOS (CRITICAL)
jest.mock("axios", () => {
  const mockAxiosInstance = {
    get: jest.fn((url) => {
      if (url.includes("/repos/test/repo")) {
        return Promise.resolve({ data: { default_branch: "main" } });
      }
      if (url.includes("/commits")) {
        return Promise.resolve({ data: { sha: "123" } });
      }
      return Promise.resolve({ data: {} });
    }),

    // ✅ ADD THIS — axiosClient.js calls interceptors.request.use() and interceptors.response.use()
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    }
  };

  return {
    get: mockAxiosInstance.get,
    create: jest.fn(() => mockAxiosInstance)  // create() must return the instance above
  };
});

// MOCK DEPENDENCIES
jest.mock("../services/github.service", () => ({
  getRepoTree: jest.fn(() => Promise.resolve([]))
}));

jest.mock("../modules/ai/ai.service", () => ({
  summarizeRepo: jest.fn(() => Promise.resolve("Mock summary")),
  explainCode: jest.fn(() => Promise.resolve("Mock explanation"))
}));

jest.mock("../models/repoCache.model", () => ({
  findOne: jest.fn(() => null),
  findOneAndUpdate: jest.fn()
}));

jest.mock("../models/fileCache.model", () => ({
  findOne: jest.fn(() => null),
  findOneAndUpdate: jest.fn()
}));

describe("Repo Service", () => {

  it("should fetch repo successfully", async () => {

    const result = await repoService.fetchRepo(
      "https://github.com/test/repo"
    );

    expect(result).toHaveProperty("summary");
    expect(result.cached).toBe(false);
  });

  it("should throw on invalid URL", async () => {

    await expect(
      repoService.fetchRepo("abc")
    ).rejects.toThrow();
  });

});
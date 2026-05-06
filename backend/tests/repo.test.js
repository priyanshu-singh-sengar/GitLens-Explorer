// 🔥 MOCK FIRST (TOP OF FILE)
jest.mock("../modules/repo/repo.service", () => ({
  fetchRepo: jest.fn((repoUrl) => {
    if (repoUrl === "abc") {
      throw new Error("Invalid GitHub repository URL");
    }

    return Promise.resolve({
      owner: "axios",
      repo: "axios",
      commitSha: "123",
      tree: [],
      importantFiles: [],
      architecture: {},
      summary: "Mock summary",
      cached: false
    });
  })
}));

const request = require("supertest");
const app = require("../server");

describe("Repo API", () => {

  it("should load repo", async () => {

    const res = await request(app)
      .post("/api/v1/repo/load")
      .send({
        repoUrl: "https://github.com/axios/axios"
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.summary).toBe("Mock summary");
  });

  it("should fail on invalid repo url", async () => {

    const res = await request(app)
      .post("/api/v1/repo/load")
      .send({
        repoUrl: "abc"
      });

    expect(res.statusCode).toBe(400);
  });

});
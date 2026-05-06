const request = require("supertest");
const app = require("../server");

// ✅ MOCK repo.service
jest.mock("../modules/repo/repo.service", () => ({
  getLatestCommitSha: jest.fn(() => Promise.resolve("123")),
  fetchFile: jest.fn(() => Promise.resolve("Mock file content")),
  explainFile: jest.fn(() =>
    Promise.resolve({
      explanation: "Mock explanation",
      cached: false
    })
  )
}));

describe("File API", () => {

  it("should fetch file and explanation", async () => {

    const res = await request(app).get(
      "/api/v1/repo/file?owner=axios&repo=axios&path=README.md"
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.content).toBe("Mock file content");
    expect(res.body.explanation).toBe("Mock explanation");
  });

  it("should fail if params missing", async () => {

    const res = await request(app).get("/api/v1/repo/file");

    expect(res.statusCode).toBe(400);
  });

});
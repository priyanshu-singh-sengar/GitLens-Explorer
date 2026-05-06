const repoController = require("../modules/repo/repo.controller");

const repoService = require("../modules/repo/repo.service");

// 🔥 MOCK service
jest.mock("../modules/repo/repo.service");

describe("Repo Controller", () => {

  let req, res;

  beforeEach(() => {
    req = {
      body: {},
      query: {}
    };

    res = {
      json: jest.fn(),
      status: jest.fn(() => res)
    };
  });

  // -------------------------
  // LOAD REPO
  // -------------------------
  it("should load repo successfully", async () => {

    req.body.repoUrl = "https://github.com/test/repo";

    repoService.fetchRepo.mockResolvedValue({
      summary: "Test summary"
    });

    await repoController.loadRepo(req, res);

    expect(res.json).toHaveBeenCalledWith({
      summary: "Test summary"
    });
  });

  it("should handle loadRepo error", async () => {

    repoService.fetchRepo.mockRejectedValue(new Error("fail"));

    await repoController.loadRepo(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  // -------------------------
  // GET FILE
  // -------------------------
  it("should return 400 if params missing", async () => {

    req.query = {};

    await repoController.getFile(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("should fetch file successfully", async () => {

    req.query = {
      owner: "a",
      repo: "b",
      path: "c"
    };

    repoService.getLatestCommitSha.mockResolvedValue("123");
    repoService.fetchFile.mockResolvedValue("code");
    repoService.explainFile.mockResolvedValue({
      explanation: "exp",
      cached: false
    });

    await repoController.getFile(req, res);

    expect(res.json).toHaveBeenCalled();
  });

});
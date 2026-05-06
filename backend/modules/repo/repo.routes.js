const express = require("express");
const router = express.Router();

const repoController = require("./repo.controller");
const validate = require("../../middlewares/validate");

const { aiLimiter } = require("../../middlewares/rateLimiter");

const {
  githubRepoSchema,
  getFileSchema,
  resolveImportSchema,
  resolveSymbolSchema,
  usageSchema
} = require("../../validators/repo.validator");

/*
  Load repo
*/
router.post(
  "/load",
  validate(githubRepoSchema),
  repoController.loadRepo
);

/*
  Get file
*/
router.get(
  "/file",
  aiLimiter,
  validate(getFileSchema, "query"),
  repoController.getFile
);

/*
  File usage
*/
router.get(
  "/usage",
  validate(usageSchema, "query"),
  repoController.getFileUsage
);

/*
  Import navigation
*/
router.get(
  "/resolve-import",
  validate(resolveImportSchema, "query"),
  repoController.resolveImport
);

/*
  Symbol navigation
*/
router.get(
  "/resolve-symbol",
  validate(resolveSymbolSchema, "query"),
  repoController.resolveSymbol
);

/*
  Folder explaination
*/
router.get(
  "/folder",
  repoController.getFolderExplanation
);

module.exports = router;

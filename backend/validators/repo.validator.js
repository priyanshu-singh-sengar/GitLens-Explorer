const { z } = require("zod");

/*
  Validate GitHub repo URL
*/
const githubRepoSchema = z.object({
  repoUrl: z
    .string()
    .min(1, "Repo URL is required")
    .url("Invalid URL format")
    .refine(
      (url) => url.includes("github.com"),
      "Must be a valid GitHub repository URL"
    )
});

/*
  Get file validation
*/
const getFileSchema = z.object({
  owner: z.string().min(1, "Owner is required"),
  repo: z.string().min(1, "Repo is required"),
  path: z.string().min(1, "File path is required")
});

/*
  Resolve import validation
*/
const resolveImportSchema = z.object({
  file: z.string().min(1, "File path is required"),
  importPath: z.string().min(1, "Import path is required")
});

/*
  Resolve symbol validation
*/
const resolveSymbolSchema = z.object({
  symbol: z.string().min(1, "Symbol is required")
});

/*
  File usage validation
*/
const usageSchema = z.object({
  file: z.string().min(1, "File path is required")
});

module.exports = {
  githubRepoSchema,
  getFileSchema,
  resolveImportSchema,
  resolveSymbolSchema,
  usageSchema
};
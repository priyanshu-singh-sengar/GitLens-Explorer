const IGNORED_FOLDERS = [
  ".git",
  ".github",
  "node_modules",
  "dist",
  "build",
  "coverage",
  "docs",
  ".next",
  ".turbo",
  "out"
];

const IGNORED_FILES = [
  ".gitignore",
  ".npmignore",
  ".prettierrc",
  ".prettierignore",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml"
];

const IGNORED_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".ico",
  ".mp4",
  ".webm",
  ".mov",
  ".mp3",
  ".wav",
  ".zip",
  ".tar",
  ".gz",
  ".map"
];

function filterRepoFiles(files) {

  return files.filter(file => {

    const parts = file.path.split("/");



    // Ignore folders
    if (parts.some(p => IGNORED_FOLDERS.includes(p))) {
      return false;
    }



    const fileName = parts[parts.length - 1];



    // Ignore specific files
    if (IGNORED_FILES.includes(fileName)) {
      return false;
    }



    // Ignore binary / asset files
    if (
      IGNORED_EXTENSIONS.some(ext =>
        fileName.toLowerCase().endsWith(ext)
      )
    ) {
      return false;
    }



    // Ignore minified files
    if (fileName.endsWith(".min.js")) {
      return false;
    }



    return true;

  });

}

module.exports = filterRepoFiles;
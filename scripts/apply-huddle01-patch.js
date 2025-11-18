const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const packageDir = path.join(repoRoot, "node_modules", "@huddle01", "react-native-call-detection");
const patchDir = path.join(repoRoot, "patches", "@huddle01", "react-native-call-detection");

const files = [
  {
    src: path.join(patchDir, "index.js"),
    dest: path.join(packageDir, "index.js"),
  },
  {
    src: path.join(patchDir, "android", "src", "main", "java", "com", "pritesh", "calldetection", "CallDetectionManager.java"),
    dest: path.join(packageDir, "android", "src", "main", "java", "com", "pritesh", "calldetection", "CallDetectionManager.java"),
  },
  {
    src: path.join(patchDir, "android", "src", "main", "java", "com", "pritesh", "calldetection", "CallDetectionManagerModule.java"),
    dest: path.join(packageDir, "android", "src", "main", "java", "com", "pritesh", "calldetection", "CallDetectionManagerModule.java"),
  },
];

let copied = 0;
for (const file of files) {
  if (!fs.existsSync(file.src)) {
    console.warn(`Patch source missing: ${file.src}`);
    continue;
  }
  fs.mkdirSync(path.dirname(file.dest), { recursive: true });
  fs.copyFileSync(file.src, file.dest);
  copied += 1;
}

if (copied > 0) {
  console.log(`Applied @huddle01/react-native-call-detection patches (${copied} files).`);
}

import { cp, mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(rootDir, "dist");

const runtimeFiles = [
    "Apps/3DHeritageMapApp.html",
    "Apps/3DHeritageMapApp_AI_Test.html",
    "Apps/3DHeritageScripts.js",
    "Apps/3DHeritageStyles.css",
    "Apps/AIChatBot.js",
    "Apps/AIChatStyles.css",
    "Apps/config.js",
    "Apps/google_fonts.css",
    "Apps/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7W0I5nvwU.woff2",
    "Apps/V8mDoQDjQSkFtoMM3T6r8E7mPbF4Cw.woff2"
];

const runtimeDirectories = [
    "Apps/Data",
    "Apps/Images",
    "Build/Cesium",
    "DBApp"
];

function assertInsideRoot(targetPath) {
    const relative = path.relative(rootDir, targetPath);
    if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
        throw new Error(`Refusing to operate outside repo root: ${targetPath}`);
    }
}

async function exists(targetPath) {
    try {
        await stat(targetPath);
        return true;
    } catch {
        return false;
    }
}

async function copyPath(relativePath) {
    const source = path.join(rootDir, relativePath);
    const destination = path.join(distDir, relativePath);

    if (!(await exists(source))) {
        console.warn(`Skipping missing runtime path: ${relativePath}`);
        return 0;
    }

    await mkdir(path.dirname(destination), { recursive: true });
    await cp(source, destination, { recursive: true });
    return getPathSize(destination);
}

async function getPathSize(targetPath) {
    const stats = await stat(targetPath);
    if (!stats.isDirectory()) {
        return stats.size;
    }

    const entries = await readdir(targetPath, { withFileTypes: true });
    const sizes = await Promise.all(entries.map(entry => getPathSize(path.join(targetPath, entry.name))));
    return sizes.reduce((total, size) => total + size, 0);
}

function formatBytes(bytes) {
    const units = ["B", "KB", "MB", "GB"];
    let value = bytes;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex += 1;
    }

    return `${value.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
}

async function main() {
    assertInsideRoot(distDir);
    await rm(distDir, { recursive: true, force: true });
    await mkdir(distDir, { recursive: true });

    let totalBytes = 0;
    const productionIndex = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0; url=/Apps/3DHeritageMapApp.html">
  <title>Cesium 3D Heritage Map</title>
</head>
<body>
  <a href="/Apps/3DHeritageMapApp.html">Open Cesium 3D Heritage Map</a>
</body>
</html>
`;
    await writeFile(path.join(distDir, "index.html"), productionIndex, "utf8");
    totalBytes += Buffer.byteLength(productionIndex);

    for (const relativePath of [...runtimeFiles, ...runtimeDirectories]) {
        totalBytes += await copyPath(relativePath);
    }

    console.log(`Prepared Netlify dist at ${distDir}`);
    console.log(`Runtime artifact size: ${formatBytes(totalBytes)}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

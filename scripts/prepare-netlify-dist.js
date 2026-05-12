import { access, cp, mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(rootDir, "dist");

const runtimeFileExtensions = new Set([".html", ".js", ".css", ".woff", ".woff2"]);
const runtimeFileSourceDirs = ["Apps"];
const runtimeDirectories = [
    "Apps/Data",
    "Apps/Images",
    "Build/Cesium",
    "DBApp"
];

const requiredArtifacts = [
    "Apps/3DHeritageMapApp.html",
    "Apps/3DHeritageScripts.js",
    "Build/Cesium/Cesium.js"
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

async function discoverRuntimeFiles() {
    const discovered = [];
    for (const sourceDir of runtimeFileSourceDirs) {
        const absoluteDir = path.join(rootDir, sourceDir);
        if (!(await exists(absoluteDir))) {
            continue;
        }
        const entries = await readdir(absoluteDir, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isFile()) {
                continue;
            }
            const ext = path.extname(entry.name).toLowerCase();
            if (!runtimeFileExtensions.has(ext)) {
                continue;
            }
            discovered.push(path.posix.join(sourceDir, entry.name));
        }
    }
    return discovered.sort();
}

async function assertRequiredArtifacts() {
    const missing = [];
    for (const relativePath of requiredArtifacts) {
        try {
            await access(path.join(distDir, relativePath));
        } catch {
            missing.push(relativePath);
        }
    }
    if (missing.length > 0) {
        throw new Error(`Required dist artifacts missing: ${missing.join(", ")}`);
    }
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
    const landingIndex = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Cesium 3D Heritage Map</title>
</head>
<body>
  <a href="/Apps/3DHeritageMapApp.html">Open Cesium 3D Heritage Map</a>
</body>
</html>
`;
    await writeFile(path.join(distDir, "index.html"), landingIndex, "utf8");
    totalBytes += Buffer.byteLength(landingIndex);

    const runtimeFiles = await discoverRuntimeFiles();
    for (const relativePath of [...runtimeFiles, ...runtimeDirectories]) {
        totalBytes += await copyPath(relativePath);
    }

    await assertRequiredArtifacts();

    console.log(`Prepared Netlify dist at ${distDir}`);
    console.log(`Runtime artifact size: ${formatBytes(totalBytes)}`);
    console.log(`Runtime files copied: ${runtimeFiles.length}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

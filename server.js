/*eslint-env node*/
import fs from "fs";
import path from "path";
import { performance } from "perf_hooks";
import fetch from "node-fetch";
import { URL } from "url";

import chokidar from "chokidar";
import compression from "compression";
import express from "express";
import yargs from "yargs";

import ContextCache from "./scripts/ContextCache.js";
import createRoute from "./scripts/createRoute.js";
import { serveCarto } from "./netlify/functions/carto.mjs";
import { createRateLimiter, sanitizeMessages } from "./scripts/chat-guard.mjs";
import { loadGreenReports } from "./scripts/sags-uns-service.mjs";

const argv = yargs(process.argv)
  .options({
    port: {
      default: 8080,
      description: "Port to listen on.",
    },
    public: {
      type: "boolean",
      description: "Run a public server that listens on all interfaces.",
    },
    production: {
      type: "boolean",
      description: "If true, skip build step and serve existing built files.",
    },
  })
  .help().argv;

import {
  createCesiumJs,
  createJsHintOptions,
  createCombinedSpecList,
  glslToJavaScript,
  createIndexJs,
  buildCesium,
} from "./scripts/build.js";

// Load environment variables from a local .env file (gitignored) without
// adding a dependency. Supports plain KEY=value lines only.
(function loadDotEnv() {
  try {
    const envText = fs.readFileSync(".env", "utf8");
    envText.split(/\r?\n/).forEach(function (line) {
      const match = /^\s*([\w.-]+)\s*=\s*(.*?)\s*$/.exec(line);
      if (match && process.env[match[1]] === undefined) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
      }
    });
  } catch (error) {
    // No .env file present — environment variables may be set externally.
  }
})();

const sourceFiles = [
  "packages/engine/Source/**/*.js",
  "!packages/engine/Source/*.js",
  "packages/widgets/Source/**/*.js",
  "!packages/widgets/Source/*.js",
  "!packages/engine/Source/Shaders/**",
  "!packages/engine/Source/ThirdParty/Workers/**",
  "!packages/engine/Source/ThirdParty/google-earth-dbroot-parser.js",
  "!packages/engine/Source/ThirdParty/_*",
];
const specFiles = [
  "packages/engine/Specs/**/*Spec.js",
  "!packages/engine/Specs/SpecList.js",
  "packages/widgets/Specs/**/*Spec.js",
  "!packages/widgets/Specs/SpecList.js",
  "Specs/*.js",
  "!Specs/SpecList.js",
  "!Specs/e2e/**",
];
const shaderFiles = ["packages/engine/Source/Shaders/**/*.glsl"];

const outputDirectory = path.join("Build", "CesiumDev");

function formatTimeSinceInSeconds(start) {
  return Math.ceil((performance.now() - start) / 100) / 10;
}

/**
 * Returns CesiumJS bundles configured for development.
 *
 * @returns {Bundles} The bundles.
 */
async function generateDevelopmentBuild() {
  const startTime = performance.now();

  // Build @cesium/engine index.js
  console.log("[1/3] Building @cesium/engine...");
  await createIndexJs("engine");

  // Build @cesium/widgets index.js
  console.log("[2/3] Building @cesium/widgets...");
  await createIndexJs("widgets");

  // Build CesiumJS and save returned contexts for rebuilding upon request
  console.log("[3/3] Building CesiumJS...");
  const contexts = await buildCesium({
    development: true,
    iife: true,
    incremental: true,
    minify: false,
    node: false,
    outputDirectory: outputDirectory,
    removePragmas: false,
    sourcemap: true,
    write: false,
  });

  console.log(
    `Cesium built in ${formatTimeSinceInSeconds(startTime)} seconds.`
  );

  return contexts;
}

(async function () {
  const gzipHeader = Buffer.from("1F8B08", "hex");
  const production = argv.production;

  let contexts;
  if (!production) {
    contexts = await generateDevelopmentBuild();
  }

  // eventually this mime type configuration will need to change
  // https://github.com/visionmedia/send/commit/d2cb54658ce65948b0ed6e5fb5de69d022bef941
  // *NOTE* Any changes you make here must be mirrored in web.config.
  const mime = express.static.mime;
  mime.define(
    {
      "application/json": ["czml", "json", "geojson", "topojson"],
      "application/wasm": ["wasm"],
      "image/ktx2": ["ktx2"],
      "model/gltf+json": ["gltf"],
      "model/gltf-binary": ["bgltf", "glb"],
      "application/octet-stream": [
        "b3dm",
        "pnts",
        "i3dm",
        "cmpt",
        "geom",
        "vctr",
      ],
      "text/plain": ["glsl"],
    },
    true
  );

  const app = express();
  app.use(compression());
  //eslint-disable-next-line no-unused-vars
  app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept"
    );
    next();
  });

  function checkGzipAndNext(req, res, next) {
    const baseURL = `${req.protocol}://${req.headers.host}/`;
    const reqUrl = new URL(req.url, baseURL);
    const filePath = reqUrl.pathname.substring(1);

    const readStream = fs.createReadStream(filePath, { start: 0, end: 2 });
    //eslint-disable-next-line no-unused-vars
    readStream.on("error", function (err) {
      next();
    });

    readStream.on("data", function (chunk) {
      if (chunk.equals(gzipHeader)) {
        res.header("Content-Encoding", "gzip");
      }
      next();
    });
  }

  const knownTilesetFormats = [
    /\.b3dm/,
    /\.pnts/,
    /\.i3dm/,
    /\.cmpt/,
    /\.glb/,
    /\.geom/,
    /\.vctr/,
    /tileset.*\.json$/,
  ];
  app.get(knownTilesetFormats, checkGzipAndNext);

  if (!production) {
    const iifeWorkersCache = new ContextCache(contexts.iifeWorkers);
    const iifeCache = createRoute(
      app,
      "Cesium.js",
      "/Build/CesiumUnminified/Cesium.js*",
      contexts.iife,
      [iifeWorkersCache]
    );
    const esmCache = createRoute(
      app,
      "index.js",
      "/Build/CesiumUnminified/index.js*",
      contexts.esm
    );
    const workersCache = createRoute(
      app,
      "Workers/*",
      "/Build/CesiumUnminified/Workers/*.js",
      contexts.workers
    );

    const glslWatcher = chokidar.watch(shaderFiles, { ignoreInitial: true });
    glslWatcher.on("all", async () => {
      await glslToJavaScript(false, "Build/minifyShaders.state", "engine");
      esmCache.clear();
      iifeCache.clear();
    });

    let jsHintOptionsCache;
    const sourceCodeWatcher = chokidar.watch(sourceFiles, {
      ignoreInitial: true,
    });
    sourceCodeWatcher.on("all", async () => {
      esmCache.clear();
      iifeCache.clear();
      workersCache.clear();
      iifeWorkersCache.clear();
      jsHintOptionsCache = undefined;
      await createCesiumJs();
    });

    const testWorkersCache = createRoute(
      app,
      "TestWorkers/*",
      "/Build/Specs/TestWorkers/*",
      contexts.testWorkers
    );
    chokidar
      .watch(["Specs/TestWorkers/*.js"], { ignoreInitial: true })
      .on("all", testWorkersCache.clear);

    const specsCache = createRoute(
      app,
      "Specs/*",
      "/Build/Specs/*",
      contexts.specs
    );
    const specWatcher = chokidar.watch(specFiles, { ignoreInitial: true });
    specWatcher.on("all", async (event) => {
      if (event === "add" || event === "unlink") {
        await createCombinedSpecList();
      }

      specsCache.clear();
    });

    // Rebuild jsHintOptions as needed and serve as-is
    app.get("/Apps/Sandcastle/jsHintOptions.js", async function (
      //eslint-disable-next-line no-unused-vars
      req,
      res,
      //eslint-disable-next-line no-unused-vars
      next
    ) {
      if (!jsHintOptionsCache) {
        jsHintOptionsCache = await createJsHintOptions();
      }

      res.append("Cache-Control", "max-age=0");
      res.append("Content-Type", "application/javascript");
      res.send(jsHintOptionsCache);
    });

    // Serve any static files starting with "Build/CesiumUnminified" from the
    // development build instead. That way, previous build output is preserved
    // while the latest is being served
    app.use("/Build/CesiumUnminified", express.static("Build/CesiumDev"));
  }

  // GeoAI chat proxy (local development) — mirrors netlify/functions/chat.mjs.
  // Keeps the OpenRouter API key server-side; the browser only talks to /api/chat.
  // Requires OPENROUTER_API_KEY (environment variable or gitignored .env file).
  const chatProxyConfig = {
    model:
      process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free",
    // Free models are often rate-limited upstream; retry with these in order.
    // Free slugs rotate — check https://openrouter.ai/api/v1/models (ids
    // ending in ":free") when all of them start returning 404.
    fallbackModels: [
      "openai/gpt-oss-120b:free",
      "google/gemma-4-31b-it:free",
      "qwen/qwen3-next-80b-a3b-instruct:free",
    ],
    maxOutputTokens: 400,
    upstreamTimeoutMs: 15000,
    minAttemptBudgetMs: 2000,
  };

  const allowChatRequest = createRateLimiter();

  app.post("/api/chat", express.json({ limit: "64kb" }), async function (
    req,
    res
  ) {
    if (!allowChatRequest(req.ip || "local")) {
      return res.status(429).json({ error: "rate_limited" });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: "llm_not_configured" });
    }

    const messages = sanitizeMessages(req.body && req.body.messages);
    if (!messages) {
      return res.status(400).json({ error: "invalid_messages" });
    }

    const candidateModels = [chatProxyConfig.model].concat(
      chatProxyConfig.fallbackModels.filter(
        (model) => model !== chatProxyConfig.model
      )
    );
    const deadline = Date.now() + chatProxyConfig.upstreamTimeoutMs;
    let timedOut = false;

    for (const model of candidateModels) {
      const remainingMs = deadline - Date.now();
      if (remainingMs < chatProxyConfig.minAttemptBudgetMs) {
        timedOut = true;
        break;
      }

      const controller =
        typeof AbortController !== "undefined" ? new AbortController() : null;
      const timeoutId = controller
        ? setTimeout(() => controller.abort(), remainingMs)
        : null;
      try {
        const upstream = await fetch(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            signal: controller ? controller.signal : undefined,
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": `${req.protocol}://${req.headers.host}`,
              "X-Title": "Cesium3D Heritage Map GeoAI",
            },
            body: JSON.stringify({
              model: model,
              messages: messages,
              max_tokens: chatProxyConfig.maxOutputTokens,
              temperature: 0.4,
            }),
          }
        );

        if (!upstream.ok) {
          const detail = await upstream.text().catch(() => "");
          console.warn(
            "OpenRouter error",
            model,
            upstream.status,
            detail.slice(0, 300)
          );
          // Rate limits and server errors are worth retrying on the next
          // free model; auth/validation errors are not.
          if (
            upstream.status === 429 ||
            upstream.status >= 500 ||
            upstream.status === 404
          ) {
            continue;
          }
          return res.status(502).json({ error: "llm_upstream_error" });
        }

        const data = await upstream.json();
        const reply =
          data && data.choices && data.choices[0] && data.choices[0].message
            ? data.choices[0].message.content
            : null;
        if (typeof reply !== "string" || reply.trim().length === 0) {
          continue; // empty answer — try the next model
        }

        return res.json({ reply: reply });
      } catch (error) {
        if (error && error.name === "AbortError") {
          timedOut = true;
          break;
        }
        console.warn("OpenRouter request failed:", model, error);
        // Network hiccup — try the next candidate model.
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    }

    res.status(timedOut ? 504 : 502).json({
      error: timedOut ? "llm_timeout" : "llm_unreachable",
    });
  });

  app.get("/api/carto/*", async function (req, res) {
    const response = await serveCarto(req.path, process.env.CARTO_BASEMAP_API_KEY, fetch);
    response.headers.forEach((value, name) => res.setHeader(name, value));
    res.status(response.status).send(Buffer.from(await response.arrayBuffer()));
  });

  app.get("/api/sags-uns", async function (_req, res) {
    try {
      res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=300');
      res.json(await loadGreenReports());
    } catch {
      res.status(502).json({ error: 'reports_unavailable' });
    }
  });

  // Same as the Netlify rewrite: the app answers on "/" without a visible path.
  app.get("/", function (_req, res) {
    res.sendFile(path.resolve("Apps", "3DHeritageMapApp.html"));
  });

  app.use(express.static(path.resolve(".")));

  const server = app.listen(
    argv.port,
    argv.public ? undefined : "localhost",
    function () {
      if (argv.public) {
        console.log(
          "Cesium development server running publicly.  Connect to http://localhost:%d/",
          server.address().port
        );
      } else {
        console.log(
          "Cesium development server running locally.  Connect to http://localhost:%d/",
          server.address().port
        );
      }
    }
  );

  server.on("error", function (e) {
    if (e.code === "EADDRINUSE") {
      console.log(
        "Error: Port %d is already in use, select a different port.",
        argv.port
      );
      console.log("Example: node server.js --port %d", argv.port + 1);
    } else if (e.code === "EACCES") {
      console.log(
        "Error: This process does not have permission to listen on port %d.",
        argv.port
      );
      if (argv.port < 1024) {
        console.log("Try a port number higher than 1024.");
      }
    }

    throw e;
  });

  server.on("close", function () {
    console.log("Cesium development server stopped.");
    // eslint-disable-next-line n/no-process-exit
    process.exit(0);
  });

  let isFirstSig = true;
  process.on("SIGINT", function () {
    if (isFirstSig) {
      console.log("\nCesium development server shutting down.");

      server.close();

      if (!production) {
        contexts.esm.dispose();
        contexts.iife.dispose();
        contexts.workers.dispose();
        contexts.specs.dispose();
        contexts.testWorkers.dispose();
      }

      isFirstSig = false;
    } else {
      throw new Error("Cesium development server force kill.");
    }
  });
})();

import { extractChunksFromChunkloader } from "./extract/chunksExtractor";
import { DiscordBranch } from "./commonEnums";
import { JS_HTML_REGEX } from "./constants";
import { DiscordScrapeResult, DiscordScript, DiscordScriptTag } from "./types";

import { fetch, setGlobalDispatcher, Agent } from "undici";
import { extractStrings, isLanguageFile } from "./extract/stringsExtractor";

// otherwise fetch dies while fetching too many files
setGlobalDispatcher(new Agent({ connect: { timeout: 60_000 } }));

export async function scrapeApp(branch: DiscordBranch, overrideUrl?: string) {
  const response = await fetch(
    overrideUrl != undefined ? overrideUrl : new URL("/app", branch)
  );

  if (!response.ok) {
    console.error(
      `[miyako::main] Could not fetch initial stage, ${response.status} (${response.statusText}), aborting!`
    );
    return;
  }

  const versionHash = response.headers.get("X-Build-Id");
  const buildDate = response.headers.get("Date");

  if (versionHash == undefined) {
    console.error(
      "[miyako::main]",
      "FATAL: Could not find X-Build-Id header, aborting"
    );
    return;
  }

  if (buildDate == undefined) {
    console.error(
      "[miyako::main]",
      "FATAL: Could not find Date header, aborting"
    );
    return;
  }

  const build: DiscordScrapeResult = {
    branch,
    buildDate: new Date(buildDate),
    scripts: [],
    experiments: [],
    hash: versionHash,
    id: "",
  };

  console.log(
    "[miyako::main]",
    `Scraping build ${versionHash}, built on ${build.buildDate.toUTCString()}`
  );

  const body = await response.text();
  const scriptMatches = body.matchAll(JS_HTML_REGEX);

  for (let match of scriptMatches) {
    const url = match[0];
    console.log(url);

    const script: DiscordScript = {
      type: "initial",
      path: url.replaceAll('"', ""),
      tags: [],
    };

    if (url.includes("web")) {
      script.tags.push(DiscordScriptTag.ChunkLoader);
    }

    build.scripts.push(script);
  }

  const chunkLoader = build.scripts.find((script) =>
    script.tags.includes(DiscordScriptTag.ChunkLoader)
  );

  if (chunkLoader == undefined) {
    console.error(
      "[miyako::main] FATAL: Could not find the chunkloader! Aborting"
    );
    return;
  }

  // Get the chunks out of the chunkLoader here
  const lazyChunks = await extractChunksFromChunkloader(branch, chunkLoader);

  if (lazyChunks == undefined) {
    throw new Error("dangit");
  }

  await Promise.all(
    lazyChunks.map(async (chunk) => {
      const script: DiscordScript = {
        type: "lazy",
        path: chunk.url,
        tags: [],
      };

      const url = branch + "/assets/" + chunk.url;
      console.log(`Fetching ${url}`);

      try {
        const response = await fetch(url);

        if (!response.ok) {
          console.error(
            `Failed to fetch chunk ${url}: (${response.status} - ${response.statusText})`
          );
          return;
        }

        const body = await response.text();

        if (isLanguageFile(body)) {
          script.tags.push(DiscordScriptTag.i18n);
        }

        script.body = body;

        build.scripts.push(script);
      } catch (err) {
        console.error(
          `Failed to fetch chunk ${url}: (${err.cause} - ${err.stack})`
        );
      }
    })
  );

  const languageFiles = build.scripts.filter((script) =>
    script.tags.includes(DiscordScriptTag.i18n)
  );

  console.log(
    `Got i18n: ${languageFiles.length}, starting string extraction..`
  );

  for (let i18nChunk of languageFiles) {
    if (i18nChunk.body != undefined) {
      const strings = await extractStrings(i18nChunk?.body);
      console.log(JSON.stringify(strings, null, -1));
    }
  }

  console.log(
    "[miyako::main]",
    `Finished scraping build ${versionHash}! Got ${build.scripts.length} scripts`
  );
}

import { extractChunksFromChunkloader } from "./extract/chunksExtractor";
import { DiscordBranch, JS_HTML_REGEX, BUILD_NUMBER_REGEX } from "./constants";
import { DiscordScrapeResult, DiscordScript, DiscordScriptTag } from "./types";

import { fetch, setGlobalDispatcher, Agent } from "undici";
import { extractStrings, isLanguageFile } from "./extract/stringsExtractor";

// otherwise fetch dies while fetching too many files
setGlobalDispatcher(new Agent({ connect: { timeout: 60_000 } }));

export * from "./constants";
export * from "./types";
export * from "./util/getFormattedBranchName";

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
  const buildDate = response.headers.get("Last-Modified");

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
    strings: [],
    hash: versionHash,
    id: "",
  };

  console.time("[miyako::timing] Build scrape took");
  console.log(
    "[miyako::main]",
    `Scraping build ${versionHash}, built on ${build.buildDate.toUTCString()}`
  );

  const body = await response.text();
  const scriptMatches = body.matchAll(JS_HTML_REGEX);

  for (let match of scriptMatches) {
    const url = match[0];
    const path = url.replaceAll('"', "");
    const response = await fetch(new URL(path, branch));

    if (!response.ok) {
      console.error(
        `[miyako::initial_fetch] Failed to fetch ${url} (${response.status} - ${response.statusText})`
      );
      return;
    }

    const script: DiscordScript = {
      type: "initial",
      path: path,
      body: await response.text(),
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
    console.error(
      "[miyako::chunks] Failed to extract chunks from the chunkLoader!"
    );
    return;
  }

  // get the client number
  const buildNumberMatches = chunkLoader.body?.match(BUILD_NUMBER_REGEX);

  if (buildNumberMatches == undefined || buildNumberMatches?.length == 0) {
    console.error(
      "[miyako::build_num_fetch] FATAL: Failed to fetch the build number!"
    );
    return;
  }

  build.id = buildNumberMatches[0];

  await Promise.all(
    lazyChunks.map(async (chunk) => {
      const script: DiscordScript = {
        type: "lazy",
        path: chunk.url,
        tags: [],
      };

      const url = branch + chunk.url;

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
    `[miyako::i18n] Got i18n: ${languageFiles.length}, starting string extraction..`
  );

  await Promise.all(
    languageFiles.map(async (i18nChunk) => {
      if (i18nChunk.body != undefined) {
        const strings = await extractStrings(i18nChunk?.body);

        build.strings = [...build.strings, ...strings];
      }
    })
  );

  console.timeEnd("[miyako::timing] Build scrape took");
  console.log(
    "[miyako::main]",
    `Finished scraping build ${versionHash}! Got ${build.scripts.length} scripts, ${build.strings.length} strings and ${build.experiments.length} experiments`
  );

  return build;
}

import { simple } from "acorn-walk";
import { parse } from "acorn";
import { DiscordChunk, DiscordScript } from "../types";
import { DiscordBranch } from "../constants";

function getChunkObject(node, type: "js" | "css") {
  const argument = node.argument;

  // don't want that either
  if (argument == null) {
    return;
  }

  const { left, right } = argument;

  // we don't want those
  if (left == undefined || right == undefined) {
    return;
  }

  const isInnerBinaryExpression =
    left.type == "BinaryExpression" && right.type == "Literal";

  const isJs = right.type == "Literal" && right.value == "." + type;

  if (isInnerBinaryExpression && isJs) {
    return left;
  }
}

export async function extractChunksFromChunkloader(
  branch: DiscordBranch,
  chunkloader: DiscordScript
) {
  const url = new URL(chunkloader.path, branch);
  const response = await fetch(url);
  const chunks: DiscordChunk[] = [];

  if (!response.ok) {
    console.error(
      `[miyako::chunks] Failed to fetch the chunkLoader from ${url} (${response.status} - ${response.statusText})`
    );
    return;
  }

  const body = await response.text();

  const program = await parse(body, {
    ecmaVersion: "latest",
  });

  try {
    simple(program, {
      ReturnStatement(node: any) {
        const jsChunks = getChunkObject(node, "js");
        const cssChunks = getChunkObject(node, "css");

        if (jsChunks != undefined) {
          const { right } = jsChunks;
          const { object } = right;

          for (let property of object.properties) {
            const { key, value } = property;

            const keyValue = key.value;
            // yes this is stupid
            const valueValue = value.value;

            chunks.push({
              type: "js",
              id: keyValue,
              hash: valueValue,
              url: `/assets/${valueValue}.js`,
            });
          }
        }

        if (cssChunks != undefined) {
          const { right } = cssChunks;
          const { object } = right;

          for (let property of object.properties) {
            const { key, value } = property;

            const keyValue = key.value;
            // yes this is stupid
            const valueValue = value.value;

            chunks.push({
              type: "css",
              id: keyValue,
              hash: valueValue,
              url: `/assets/${valueValue}.css`,
            });
          }
        }
      },
    });
  } catch (err) {
    const error = `[miyako::chunks] Failed to extract chunks from chunkLoader: ${err.message} - ${err.cause}`;
    console.error(error);
    throw error;
  }

  return chunks;
}

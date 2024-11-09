import { simple } from "acorn-walk";
import { parse } from "acorn";
import { DiscordString } from "../types";

// i hate this
export function isLanguageFile(source: string) {
  if (source.includes("o.default=JSON.parse(")) {
    return true;
  }

  return false;
}

export function extractStrings(source: string) {
  const program = parse(source, {
    ecmaVersion: "latest",
  });

  const chunks: DiscordString[] = [];

  simple(program, {
    CallExpression(node: any) {
      const callee = node.callee;

      if (callee.object.name != "JSON" && callee.property.name != "parse") {
        return;
      }

      const argument = node.arguments[0];
      const strings = JSON.parse(argument.value);

      for (let [key, value] of Object.entries(strings)) {
        chunks.push({
          id: key,
          value: value as string,
        });
      }
    },
  });

  return chunks;
}

import { DiscordBranch } from "commonEnums";

export enum DiscordScriptTag {
  //  Language File
  i18n,
  ChunkLoader,
}

export type DiscordScript = {
  type: "initial" | "lazy";
  path: string;
  body?: string;
  tags: DiscordScriptTag[];
};

export type DiscordChunk = {
  type: "js" | "css";
  id: string;
  hash: string;
  url: string;
};

export type DiscordString = {
  id: string;
  value: string;
};

export type DiscordScrapeResult = {
  branch: DiscordBranch;
  buildDate: Date;
  hash: string;
  id: string;
  experiments: [];
  scripts: DiscordScript[];
};
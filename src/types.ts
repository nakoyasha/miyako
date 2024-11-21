import { DiscordBranch } from "./constants";

export enum DiscordScriptTag {
  //  Language File
  i18n = "i18n",
  ChunkLoader = "chunk_loader",
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

export type DiscordExperiment = {
  kind: "guild" | "user";
  id: string;
  label: string;
  treatments: DiscordExperimentTreatment[];
};

export type DiscordExperimentTreatment = {
  id: number;
  label: string;
};

export type DiscordScrapeResult = {
  branch: DiscordBranch;
  buildDate: Date;
  hash: string;
  id: string;
  experiments: DiscordExperiment[];
  strings: DiscordString[];
  scripts: DiscordScript[];
};

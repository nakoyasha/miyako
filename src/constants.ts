export const JS_HTML_REGEX = /"(.*?).js"/g;
export const CSS_HTML_REGEX = /"(.*?).css"/g;
export const BUILD_NUMBER_REGEX = /(?<=build_number:")\d+(?=")/gm;

export enum DiscordBranch {
  Stable = "https://discord.com",
  PTB = "https://ptb.discord.com",
  Canary = "https://canary.discord.com",
}

import { DiscordBranch } from "../constants";

export default function getFormattedBranchName(branch: DiscordBranch) {
  if (branch == DiscordBranch.Stable) {
    return "stable";
  } else if (branch == DiscordBranch.PTB) {
    return "ptb";
  } else if (branch == DiscordBranch.Canary) {
    return "canary";
  }

  return `unknown-${branch}`;
}

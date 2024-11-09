import { scrapeApp } from "../src";
import { DiscordBranch } from "../src/commonEnums";

(async () => {
  await scrapeApp(DiscordBranch.Canary);
})();

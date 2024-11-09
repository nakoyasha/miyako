import { scrapeApp } from "../src";
import { DiscordBranch } from "../src/constants";

(async () => {
  await scrapeApp(DiscordBranch.Canary);
})();

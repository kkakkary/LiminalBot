import "#lib/setup.js";
import { LiminalClient } from "#lib/LiminalClient.js";
import { database } from "#lib/database.js";

const client = new LiminalClient();

const main = async () => {
  try {
    // Initialize database
    await database.init();

    client.logger.info("Logging in...");
    await client.login(process.env.DISCORD_TOKEN);
  } catch (error) {
    client.logger.fatal(error);
    await client.destroy();
    process.exit(1);
  }
};

main();

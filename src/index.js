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

// Add to your ready event in index.js or ready.js listener
client.once("ready", async () => {
  console.log(`🤖 Bot ready! Connected to ${client.guilds.cache.size} servers`);

  // Force register commands globally
  try {
    console.log("🔄 Registering commands globally...");

    const commands = [
      { name: "ping", description: "Ping pong!" },
      { name: "mute", description: "Timeout a user" },
      { name: "warn", description: "Warning system commands" },
      { name: "unmute", description: "Remove timeout from a user" },
      { name: "avatar", description: "Get a user's avatar" },
    ];

    await client.application.commands.set(commands);
    console.log("✅ Global commands registered!");
  } catch (error) {
    console.error("❌ Failed to register commands:", error);
  }
});

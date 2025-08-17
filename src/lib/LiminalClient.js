import { LogLevel, SapphireClient, container } from "@sapphire/framework";
import { GatewayIntentBits, Partials } from "discord.js";

export class LiminalClient extends SapphireClient {
  constructor() {
    super({
      defaultPrefix: ["!", "?"],
      regexPrefix: /^(hey +)?bot[,! ]/i,
      caseInsensitiveCommands: true,
      logger: {
        level: LogLevel.Debug,
      },
      shards: "auto",
      intents: [
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
      ],
      partials: [Partials.Channel],
      loadMessageCommandListeners: true,
      hmr: {
        enabled: process.env.NODE_ENV === "development",
      },
    });
  }

  async login(token) {
    const result = await super.login(token);
    return result;
  }

  async destroy() {
    return super.destroy();
  }
}

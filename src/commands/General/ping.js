import { Command } from "@sapphire/framework";

export class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "ping",
      aliases: ["pong"],
      description: "Ping pong!",
    });
  }

  registerApplicationCommands(registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName(this.name).setDescription(this.description)
    );
  }

  async chatInputRun(interaction) {
    const msg = await interaction.reply({
      content: `Ping?`,
      ephemeral: true,
      fetchReply: true,
    });

    const diff = msg.createdTimestamp - interaction.createdTimestamp;
    const ping = Math.round(this.container.client.ws.ping);

    return interaction.editReply(
      `🏓 Pong! (Round trip took: ${diff}ms. Heartbeat: ${ping}ms.)`
    );
  }

  async messageRun(message) {
    const msg = await message.reply("Ping?");

    const diff = msg.createdTimestamp - message.createdTimestamp;
    const ping = Math.round(this.container.client.ws.ping);

    return msg.edit(
      `🏓 Pong! (Round trip took: ${diff}ms. Heartbeat: ${ping}ms.)`
    );
  }
}

import { Command } from "@sapphire/framework";
import { EmbedBuilder } from "discord.js";

export class AvatarCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "avatar",
      aliases: ["av", "pfp"],
      description: "Get a user's avatar",
    });
  }

  registerApplicationCommands(registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("The user whose avatar you want to see")
            .setRequired(false)
        )
    );
  }

  async chatInputRun(interaction) {
    const user = interaction.options.getUser("user") ?? interaction.user;

    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle(`${user.username}'s Avatar`)
      .setImage(user.displayAvatarURL({ dynamic: true, size: 512 }))
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }

  async messageRun(message, args) {
    const user = await args.pick("user").catch(() => message.author);

    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle(`${user.username}'s Avatar`)
      .setImage(user.displayAvatarURL({ dynamic: true, size: 512 }))
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
}

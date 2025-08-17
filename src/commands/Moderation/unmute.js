import { Command } from "@sapphire/framework";
import { EmbedBuilder, PermissionFlagsBits } from "discord.js";

export class UnmuteCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "unmute",
      aliases: ["untimeout"],
      description: "Remove timeout from a user",
      requiredUserPermissions: [PermissionFlagsBits.ModerateMembers],
      requiredClientPermissions: [PermissionFlagsBits.ModerateMembers],
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
            .setDescription("The user to unmute")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("reason")
            .setDescription("Reason for removing the timeout")
            .setRequired(false)
        )
    );
  }

  async chatInputRun(interaction) {
    const targetUser = interaction.options.getUser("user");
    const reason =
      interaction.options.getString("reason") ?? "No reason provided";

    return this.unmuteUser(interaction, targetUser, reason);
  }

  async messageRun(message, args) {
    const targetUser = await args.pick("user");
    const reason = await args.rest("string").catch(() => "No reason provided");

    return this.unmuteUser(message, targetUser, reason);
  }

  async unmuteUser(context, targetUser, reason) {
    try {
      const targetMember = await context.guild.members.fetch(targetUser.id);
      const moderator = context.member ?? context.user;

      if (!targetMember.isCommunicationDisabled()) {
        return this.sendError(context, "This user is not currently timed out.");
      }

      await targetMember.timeout(null, reason);

      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle("🔊 User Timeout Removed")
        .setDescription(
          `**${
            targetUser.displayName || targetUser.username
          }** has been unmuted`
        )
        .addFields(
          { name: "User", value: `${targetUser.username}`, inline: true },
          { name: "User ID", value: `\`${targetUser.id}\``, inline: true },
          {
            name: "Moderator",
            value: `${moderator.user?.username ?? moderator.username}`,
            inline: true,
          },
          { name: "Reason", value: `\`\`\`${reason}\`\`\``, inline: false }
        )
        .setThumbnail(targetUser.displayAvatarURL({ size: 64 }))
        .setFooter({
          text: `Action performed by ${
            context.user?.username ?? context.author.username
          }`,
          iconURL: (context.user ?? context.author).displayAvatarURL({
            size: 32,
          }),
        })
        .setTimestamp();

      const reply = { embeds: [embed] };

      if (context.deferred || context.replied) {
        return context.editReply(reply);
      }
      return context.reply(reply);
    } catch (error) {
      this.container.logger.error("Error in unmute command:", error);
      return this.sendError(
        context,
        "An error occurred while trying to remove the timeout."
      );
    }
  }

  async sendError(context, message) {
    const reply = { content: `❌ ${message}`, ephemeral: true };

    if (context.deferred || context.replied) {
      return context.editReply(reply);
    }
    return context.reply(reply);
  }
}

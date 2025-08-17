import { Command } from "@sapphire/framework";
import { EmbedBuilder, PermissionFlagsBits } from "discord.js";

export class MuteCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "mute",
      aliases: ["timeout"],
      description: "Timeout a user for a specified duration",
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
            .setDescription("The user to mute")
            .setRequired(true)
        )
        .addIntegerOption((option) =>
          option
            .setName("duration")
            .setDescription("Duration in minutes (1-10080, default: 10)")
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(10080)
        )
        .addStringOption((option) =>
          option
            .setName("reason")
            .setDescription("Reason for the mute")
            .setRequired(false)
        )
    );
  }

  async chatInputRun(interaction) {
    const targetUser = interaction.options.getUser("user");
    const duration = interaction.options.getInteger("duration") ?? 10;
    const reason =
      interaction.options.getString("reason") ?? "No reason provided";

    return this.muteUser(interaction, targetUser, duration, reason);
  }

  async messageRun(message, args) {
    const targetUser = await args.pick("user");
    const duration = await args.pick("integer").catch(() => 10);
    const reason = await args.rest("string").catch(() => "No reason provided");

    return this.muteUser(message, targetUser, duration, reason);
  }

  async muteUser(context, targetUser, duration, reason) {
    try {
      const targetMember = await context.guild.members.fetch(targetUser.id);
      const moderator = context.member ?? context.user;

      // Validation checks
      if (!targetMember.moderatable) {
        return this.sendError(
          context,
          "I cannot timeout this user. They may have higher permissions than me."
        );
      }

      if (
        targetMember.roles.highest.position >=
          moderator.roles.highest.position &&
        context.guild.ownerId !== moderator.id
      ) {
        return this.sendError(
          context,
          "You cannot timeout someone with equal or higher permissions."
        );
      }

      if (duration < 1 || duration > 10080) {
        return this.sendError(
          context,
          "Duration must be between 1 and 10080 minutes (7 days)."
        );
      }

      // Apply timeout
      const timeoutDuration = duration * 60 * 1000;
      await targetMember.timeout(timeoutDuration, reason);

      // Success embed
      const embed = new EmbedBuilder()
        .setColor(0xff9900)
        .setTitle("🔇 User Timed Out")
        .setDescription(
          `**${
            targetUser.displayName || targetUser.username
          }** has been timed out for ${duration} minutes`
        )
        .addFields(
          { name: "User", value: `${targetUser.username}`, inline: true },
          { name: "User ID", value: `\`${targetUser.id}\``, inline: true },
          { name: "Duration", value: `\`${duration} minutes\``, inline: true },
          {
            name: "Moderator",
            value: `${moderator.user?.username ?? moderator.username}`,
            inline: true,
          },
          {
            name: "Expires",
            value: `<t:${Math.floor(
              (Date.now() + duration * 60 * 1000) / 1000
            )}:R>`,
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
      this.container.logger.error("Error in mute command:", error);
      return this.sendError(
        context,
        "An error occurred while trying to timeout the user."
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

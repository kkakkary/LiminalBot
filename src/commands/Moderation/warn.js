import { Command } from "@sapphire/framework";
import { EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { database } from "#lib/database.js";

export class WarnCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "warn",
      description: "Warning system commands",
      requiredUserPermissions: [PermissionFlagsBits.ModerateMembers],
      requiredClientPermissions: [PermissionFlagsBits.SendMessages],
    });
  }

  registerApplicationCommands(registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addSubcommand((subcommand) =>
          subcommand
            .setName("add")
            .setDescription("Add a warning to a user")
            .addUserOption((option) =>
              option
                .setName("user")
                .setDescription("The user to warn")
                .setRequired(true)
            )
            .addStringOption((option) =>
              option
                .setName("reason")
                .setDescription("Reason for the warning")
                .setRequired(true)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("list")
            .setDescription("List warnings for a user")
            .addUserOption((option) =>
              option
                .setName("user")
                .setDescription("The user to check warnings for")
                .setRequired(true)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("remove")
            .setDescription("Remove a specific warning by ID")
            .addIntegerOption((option) =>
              option
                .setName("id")
                .setDescription("The warning ID to remove")
                .setRequired(true)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("clear")
            .setDescription("Clear all warnings for a user")
            .addUserOption((option) =>
              option
                .setName("user")
                .setDescription("The user to clear warnings for")
                .setRequired(true)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("recent")
            .setDescription("Show recent warnings in this server")
            .addIntegerOption((option) =>
              option
                .setName("limit")
                .setDescription("Number of warnings to show (default: 10)")
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(25)
            )
        )
    );
  }

  async chatInputRun(interaction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case "add":
        return this.handleAdd(interaction);
      case "list":
        return this.handleList(interaction);
      case "remove":
        return this.handleRemove(interaction);
      case "clear":
        return this.handleClear(interaction);
      case "recent":
        return this.handleRecent(interaction);
      default:
        return interaction.reply({
          content: "❌ Unknown subcommand.",
          ephemeral: true,
        });
    }
  }

  async handleAdd(interaction) {
    const user = interaction.options.getUser("user");
    const reason = interaction.options.getString("reason");

    try {
      // Check if trying to warn themselves
      if (user.id === interaction.user.id) {
        return interaction.reply({
          content: "❌ You cannot warn yourself.",
          ephemeral: true,
        });
      }

      // Check if trying to warn a bot
      if (user.bot) {
        return interaction.reply({
          content: "❌ You cannot warn bots.",
          ephemeral: true,
        });
      }

      // Check if trying to warn someone with higher permissions
      const targetMember = await interaction.guild.members
        .fetch(user.id)
        .catch(() => null);
      if (
        targetMember &&
        targetMember.roles.highest.position >=
          interaction.member.roles.highest.position
      ) {
        return interaction.reply({
          content:
            "❌ You cannot warn someone with equal or higher permissions.",
          ephemeral: true,
        });
      }

      // Add warning to database
      const warning = await database.addWarning(
        user.id,
        interaction.guild.id,
        interaction.user.id,
        reason
      );

      // Get total warning count
      const totalWarnings = await database.getWarningCount(
        user.id,
        interaction.guild.id
      );

      // Create warning embed
      const embed = new EmbedBuilder()
        .setColor(0xff9900)
        .setTitle("⚠️ Warning Issued")
        .setDescription(
          `**${user.displayName || user.username}** has received a warning`
        )
        .addFields(
          { name: "User", value: `${user.username}`, inline: true },
          { name: "User ID", value: `\`${user.id}\``, inline: true },
          {
            name: "Warning Count",
            value: `\`${totalWarnings}\``,
            inline: true,
          },
          {
            name: "Moderator",
            value: `${interaction.user.username}`,
            inline: true,
          },
          { name: "Warning ID", value: `\`${warning.id}\``, inline: true },
          {
            name: "Date",
            value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
            inline: true,
          },
          { name: "Reason", value: `\`\`\`${reason}\`\`\``, inline: false }
        )
        .setThumbnail(user.displayAvatarURL({ size: 64 }))
        .setFooter({
          text: `Action performed by ${interaction.user.username}`,
          iconURL: interaction.user.displayAvatarURL({ size: 32 }),
        })
        .setTimestamp();

      // Send DM to warned user
      try {
        const userEmbed = new EmbedBuilder()
          .setColor(0xff9900)
          .setTitle(`⚠️ Warning Received`)
          .setDescription(
            `You have been warned in **${interaction.guild.name}**`
          )
          .addFields(
            { name: "Reason", value: `\`\`\`${reason}\`\`\``, inline: false },
            {
              name: "Moderator",
              value: `${interaction.user.username}`,
              inline: true,
            },
            {
              name: "Total Warnings",
              value: `\`${totalWarnings}\``,
              inline: true,
            },
            { name: "Server", value: `${interaction.guild.name}`, inline: true }
          )
          .setThumbnail(interaction.guild.iconURL({ size: 64 }))
          .setFooter({
            text: "Please follow the server rules to avoid further action",
          })
          .setTimestamp();

        await user.send({ embeds: [userEmbed] });
        embed.addFields({
          name: "User Notification",
          value: "✅ User has been notified via DM",
          inline: false,
        });
      } catch (error) {
        embed.addFields({
          name: "User Notification",
          value: "❌ Could not send DM to user",
          inline: false,
        });
      }

      // Check for automatic actions based on warning count
      if (totalWarnings >= 3 && targetMember) {
        try {
          const timeoutDuration = this.getTimeoutDuration(totalWarnings);
          await targetMember.timeout(
            timeoutDuration,
            `Automatic timeout: ${totalWarnings} warnings`
          );
          embed.addFields({
            name: "Automatic Action",
            value: `🔇 User automatically timed out for ${
              timeoutDuration / (60 * 1000)
            } minutes`,
            inline: false,
          });
        } catch (error) {
          embed.addFields({
            name: "Automatic Action",
            value: "❌ Could not apply automatic timeout",
            inline: false,
          });
        }
      }

      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      this.container.logger.error("Error adding warning:", error);
      return interaction.reply({
        content: "❌ An error occurred while adding the warning.",
        ephemeral: true,
      });
    }
  }

  async handleList(interaction) {
    const user = interaction.options.getUser("user");

    try {
      const warnings = await database.getUserWarnings(
        user.id,
        interaction.guild.id
      );

      if (warnings.length === 0) {
        const embed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle(`📋 Warnings for ${user.username}`)
          .setDescription("✅ This user has no active warnings.")
          .setThumbnail(user.displayAvatarURL());

        return interaction.reply({ embeds: [embed] });
      }

      const embed = new EmbedBuilder()
        .setColor(0xff9900)
        .setTitle(`📋 Warnings for ${user.username}`)
        .setDescription(`Total active warnings: **${warnings.length}**`)
        .setThumbnail(user.displayAvatarURL());

      // Add warning fields (limit to 10 most recent)
      const recentWarnings = warnings.slice(0, 10);
      recentWarnings.forEach((warning, index) => {
        const date = new Date(warning.created_at);
        embed.addFields({
          name: `Warning #${index + 1} (ID: ${warning.id})`,
          value: `**Reason:** ${warning.reason}\n**Date:** <t:${Math.floor(
            date.getTime() / 1000
          )}:F>\n**Moderator:** <@${warning.moderator_id}>`,
          inline: false,
        });
      });

      if (warnings.length > 10) {
        embed.setFooter({ text: `Showing 10 of ${warnings.length} warnings` });
      }

      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      this.container.logger.error("Error listing warnings:", error);
      return interaction.reply({
        content: "❌ An error occurred while fetching warnings.",
        ephemeral: true,
      });
    }
  }

  async handleRemove(interaction) {
    const warningId = interaction.options.getInteger("id");

    try {
      // Check if warning exists and belongs to this guild
      const warning = await database.getWarningById(warningId);

      if (!warning) {
        return interaction.reply({
          content: "❌ Warning not found.",
          ephemeral: true,
        });
      }

      if (warning.guild_id !== interaction.guild.id) {
        return interaction.reply({
          content: "❌ Warning not found in this server.",
          ephemeral: true,
        });
      }

      if (!warning.active) {
        return interaction.reply({
          content: "❌ This warning has already been removed.",
          ephemeral: true,
        });
      }

      // Remove the warning
      await database.removeWarning(warningId);

      const user = await this.container.client.users
        .fetch(warning.user_id)
        .catch(() => null);
      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle("✅ Warning Removed")
        .addFields(
          { name: "Warning ID", value: `${warningId}`, inline: true },
          {
            name: "User",
            value: user ? `${user.tag}` : `<@${warning.user_id}>`,
            inline: true,
          },
          {
            name: "Removed By",
            value: `${interaction.user.tag}`,
            inline: true,
          },
          { name: "Original Reason", value: warning.reason, inline: false }
        )
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      this.container.logger.error("Error removing warning:", error);
      return interaction.reply({
        content: "❌ An error occurred while removing the warning.",
        ephemeral: true,
      });
    }
  }

  async handleClear(interaction) {
    const user = interaction.options.getUser("user");

    try {
      const clearedCount = await database.clearUserWarnings(
        user.id,
        interaction.guild.id
      );

      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle("🧹 Warnings Cleared")
        .addFields(
          { name: "User", value: `${user.tag}`, inline: true },
          { name: "Warnings Cleared", value: `${clearedCount}`, inline: true },
          { name: "Cleared By", value: `${interaction.user.tag}`, inline: true }
        )
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      this.container.logger.error("Error clearing warnings:", error);
      return interaction.reply({
        content: "❌ An error occurred while clearing warnings.",
        ephemeral: true,
      });
    }
  }

  async handleRecent(interaction) {
    const limit = interaction.options.getInteger("limit") || 10;

    try {
      const warnings = await database.getRecentWarnings(
        interaction.guild.id,
        limit
      );

      if (warnings.length === 0) {
        const embed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle("📋 Recent Warnings")
          .setDescription("✅ No recent warnings in this server.");

        return interaction.reply({ embeds: [embed] });
      }

      const embed = new EmbedBuilder()
        .setColor(0xff9900)
        .setTitle("📋 Recent Warnings")
        .setDescription(`Showing ${warnings.length} most recent warnings:`);

      for (const warning of warnings) {
        const date = new Date(warning.created_at);
        embed.addFields({
          name: `ID: ${warning.id}`,
          value: `**User:** <@${warning.user_id}>\n**Reason:** ${
            warning.reason
          }\n**Moderator:** <@${
            warning.moderator_id
          }>\n**Date:** <t:${Math.floor(date.getTime() / 1000)}:R>`,
          inline: true,
        });
      }

      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      this.container.logger.error("Error fetching recent warnings:", error);
      return interaction.reply({
        content: "❌ An error occurred while fetching recent warnings.",
        ephemeral: true,
      });
    }
  }

  getTimeoutDuration(warningCount) {
    // Escalating timeout durations based on warning count
    const durations = {
      3: 10 * 60 * 1000, // 10 minutes
      4: 30 * 60 * 1000, // 30 minutes
      5: 60 * 60 * 1000, // 1 hour
      6: 6 * 60 * 60 * 1000, // 6 hours
      7: 12 * 60 * 60 * 1000, // 12 hours
      8: 24 * 60 * 60 * 1000, // 24 hours
    };

    return durations[warningCount] || durations[8];
  }
}

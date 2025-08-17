import { neon } from "@neondatabase/serverless";

// Database connection
const sql = neon(process.env.DATABASE_URL);

export class Database {
  constructor() {
    this.sql = sql;
  }

  async init() {
    try {
      console.log("🔄 Initializing database...");

      // Drop and recreate the table to ensure correct schema
      await this.sql`DROP TABLE IF EXISTS warnings`;

      // Create warnings table with correct schema
      await this.sql`
        CREATE TABLE warnings (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          guild_id TEXT NOT NULL,
          moderator_id TEXT NOT NULL,
          reason TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          active BOOLEAN DEFAULT TRUE
        )
      `;

      // Create index for faster queries
      await this.sql`
        CREATE INDEX idx_warnings_user_guild 
        ON warnings(user_id, guild_id, active)
      `;

      console.log("✅ Database initialized successfully");
    } catch (error) {
      console.error("❌ Database initialization failed:", error);
      throw error;
    }
  }

  // Add a warning
  async addWarning(userId, guildId, moderatorId, reason) {
    try {
      const result = await this.sql`
        INSERT INTO warnings (user_id, guild_id, moderator_id, reason)
        VALUES (${userId}, ${guildId}, ${moderatorId}, ${reason})
        RETURNING id, created_at
      `;
      return result[0];
    } catch (error) {
      console.error("Error adding warning:", error);
      throw error;
    }
  }

  // Get all active warnings for a user in a guild
  async getUserWarnings(userId, guildId) {
    try {
      const result = await this.sql`
        SELECT * FROM warnings 
        WHERE user_id = ${userId} 
        AND guild_id = ${guildId} 
        AND active = TRUE
        ORDER BY created_at DESC
      `;
      return result;
    } catch (error) {
      console.error("Error getting user warnings:", error);
      throw error;
    }
  }

  // Get warning count for a user in a guild
  async getWarningCount(userId, guildId) {
    try {
      const result = await this.sql`
        SELECT COUNT(*) as count FROM warnings 
        WHERE user_id = ${userId} 
        AND guild_id = ${guildId} 
        AND active = TRUE
      `;
      return parseInt(result[0].count);
    } catch (error) {
      console.error("Error getting warning count:", error);
      throw error;
    }
  }

  // Remove a specific warning by ID
  async removeWarning(warningId) {
    try {
      const result = await this.sql`
        UPDATE warnings 
        SET active = FALSE 
        WHERE id = ${warningId}
        RETURNING *
      `;
      return result[0];
    } catch (error) {
      console.error("Error removing warning:", error);
      throw error;
    }
  }

  // Clear all warnings for a user in a guild
  async clearUserWarnings(userId, guildId) {
    try {
      const result = await this.sql`
        UPDATE warnings 
        SET active = FALSE 
        WHERE user_id = ${userId} 
        AND guild_id = ${guildId} 
        AND active = TRUE
        RETURNING COUNT(*)
      `;
      return result.length;
    } catch (error) {
      console.error("Error clearing user warnings:", error);
      throw error;
    }
  }

  // Get recent warnings across the guild (for moderation overview)
  async getRecentWarnings(guildId, limit = 10) {
    try {
      const result = await this.sql`
        SELECT * FROM warnings 
        WHERE guild_id = ${guildId} 
        AND active = TRUE
        ORDER BY created_at DESC 
        LIMIT ${limit}
      `;
      return result;
    } catch (error) {
      console.error("Error getting recent warnings:", error);
      throw error;
    }
  }

  // Get warning by ID
  async getWarningById(warningId) {
    try {
      const result = await this.sql`
        SELECT * FROM warnings 
        WHERE id = ${warningId}
      `;
      return result[0];
    } catch (error) {
      console.error("Error getting warning by ID:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const database = new Database();

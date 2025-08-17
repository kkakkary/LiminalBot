import { Listener } from "@sapphire/framework";

const dev = process.env.NODE_ENV !== "production";

export class UserEvent extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: true,
      event: "ready",
    });
  }

  run(client) {
    const { username, id } = client.user;
    const guilds = client.guilds.cache.size;
    const users = client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);

    this.container.logger.info(`
🤖 Bot Ready!
${dev ? "🔧 Development Mode" : "🚀 Production Mode"}
👤 ${username} (${id})
🏠 ${guilds} guild${guilds === 1 ? "" : "s"} - ${users} user${
      users === 1 ? "" : "s"
    }
`);
  }
}
import { Listener } from "@sapphire/framework";

const dev = process.env.NODE_ENV !== "production";

export class UserEvent extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: true,
      event: "ready",
    });
  }

  run(client) {
    const { username, id } = client.user;
    const guilds = client.guilds.cache.size;
    const users = client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);

    this.container.logger.info(`
🤖 Bot Ready!
${dev ? "🔧 Development Mode" : "🚀 Production Mode"}
👤 ${username} (${id})
🏠 ${guilds} guild${guilds === 1 ? "" : "s"} - ${users} user${
      users === 1 ? "" : "s"
    }
`);
  }
}

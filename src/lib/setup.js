import {
  ApplicationCommandRegistries,
  RegisterBehavior,
} from "@sapphire/framework";
import { config } from "dotenv";

// Load environment variables
config();

// Set default behavior to bulk overwrite
ApplicationCommandRegistries.setDefaultBehaviorWhenNotIdentical(
  RegisterBehavior.BulkOverwrite
);

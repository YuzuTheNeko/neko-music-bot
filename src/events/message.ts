import { Message } from "discord.js";
import NekoClient from "../structures/Client";
import Command from "../structures/Command";

export default function(client: NekoClient, message: Message) {
    Command.handle(client, message)
}
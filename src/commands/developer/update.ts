import { Message } from "discord.js";
import Command from "../../structures/Command";
import { execSync } from "child_process" 
export default new Command({
    name: "update",
    description: "updates bot commands.",
    execute: async (client, message) => {
        var msg: Message = await message.channel.send(`Compiling codes...`)

        try {
            await execSync("tsc")
        } catch (error) {
            msg.edit(`Failed to compile: ${error.message}`)   
        }

        client.manager.loadCommands(true)

        msg.edit(`Updated ${client.manager.commands.size} commands.`)
    }
})
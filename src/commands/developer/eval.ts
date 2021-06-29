import Command from "../../structures/Command";
import { inspect } from "util";

export default new Command({
    name: "eval",
    description: "a eval command.",
    args: [
        {
            name: "code",
            required: true,
            description: "the code to execute.",
            type: "STRING",
            example: "function gay() { return \"luna\" }"
        }
    ],
    execute: async (client, message, args, command, extras) => {
        const depth = extras.flags.depth ? Number(extras.flags.depth) || Infinity : 0 
 
        try {
            var evaled = await eval(args.join(" "))
        } catch (error) {
            evaled = error.stack 
        }

        if (typeof evaled === "object") evaled = inspect(evaled, { depth })

        message.channel.send(`\`\`\`js\n${evaled?.toString?.() ?? evaled}\`\`\``).catch(err => {
            message.channel.send(`\`\`\`js\n${err.message}\`\`\``)
        })
    }
})
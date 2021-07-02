import Command from "../../structures/Command";

export default new Command({
    name: "idk",
    description: "idk",
    prompt: {
        retries: 1,
        timeout: 30000
    },
    args: [
        {
            name: "target",
            description: "member to kick",
            type: "MEMBER",
            required: true,
            example: "@Ruben"
        },
        {
            name: "reason",
            description: "reason for kicking this guy",
            type: "STRING",
            required: false,
            example: "idk"
        }
    ],
    execute: async (client, message, args) => {
        console.log(args)
    }
})
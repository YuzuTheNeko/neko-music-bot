import Command from "../../structures/Command"

export default new Command({
    name: "idk",
    args: [
        {
            name: "duration",
            type: "TIME",
            description: "the duration",
            required: true
        }
    ],
    description: "",
    execute: async (client, message, args) => {
        console.log(args)
    }
})
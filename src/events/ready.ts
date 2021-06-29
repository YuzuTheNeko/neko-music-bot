import { mkdirSync, rmdirSync } from "fs";
import NekoClient from "../structures/Client";

export default function(client: NekoClient) {
    client.manager.loadCommands()

    //perform song cache deletion
    rmdirSync("./songs", { recursive: true })
    mkdirSync("./songs")

    console.log(`Ready on client ${client.user?.tag} and loaded ${client.manager.commands.size} commands!`)   
}
import { Client, ClientOptions } from "discord.js";
import Manager from "./Manager";

export default class NekoClient extends Client {
    manager: Manager
    
    constructor(options: ClientOptions) {
        super(options)

        this.manager = new Manager(this)
    }
}
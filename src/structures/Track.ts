import { User } from "discord.js";
import { TrackData } from "../typings/typings";
import GuildAudioPlayer from "./GuildAudioPlayer";

export default class Track {
    audio: GuildAudioPlayer
    data: TrackData
    user?: User

    constructor(track: TrackData, audio: GuildAudioPlayer, user?: User) {
        this.audio = audio
        this.data = track
        
        if (user) this.user = user
    }
}
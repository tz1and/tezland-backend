import { Room, Client } from "@colyseus/core";
import { ChatMessage, Player, tz1RoomState } from "./tz1RoomState";


function containsURL(msg: string): boolean {
    //const urlCheck = /((ht|f)tp(s)?:\/\/)?(w{0,3}\.)?([a-zA-Z0-9_]*@)?([a-zA-Z0-9_\-\.\:\#\/\~\}]+(\.[a-zA-Z]*){2,}|localhost)(:[1-9][0-9]*)?(\/[a-zA-Z0-9_\-\.\:\#\/\~\}]*)?(\?[a-zA-Z0-9_=&-]*)?/gi;
    const urlCheck = /[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi
    const matches = msg.match(urlCheck);
    if (matches && matches.length > 0) return true;
    return false
}

export class tz1Room extends Room<tz1RoomState> {
    maxClients = 128;

    onCreate(options: any) {
        console.log("tz1Room created.", options);
        this.setState(new tz1RoomState());

        this.onMessage("updatePosition", (client, data) => {
            //console.log("update received -> ");
            //console.debug(JSON.stringify(data));
            const player = this.state.players.get(client.sessionId);
            if(player) {
                player.x = data["x"];
                player.y = data['y'];
                player.z = data["z"];

                player.rot_x = data["rot_x"];
                player.rot_y = data['rot_y'];
                player.rot_z = data["rot_z"];
            }
        });

        this.onMessage("updateName", (client, data) => {
            //console.log("update received -> ");
            //console.debug(JSON.stringify(data));
            const player = this.state.players.get(client.sessionId);
            if(player) {
                const oldName = player.name;
                player.name = data['name'];

                if(oldName === "") this.broadcast("messages", {from: null, msg:`${player.name} joined.`} as ChatMessage);
                else this.broadcast("messages", {from: null, msg:`${oldName} is now ${player.name}.`} as ChatMessage);
            }
        });

        this.onMessage<string>("message", (client, message) => {
            console.log("tz1Room received message from", client.sessionId, ":", message);
            const player = this.state.players.get(client.sessionId);
            if(player) {
                if (containsURL(message)) {
                    client.send("messages", {from: null, msg: `Rejeted message, contains URL: '${message}'`} as ChatMessage);
                }
                else {
                    this.broadcast("messages", {from: player.name, msg: message} as ChatMessage);
                }
            }
        });
    }

    onJoin(client: Client, options: any) {
        console.log(client.sessionId, "joined!");

        // create Player instance
        const player = new Player();

        this.state.players.set(client.sessionId, player);

        console.log("new player =>", player.toJSON());
    }

    onLeave(client: Client, consented: boolean) {
        const player = this.state.players.get(client.sessionId);
        if(player) {
            if(player.name !== "") this.broadcast("messages", {from: null, msg:`${player.name} left.`} as ChatMessage);
            else this.broadcast("messages", {from: null, msg:`Unknown user left.`} as ChatMessage);
        }

        this.state.players.delete(client.sessionId);
        console.log(client.sessionId, "left!");
    }

    onDispose() {
        console.log("room", this.roomId, "disposing...");
    }
}
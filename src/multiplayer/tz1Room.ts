import { Room, Client } from "@colyseus/core";
import { Player, tz1RoomState } from "./tz1RoomState";

export class tz1Room extends Room<tz1RoomState> {
    maxClients = 5;

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
                player.name = data['name'];
            }
        });
    }

    onJoin(client: Client, options: any) {
        console.log(client.sessionId, "joined!");

        // create Player instance
        const player = new Player();

        // place player in the map of players by its sessionId
        // (client.sessionId is unique per connection!)
        this.state.players.set(client.sessionId, player);

        console.log("new player =>", player.toJSON());
    }

    onLeave(client: Client, consented: boolean) {
        this.state.players.delete(client.sessionId);
        console.log(client.sessionId, "left!");
    }

    onDispose() {
        console.log("room", this.roomId, "disposing...");
    }
}
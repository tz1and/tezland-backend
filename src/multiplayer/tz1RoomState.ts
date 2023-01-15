import { MapSchema, Schema, type } from "@colyseus/schema";

export class Player extends Schema {
    @type("number") x: number = 0;
    @type("number") y: number = 0;
    @type("number") z: number = 0;

    @type("number") rot_x: number = 0;
    @type("number") rot_y: number = 0;
    @type("number") rot_z: number = 0;

    @type("string") name: string = "Guest";
}


export class tz1RoomState extends Schema {
    @type({ map: Player }) players = new MapSchema<Player>();
}
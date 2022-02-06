import cluster from 'cluster';
import WebSocket from 'ws';
import process from 'process';
import assert from 'assert';
import WebsocketConfig from './WebsocketConfig';
import { isDev } from './utils/Utils';
import { performance } from 'perf_hooks';

if(!isDev()) assert(!cluster.isPrimary);

const UpdateInterval = 100;
const ws = new WebSocket.Server({ port: WebsocketConfig.WEBSOCKET_SERVER_PORT, perMessageDeflate: true/*, maxPayload: WorkerConfig.appserver_max_payload*/ });

class User {
    readonly conn: WebSocket;

    public name: string = "";

    private _connected: boolean;
    public get connected() { return this._connected; }

    //public pos: Float32Array = Float32Array.of(0,0,0);
    //public rot: Float32Array = Float32Array.of(0,0,0);
    public transformData: string = '0'.repeat(48);

    constructor(conn: WebSocket) {
        this.conn = conn;
        this._connected = false;
    }

    public generateChallenge() {
        return "ohyoujustcomein";
    }

    public authenticate(response: string) {
        // TODO: validate signature if not guest.
        if(response !== "OK") throw new Error("Auth: challenge failed");

        this._connected = true;
        clients.add(this);
    }

    public disconnect() {
        if(this._connected) {
            clients.delete(this);
            disconnects.add(this.name);
        }

        this._connected = false;
        assert(!clients.has(this));
    }
}

const clients: Set<User> = new Set();
const disconnects: Set<string> = new Set();

async function handleRequest(req: any, user: User): Promise<any> {
    if (req.msg === "hello") {
        user.name = req.user;
        return { msg: "challenge", challenge: user.generateChallenge() };
    } else if (req.msg === "challenge-response") {
        user.authenticate(req.response);
        return { msg: "authenticated" };
    } else {
        // For all other requests, user has to be "authenticated"
        // as guest or account with wallet.
        if (!user.connected) throw Error("User needs to authenticate");

        if (req.msg === "upd") {
            assert(req.upd.length === 48);
            user.transformData = req.upd;
            // update pos doesn't respond.
            return;
        }
    }

    // fallthrough, send error and disconnect.
    throw Error("Unknown request type");
}

ws.on('connection', function connection(conn) {
    console.log(`New connection on websocket worker ${process.pid}`);

    const user = new User(conn);

    conn.on('message', async function incoming(message) {
        //console.log('received: %s', message);

        try {
            const req = JSON.parse(message.toString());

            const res = await handleRequest(req, user);
            if (res) conn.send(JSON.stringify(res));
        } catch(e) {
            const res = { msg: "error", desc: `While handling request: ${e}. Closing.` };
            conn.send(JSON.stringify(res));
            conn.close();
        }
    });

    conn.on('close', function incoming(code, reason) {
        user.disconnect();
        console.log('Connection closed: %s, %s', code, reason);
    });
});


function serverTick() {
    if(clients.size === 0) return;

    //const start_time = performance.now();
    
    // TODO: type this
    const positons: any = { msg: "position-updates", updates: [] }

    disconnects.forEach((dc) => {
        const upd: any = {};
        upd.name = dc;
        upd.dc = true;
        //upd.pos = c.pos;
        //upd.rot = c.rot;
        positons.updates.push(upd);
    })

    disconnects.clear();

    clients.forEach((c) => {
        // to be safe, but shouldn't be needed.
        if(!c.connected) return;

        // TODO: type this.
        const upd: any = {};
        upd.name = c.name;
        upd.upd = c.transformData;
        //upd.pos = c.pos;
        //upd.rot = c.rot;
        positons.updates.push(upd);
    })

    const response = JSON.stringify(positons);

    clients.forEach((c) => {
        c.conn.send(response);
    })

    //const elapsed = performance.now() - start_time;
    //console.log(`update sending update took: ${elapsed}ms`);
}

setInterval(serverTick, UpdateInterval);

console.log(`WebSocket worker ${process.pid} started`);
import cluster from 'cluster';
import WebSocket from 'ws';
import process from 'process';
import assert from 'assert';
import WebsocketConfig from './WebsocketConfig';
import { isDev } from './utils/Utils';

if(!isDev()) assert(!cluster.isPrimary);

const UpdateInterval = 500;
const ws = new WebSocket.Server({ port: WebsocketConfig.WEBSOCKET_SERVER_PORT, perMessageDeflate: true/*, maxPayload: WorkerConfig.appserver_max_payload*/ });

class User {
    readonly conn: WebSocket;
    public name: string = "";
    public connected: boolean;
    //public pos: Float32Array = Float32Array.of(0,0,0);
    //public rot: Float32Array = Float32Array.of(0,0,0);
    public transformData: string = '0'.repeat(48);

    constructor(conn: WebSocket) {
        this.conn = conn;
        this.connected = false;
    }
}

const clients: Set<User> = new Set();
const disconnects: Set<string> = new Set();

async function handleRequest(req: any, user: User): Promise<any> {
    if (req.msg === "hello") {
        user.name = req.user;
        return { msg: "challenge", challenge: "ohyoujustcomein"/*user.generateChallenge() TODO */ };
    } else if (req.msg === "challenge-response") {
        // TODO
        /*user.authenticate(web3, req.response);
        if(user.authenticated)*/
        user.connected = true;
        clients.add(user);
        return { msg: "authenticated" };
        //else return { msg: "auth-failed" };
    } else {
        // For all other requests, user has to be authenticated
        //if (!user.authenticated) return { msg: "auth-error" };
        if (!user.connected) throw Error("handshake failed");

        if (req.msg === "upd") {
            assert(req.upd.length === 48);
            user.transformData = req.upd;
            // update pos doesn't respond.
            return;
        }
        /*else if (req.msg = "req-balances") {
            return { msg: "res-balances", tokens: [] };
        }*/
    }

    return { msg: "error" };
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
            const res = { msg: "error", desc: `Failed to handle request, closing: ${e}` };
            conn.send(JSON.stringify(res));
            conn.close();
        }
    });

    conn.on('close', function incoming(code, reason) {
        clients.delete(user);
        disconnects.add(user.name);
        console.log('Connection closed: %s, %s', code, reason);
    });
});


function sendAll() {
    if(clients.size === 0) return;
    
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
        // to be save, but shouldn't be needed.
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
}

setInterval(sendAll, UpdateInterval);

console.log(`WebSocket worker ${process.pid} started`);
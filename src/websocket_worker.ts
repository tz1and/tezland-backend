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
    //public pos: Float32Array = Float32Array.of(0,0,0);
    //public rot: Float32Array = Float32Array.of(0,0,0);
    public transformData: string = '0'.repeat(48);

    constructor(conn: WebSocket) {
        this.conn = conn;
    }
}

const clients: Set<User> = new Set();

async function handleRequest(req: any, user: User): Promise<any> {
    if (req.msg === "hello") {
        user.name = req.user;
        return { msg: "challenge", challenge: "ohyoujustcomein"/*user.generateChallenge() TODO */ };
    } else if (req.msg === "challenge-response") {
        // TODO
        /*user.authenticate(web3, req.response);
        if(user.authenticated)*/
        return { msg: "authenticated" };
        //else return { msg: "auth-failed" };
    } else {
        // For all other requests, user has to be authenticated
        //if (!user.authenticated) return { msg: "auth-error" };
        // TODO
        //if (!user.authenticated) throw Error("Client not authenticated");

        if (req.msg === "upd") {
            assert(req.upd.length === 48);
            user.transformData = req.upd;
            //const pos: Float32Array = req.pos as Float32Array;
            //const rot: Float32Array = req.rot as Float32Array;
            //assert(pos.length === 3 && rot.length === 3);
            //
            //user.pos = pos;
            //user.rot = rot;
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
    clients.add(user);

    conn.on('message', async function incoming(message) {
        //console.log('received: %s', message);

        try {
            const req = JSON.parse(message.toString());

            const res = await handleRequest(req, user);
            conn.send(JSON.stringify(res));
        } catch(e) {
            const res = { msg: "error", desc: `Failed to handle request, closing: ${e}` };
            conn.send(JSON.stringify(res));
            conn.close();
        }
    });

    conn.on('close', function incoming(code, reason) {
        clients.delete(user);
        console.log('Connection closed: %s, %s', code, reason);
    });
});


function sendAll() {
    if(clients.size === 0) return;
    
    // TODO: type this
    const positons: any = { msg: "position-updates", updates: [] }

    clients.forEach((c) => {
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
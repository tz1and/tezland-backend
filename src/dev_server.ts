import { loadEnv } from './utils/Utils';

loadEnv(process.env.NODE_ENV!, './');

(() => {
    import('./express_worker');
    import('./websocket_worker');
    import('./gateway_worker');
})();
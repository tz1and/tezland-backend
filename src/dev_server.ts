import { config as dotenvFlowConfig } from 'dotenv-flow'
import { isDev } from './utils/Utils';
dotenvFlowConfig({ silent: !isDev() });

import './express_worker'
import './websocket_worker'
import './gateway_worker'
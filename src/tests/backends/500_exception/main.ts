
import { startBFFApp } from "../../../bff";
import config from './config.json'

process.chdir(__dirname);
startBFFApp(JSON.stringify(config))
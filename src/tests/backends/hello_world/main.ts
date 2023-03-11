
import { BFFApp } from "../../../bff";
import config from './config.json'

process.chdir(__dirname);
BFFApp(JSON.stringify(config))
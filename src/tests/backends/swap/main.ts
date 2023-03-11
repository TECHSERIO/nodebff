
import { startBFFApp } from "../../../bff";
import config from './config.json'

process.chdir(__dirname);
startBFFApp(JSON.stringify(config))
setTimeout(() => {
    fetch('http://127.0.0.1:3000/')
}, 4000)
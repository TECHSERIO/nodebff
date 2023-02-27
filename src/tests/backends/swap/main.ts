
import path from 'path'
import { main } from "../../../bff";
import config from './config.json'

main(path.join(__dirname, './config.json')) 

setTimeout(() => {
    fetch('http://127.0.0.1:3000/')
}, 4000)
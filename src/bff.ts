import * as https from 'https';
import * as http from 'http';
import express from 'express';
import vhost from 'vhost';
import fss, {promises as fs} from 'fs';
import helmet from 'helmet';
import proxy from 'express-http-proxy';
import bodyParser from "body-parser";
import path from "path";

export class HttpServer {
    static _servers: HttpServer[] = [];

    app: express.Express;
    baseRouter: express.Router;
    newBaseRouter: express.Router;

    private constructor(
        public address: string = '127.0.0.1',
        public port: number = 8080,
        public certificates: { key: string; cert: string } | null = null,
    ) {
    }

    private static async _CreateServer(address: string,
                                       port: number,
                                       certificates: { key: string; cert: string } | null = null,
    ): Promise<HttpServer> {
        const newServ = new HttpServer(address, port, certificates)

        newServ.app = express();
        newServ.baseRouter = express.Router();
        newServ.newBaseRouter = express.Router();

        newServ.app.use(helmet()); // Good when proxied? Time will tell.
        newServ.app.use((req, res, next) => {
            newServ.baseRouter(req, res, next);
        });

        HttpServer._servers.push(newServ);
        const startServ = async function (): Promise<HttpServer> {
            return new Promise((resolve, reject) => {
                if (newServ.certificates) {
                    const serv = https.createServer(newServ.certificates, newServ.app);
                    serv.on('error', (e) => {
                        reject(e)
                    })
                    serv.listen(newServ.port, newServ.address, () => {
                        console.log(`${newServ.address}:${newServ.port} listening on HTTPS`);
                        resolve(newServ)
                    });
                } else {
                    const serv = http.createServer(newServ.app)
                    serv.on('error', (e) => {
                        reject(e)
                    })
                    serv.listen(newServ.port, newServ.address, () => {
                        console.log(`${newServ.address}:${newServ.port} listening on HTTP`);
                        resolve(newServ)
                    });
                }
            });
        }
        return startServ();
    }

    private static async _EnsureServer(
        address: string,
        port: number,
        certificates: { key: string; cert: string } | null = null,
    ): Promise<HttpServer> {
        if (certificates) {
            if (!certificates.key) {
                throw Error(
                    `HttpServer._EnsureServer - for ${address}:${port}, certificates must contain a key.`,
                );
            }
            if (!certificates.cert) {
                throw Error(
                    `HttpServer._EnsureServer - for ${address}:${port}, certificates must contain a cert.`,
                );
            }
        }

        for (const server of HttpServer._servers) {
            if (server.address == address && server.port == port) {
                if (
                    (!certificates && server.certificates) ||
                    (certificates && !server.certificates)
                ) {
                    throw Error(
                        `HttpServer - Cannot open another server on ${address}:${port} with a different protocol or other certificate.`,
                    );
                }
            }
            if (server.address == address && server.port == port) {
                return server;
            }
        }

        let certificateData = null;
        if (certificates) {
            certificateData = {
                key: await fs.readFile(__dirname + certificates.key, 'utf8'),
                cert: await fs.readFile(__dirname + certificates.cert, 'utf8'),
            };
        }
        return HttpServer._CreateServer(address, port, certificateData);
    }

    static async GetNewBaseRouter(
        address: string,
        port: number,
        certificates: { key: string; cert: string } | null,
    ): Promise<express.Router> {
        const server = await HttpServer._EnsureServer(
            address,
            port,
            certificates,
        );
        return server.newBaseRouter;
    }

    static SwapInNewRouters(): void {
        for (const server of HttpServer._servers) {
            server.baseRouter = server.newBaseRouter;
            server.newBaseRouter = express.Router();
        }
    }

    static ResetNewRouters(): void {
        for (const server of HttpServer._servers) {
            server.newBaseRouter = express.Router();
        }
    }
}


export class Backend {

    constructor(
        public name: string,
        public routerBuilderFunc: (() => any) | null = null,
        public servers: any[] = []
    ) {
    }

    buildRouter() {
        let rbf: express.RequestHandler;
        if (this.routerBuilderFunc) {
            rbf = this.routerBuilderFunc();
        } else {
            const getRandomHost = () => {
                const hostIndex = Math.floor(Math.random() * this.servers.length);
                return this.servers[hostIndex];
            };
            rbf = proxy(getRandomHost, {memoizeHost: false});
        }
        return rbf;
    }

}

export class Frontend {
    constructor(
        public name: string,
        public address: string,
        public port: number,
        public certificates: { key: string; cert: string },
        public hostname: string,
        public uri_path_prefix: string = '/',
        public backend: string = ''
    ) {
    }
}


export class BFFConfig {
    //filename: string;
    private backends: Backend[];
    private frontends: Frontend[];
    private configAsJSON: string;

    constructor(configAsJSON: string) {
        this.configAsJSON = configAsJSON
        this.backends = [];
        this.frontends = [];
    }

    public async loadConfig() {

        HttpServer.ResetNewRouters()

        const config = JSON.parse(this.configAsJSON)

        this.loadBackends(config)
        this.loadFrontends(config)

        let baseRouterFrontendsMap = new Map() // Mapping HttpServer base-routers to a list of frontends using this router.

        for (const fe of this.frontends) {

            const baseRouter = await HttpServer.GetNewBaseRouter(fe.address, fe.port, fe.certificates);

            if (!baseRouterFrontendsMap.has(baseRouter)) {
                baseRouterFrontendsMap.set(baseRouter, [fe]);
            } else {
                const a = baseRouterFrontendsMap.get(baseRouter);
                a.push(fe);
            }

        }

        // Mapping hostname to an object
        const hostNameMap: any = {};

        for (const [baseRouter, frontends] of baseRouterFrontendsMap.entries()) {
            const frontendsOnOriginalRouter = [];

            for (const frontend of frontends) {
                if (!frontend.hostname) {
                    frontendsOnOriginalRouter.push(frontend);
                } else {
                    if (!hostNameMap[frontend.hostname]) {
                        const vHostRouter = express.Router();
                        hostNameMap[frontend.hostname] = {
                            baseRouter: baseRouter,
                            vHostRouter: vHostRouter,
                            frontends: [frontend]
                        };
                        baseRouter.use(vhost(frontend.hostname, vHostRouter));
                    } else {
                        if (hostNameMap[frontend.hostname].baseRouter != baseRouter) {
                            throw Error(`BFFConfig.loadConfig() - Hostname ${frontend.hostname} defined for different HttpServer's (baseRouters)`);
                        }
                        hostNameMap[frontend.hostname].frontends.push(frontend);
                    }
                }
            }

            baseRouterFrontendsMap.set(baseRouter, frontendsOnOriginalRouter);
        }

        // Now combining all routers from baseRouterFrontendsMap and hostNameMap to a new flat <router> = [<list of frontends>] map
        let routerFrontendsMap = baseRouterFrontendsMap;
        baseRouterFrontendsMap = null;

        for (const hostname in hostNameMap) {
            const vhostStructure = hostNameMap[hostname];
            routerFrontendsMap.set(vhostStructure.vHostRouter, vhostStructure.frontends);
        }

        const backendByName = (name: string) => {
            for (const backend of this.backends) {
                if (backend.name === name) {
                    return backend;
                }
            }
            return null;
        };

        // Now add all backend-routers based on their frontend to the routers in routerFrontendsMap
        for (const [router, frontends] of routerFrontendsMap.entries()) {

            // We sort the frontends on their uri_path_prefix from longest to shortest, to get more specific first.
            frontends.sort((fe1: Frontend, fe2: Frontend) => fe2.uri_path_prefix.length - fe1.uri_path_prefix.length);

            for (const frontend of frontends) {
                if (frontend.uri_path_prefix.length > 0) {
                    router.use(frontend.uri_path_prefix, backendByName(frontend.backend).buildRouter());
                } else {
                    router.use(backendByName(frontend.backend).buildRouter());
                }
            }

        }

        // finally swap in this new config into all the HttpServer's to activate it.
        HttpServer.SwapInNewRouters();

    }

    loadBackends(config: any) {
        for (const [bName, bConf] of Object.entries(<Backend>config.backends)) {

            console.log(`Backend name: ${bName}`);

            if (bConf.require) {
                this.backends.push(new Backend(bName, (require(path.join(process.cwd(), bConf.require))).buildRouter));
            } else if (bConf.servers) {
                this.backends.push(new Backend(bName, null, bConf.servers));
            } else {
                console.log(`BFFConfig.loadBackends() - no file or servers specified for ${bName}`);
            }
        }
    }

    loadFrontends(config: any) {
        for (const [fName, fConf] of Object.entries(<Frontend>config.frontends)) {
            this.frontends.push(new Frontend(fName, fConf.address, fConf.port, fConf.certificates, fConf.hostname, fConf.uri_path_prefix, fConf.backend));
        }
    }
}

export async function startBFFApp(configJSON: string, configPort: number = 3000) {

    const c = new BFFConfig(configJSON);
    await c.loadConfig();
    const configApp = express();
    configApp.use(bodyParser.json());

    configApp.post('/reloadconfig', async (req, res) => {
        try {
            let configAsJSON = JSON.stringify(req.body)
            const c = new BFFConfig(configAsJSON);
            await c.loadConfig();
        } catch (e) {
            return res.status(500).send(e.message);
        }
        return res.send('OK');
    });

    return new Promise((resolve, reject) => {
        const serv = http.createServer(configApp)
        serv.on('error', (e) => {
            reject(e)
        })
        serv.listen(configPort, '127.0.0.1', () => {
            console.log(`ConfigApp listening on HTTP ${configPort}`);
            resolve(1)
        });
    });
}

if (typeof module !== 'undefined' && require.main === module) {
    const configJSON = fss.readFileSync('../bffconfig.json', 'utf8')
    startBFFApp(configJSON)
}

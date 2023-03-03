
# NodeBFF

The TECHSERIO Node.js BFF Library

- [Quick Setup](#quick-setup)
- [Frontend configuration](#frontend-configuration)
- [Backend configuration](#backend-configuration)
    - [Backend APIs](#backend-apis)
    - [Proxying](#backend-proxying)
- [Live reload](#live-reload)

# Quick setup
To start out with NodeBFF you essentially only need a configuration file that is used to initialize the BFF server.
Create a file named `bffconfig.json` in your project's root directory and configure a basic frontend and a backend:
```json
{
    "frontends": {
        "your-frontend": {
            "address": "0.0.0.0",
            "port": 8080,
            "backend": "your-backend"
        }
    },
    "backends": {
        "your-backend": {
            "require": "./backend.js"
        }
    }
}
```
Take a look at the configuration above.
A `"frontend"` object holds some basic configuration like the network interface and port used by an HTTP server, along with a `"backend"` property that points to `"your-backend"`. This configuration will create a single HTTP server listening on `0.0.0.0:8080` and point all the requests to your backend.

Now let's create a basic `backend.js` file that will handle our requests.
```js
const { Router } = require("express")

module.exports = {
    buildRouter: () => {
        return Router()
            .get("/", (req, res) => {
                res.send("hello world!")
            })
    }
}
```
A backend file has to export a `buildRouter` method that returns an express router which is then used to handle requests coming from the frontend.

You can run multiple frontends with their respective backends on the same address/port and use the `"uri_path_prefix"` prop the frontend configuration to direct requests to desired backends based on the start of the URL.
```json
{

    "frontends": {
        "frontend-1": {
            "address": "0.0.0.0",
            "port": 8080,
            "backend": "db",
            "uri_path_prefix": "/db/"
        },
        "frontend-2": {
            "address": "0.0.0.0",
            "port": 8080,
            "backend": "api",
            "uri_path_prefix": "/api/"
        }
    },
    "backends": {
        ...
    }
}
```


# --- OLD ---


# NodeBFF

The TECHSERIO Node.js BFF Library

- [Quick Setup](#quick-setup)
- [Frontend configuration](#frontend-configuration)
- [Backend configuration](#backend-configuration)
    - [Backend APIs](#backend-apis)
    - [Proxying](#backend-proxying)
- [Live reload](#live-reload)

# Quick setup
To start out with NodeBFF you essentially only need a configuration file that is used to initialize the BFF server.
Create a file named `bffconfig.json` in your project's root directory and configure a basic frontend and a backend:
```json
{
    "frontends": {
        "your-frontend": {
            "address": "0.0.0.0",
            "port": 8080,
            "backend": "your-backend"
        }
    },
    "backends": {
        "your-backend": {
            "require": "./backend.js"
        }
    }
}
```
Take a look at the configuration above.
A `"frontend"` object holds some basic configuration like the network interface and port used by an HTTP server, along with a `"backend"` property that points to `"your-backend"`. This configuration will create a single HTTP server listening on `0.0.0.0:8080` and point all the requests to your backend.

Now let's create a basic `backend.js` file that will handle our requests.
```js
const { Router } = require("express")

module.exports = {
    buildRouter: () => {
        return Router()
            .get("/", (req, res) => {
                res.send("hello world!")
            })
    }
}
```
A backend file has to export a `buildRouter` method that returns an express router which is then used to handle requests coming from the frontend.

You can run multiple frontends with their respective backends on the same address/port and use the `"uri_path_prefix"` prop the frontend configuration to direct requests to desired backends based on the start of the URL.
```json
{

    "frontends": {
        "frontend-1": {
            "address": "0.0.0.0",
            "port": 8080,
            "backend": "db",
            "uri_path_prefix": "/db/"
        },
        "frontend-2": {
            "address": "0.0.0.0",
            "port": 8080,
            "backend": "api",
            "uri_path_prefix": "/api/"
        }
    },
    "backends": {
        ...
    }
}
```

## Frontend Configuration
Configuring a frontend requires information needed by the HTTP(s) server, along with configuration specific to the BFF server itself.
Configuration includes:
- `address` - Network interface to listen on, eg. `0.0.0.0` - to listen on all interfaces.
- `port` - A Port like `80` (HTTP) or `443` (HTTPS)
- `uri_path_prefix` **(optional)** - A path prefix like `/api/` or `/shop/` that the frontend will listen on.
- `hostname` **(optional)** - To speficy a hostname the server will respond on. This is useful for subdomains like `registry.npmjs.org` instead of just `npmjs.org`
This mechanic is used mainly to distinguish between multiple different frontends that reuse the same HTTP server.
- `certificates` **(optional)** - Used to enable HTTPS. You can see how to generate a self-signed SSL certificate for tests [here](#ssl).
  - `key` - A path to the private key
  - `cert` - A path to the SSL certificate.
- `backend` - Specifies the name of the backend that the frontend points to.

A frontend is an entrance to the BFF server.  
It's worth to note that many frontends can be running directly on the same network interface and port by reusing the same HTTP server instance.

```json
{
  "frontends": {
    "frontend_name": {
        "address": "0.0.0.0",
        "port": 80,
        "uri_path_prefix": "/api/",
        "backend": "backend_name",
        "hostname": "registry.npmjs.org",
        "certificates": {
          "key": "/certs/key.pem",
          "cert": "/certs/cert.pem"
        }
    },
    ...
  }
}
```

## Backend Configuration
A backend is what handles the actual server logic - the logic you specify. It's either as a proxy or a custom API.

- `address` - Specifies which network interface the frontend is running.
- `port` - Specifies which port the frontend is using.
- `uri_path_prefix` - Specifies which base route on which the frontend is serving its services. This is useful to differentiate frontends, as there can be many frontends running inder the same HTTP server.
- `backend` - Specifies what backend the frontend forwards the requests to. A backend can be a custom class imported in the backend configuration or a proxy.
The string contains a name of a backend specified in the `backends` object as shown below.


## Backend APIs
A backend with custom API requires a separate file exporting a `buildRouter` method.
This method us called to create an express router instance later used to handle incoming requests.

```js
const express = require('express')

mopdule.exports = {
  buildRouter: () => {
    // Create a new Router instance
    return express.Router()
      // Register API handlers
      .get("/hello-world", () => {
        res.send("Hello world!")
      })
      .get("/goodbye-world", () => {
        res.send("Goodbye world!")
      })
  }
}
```

Once you have created a file to handle your incoming requests, you can then point to it in a backend like so:

```json
{
  "backends": {
    "backend_name": {
        "require": "../path/to/backend-class.js"
    },
    ...
  }
}
```

## Proxying
Another option is to configure a backend to proxy requests to another server.
This does not require any code or special logic from the user.
Configuring a proxy is as straight forward as specifying the `servers` prop instead of `require`.
You can also specify multiple servers and the BFF server will automatically distribute the load across them using the round-robin scheme.
```json
{
  "backends": {
    "backend_name": {
        "servers": [
          "128.0.0.1",
          "128.0.0.2",
          "128.0.0.3",
        ]
    },
    ...
  }
}
```

# SSL
To test out HTTPS quickly without requiring contact with a certificate authority, you can generate an SSL certificate yourself using [node-forge](https://www.npmjs.com/package/node-forge), or in the case below, [selfsigned](https://www.npmjs.com/package/selfsigned) npm package.

```js
const selfsigned = require('selfsigned')

const attributes = [{  name: 'commonName', value: 'domain-name.com' }]
const settings =   { keySize: 2048, days: 30, algorithm: 'sha256' }
const pems =       selfsigned.generate(attributes, settings)

console.log('CERT:',    pems.cert)
console.log('PRIVKEY:', pems.private)
```
Save the SSL cert/key pair to their respective files and load them in the frontend configuration like so:
```json
{
  "frontend_name": {
    "address": "0.0.0.0",
    "port": 80,
    "uri_path_prefix": "/api/",
    "certificates": {
      "key": "./certs/key.pem",
      "cert": "./certs/cert.pem"
    },
    ...
  }
}
```


# Live reload

## Reloading config from original config file:
```
curl -X GET --location "http://localhost:3000/reloadconfig"
```

## Reloading config from JSON in POST request:

```
curl -X POST --location "http://localhost:3000/reloadconfig" \
    -H "Content-Type: application/json" \
    -d "{
          \"frontends\": {
            \"dummy_api\": {
              \"address\": \"0.0.0.0\",
              \"port\": 8000,
              \"backend\": \"dummy_backend\"
            }
          },
          \"backends\": {
            \"dummy_backend\": {
              \"require\": \"./build/backends/dummybackend.js\"
            }
          }
        }"
```
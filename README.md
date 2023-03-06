
# NodeBFF

The TECHSERIO Node.js BFF Library

- [Quick Setup](#quick-setup)
- [Advanced configuration](#advanced-configuration)
  - [Frontend](#frontend-configuration)
  - [Backend](#backend-configuration)
    - [Proxying](#proxying)
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

After configuring everything, you can proceed with testing out your configuration.
Create an `"index.js"` file, import NodeBFF and initialize it:
```js
const path = require('path')
const fs = require('fs')
const nodebff = require('../build/bff.js')

nodebff.main(path.join(__dirname, './bffconfig.json'))
```
Now, the only thing left, is to ping your newly started server:
```curl
curl -sS 127.0.0.1:8080/
--> "Hello world!"
```

# Advanced configuration

## Frontend Configuration
Configuring a frontend requires information needed by the HTTP(s) server, along with configuration specific to the BFF server itself.

While the `port`, `interface` and `backend` props are required to configure a frontend, there are many settings that are optional, all of which are listed below: 

Configuration includes:
- `address` - Network interface to listen on. For example `0.0.0.0` - to listen on all interfaces.
- `port` - A Port like `80` (HTTP) or `443` (HTTPS)
- `backend` - The name of the backend that the frontend points to.
- `uri_path_prefix` **(optional)** - A path prefix like `/api/` or `/shop/` that the frontend will listen on - Used to distinguish frontends running on the same HTTP server instance. For example, your general API could run on `/api/` while something like a database on `/api/db/`.
- `hostname` **(optional)** - To speficy a hostname the server will respond on. This is useful for subdomains like `registry.npmjs.org` instead of just `npmjs.org`
This mechanic is used mainly to distinguish between multiple different frontends that reuse the same HTTP server, but can be used together with `uri_hash_prefix` for more control.
- `certificates` **(optional)** - Used to enable HTTPS. You can see how to generate a self-signed SSL certificate for tests [here](#ssl).
  - `key` - A path to the private key
  - `cert` - A path to the SSL certificate.

This is what all of the properties descrived above look like in JSON:
```json
{
  "npm": {
    "address": "0.0.0.0",
    "port": 8080,
    "backend": "registry",
    "uri_path_prefix": "/",
    "hostname": "registry.npmjs.com",
    "certificates": {
      "key": "./ssl/key.pem",
      "cert": "./ssl/cert.pub"
    }
  }
}
```

## Backend Configuration
A backend is what handles the actual server logic - the logic you specify. It's either as a proxy or a custom API.

- `require` - Specifies a JavaScript file holding all the backend logic and responsible for building an express routed used to handle requests.
- `servers` - Specifies a list of server addresses to proxy the connections to.

Note that a backend can only either load a custom file using `require` or serve as a proxy using the `servers` prop.

This is what all of the properties descrived above look like in JSON:
```json
{
  "custom-backend": {
    "require": "./backend.js"
  },
  "proxy": {
    "servers": [
      "128.0.0.1",
      "128.0.0.2",
      "128.0.0.3",
    ]
  }
}
```

## Proxying
Another option is to configure a backend to proxy requests to another server.
This does not require you to provide any extra files or logic.
Configuring a proxy is as straight forward as specifying a `servers` prop instead of `require`. 
The backend will attemptm to proxy all incoming requests to the servers whose addresses were specified in the `servers` prop. The addresses will be cycled through one by one for each connection using round-robin.

Note that newer versions of the HTTP protocol will attempt to reuse the same connection to perform multiple requests, so this does not mean that each server will handle just a single request per connection.
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

## Reloading config with JSON configuration provided using a POST request:
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














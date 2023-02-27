# NodeBFF
The TECHSERIO Node.js BFF library
- [Concept](#concept)
- [Setup](#setup)
  - [Frontend](#frontend)
  - [Backend](#backend)
    - [Backend APIs](#backend-apis)
    - [Proxying](#backend-proxying)
- [Live reload](#live-reload)


# Concept
NodeBFF is divided into the concept of "backend" and "frontend".  
A frontend is the configuration that exposes resources on the network.  
A backend is the code that handles proxying, APIs or in general - network requests.

# Setup

## Frontend
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

## Backend
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
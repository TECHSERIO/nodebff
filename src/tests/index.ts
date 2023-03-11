
// Generals ===============================================
import { createBFF } from './daemon'

// Test lib ===============================================
import TestLib from 'testlib'
import config from './index.json'
const t = new TestLib(config)


// Helpers ================================================


// Tests ==================================================

t.test(`hello_world`, `Load and ping a "hello world" frontend`, async c => {

    const killBFF = await createBFF("./backends/hello_world/main.js")
    c.cleanup(() => killBFF())

    const req = await fetch('http://127.0.0.1:8001')
    const res = await req.text()

    c.expect(`"Hello world" response`, res, 'Hello world')

})

t.test(`dual_uri_path_prefix`, `Load and ping /hw1 and /hw2 frontends`, async c => {

    const killBFF = await createBFF("./backends/uri_path_prefix/main.js")
    c.cleanup(() => killBFF())

    c.phase("hw1")

    const req1 = await fetch('http://127.0.0.1:8002/hw1')
    const res1 = await req1.text()
    c.expect(`"Hello world #1" response`, res1, 'Hello world #1')

    c.phase("hw2")

    const req2 = await fetch('http://127.0.0.1:8002/hw2')
    const res2 = await req2.text()
    c.expect(`"Hello world #2" response`, res2, 'Hello world #2')

})

t.test(`hostname_uri_path_prefix`, `Load and ping /hw1 on two hosts`, async c => {

    const killBFF = await createBFF("./backends/hostname_uri_path_prefix/main.js")
    c.cleanup(() => killBFF())

    c.phase("hw1:8003")

    const req1 = await fetch('http://127.0.0.1:8003/hw1')
    const res1 = await req1.text()
    c.expect(`"Hello world #1" response`, res1, 'Hello world #1')

    c.phase("hw1:8004")

    const req2 = await fetch('http://127.0.0.1:8004/hw1')
    const res2 = await req2.text()
    c.expect(`"Hello world #2" response`, res2, 'Hello world #2')

})

t.test(`404_fallthrough`, `Fall to a 404 page on no match`, async c => {

    const killBFF = await createBFF("./backends/404_fallthrough/main.js")
    c.cleanup(() => killBFF())

    c.phase("direct /regular")

    const req1 = await fetch('http://127.0.0.1:8005/regular')
    const res1 = await req1.text()
    c.expect(`"some text" response`, res1, 'some text')

    c.phase("direct / (404)")

    const req2 = await fetch('http://127.0.0.1:8005/')
    const res2 = await req2.text()
    c.expect(`status code of 404`, req2.status, 404)
    c.expect(`"404" response`, res2, '404')

    c.phase("fallthrough /abc -> /")

    const req3 = await fetch('http://127.0.0.1:8005/abc')
    const res3 = await req3.text()
    c.expect(`status code of 404`, req3.status, 404)
    c.expect(`"404" response`, res3, '404')

})

t.test(`500_exception`, `Throw an exception in the backend and recieve 500 reponse`, async c => {

    const killBFF = await createBFF("./backends/500_exception/main.js")
    c.cleanup(() => killBFF())

    const req = await fetch('http://127.0.0.1:8005/')
    //const res = await req.text()
    c.expect(`500 response code`, req.status, 500)

})


t.test(`proxy`, `Proxy request to two different servers`, async c => {

    const killBFF = await createBFF("./backends/proxy/main.js")
    c.cleanup(() => killBFF())

    const req1 = await fetch('http://127.0.0.1:8080/')
    const res1 = await req1.text()
    c.expect(`Response code 200`, req1.status, 200)
    c.expect(`Text response`, res1, 'backend #1')

    const req2 = await fetch('http://127.0.0.1:8080/')
    const res2 = await req2.text()
    c.expect(`Response code 200`, req2.status, 200)
    c.expect(`Text response`, res2, 'backend #2')

    const req3 = await fetch('http://127.0.0.1:8080/')
    const res3 = await req3.text()
    c.expect(`Response code 200`, req3.status, 200)
    c.expect(`Text response`, res3, 'backend #1')

})

t.test('swap', `Swap servers mid connection`, async c => {

    const killBFF = await createBFF("./backends/swap/main.js")
    c.cleanup(() => killBFF())

    const req1 = await fetch('http://127.0.0.1:8765/')
    const res1 = await req1.text()
    c.expect(`Response code 200`, req1.status, 200)
    c.expect(`Text response`, res1, 'some text')

})

t.test('live_remove_frontend', `Remove a frontend from server config without restarting.`, async c => {

    const killBFF = await createBFF("./backends/live_remove_frontend/main.js")
    c.cleanup(() => killBFF())

    c.phase("checks")

    const req1 = await fetch('http://127.0.0.1:8181/b1')
    const res1 = await req1.text()
    c.expect(`response code 200`, req1.status, 200)
    c.expect(`text response`, res1, 'backend #1')

    const req2 = await fetch('http://127.0.0.1:8181/b2')
    const res2 = await req2.text()
    c.expect(`response code 200`, req2.status, 200)
    c.expect(`text response`, res2, 'backend #2')

    c.phase('update')

    const req3 = await fetch('http://127.0.0.1:3000/reloadconfig', {
        method: 'POST',
        headers: { 'Content-Type': "application/json" },
        body: JSON.stringify({
            frontends: {
                main1: {
                    address: "0.0.0.0",
                    port: 8181,
                    uri_path_prefix: "/b1",
                    backend: "backend1"
                }
            },
            backends: {
                backend1: {
                    require: "./backend1.js"
                }
            }
        })
    })

    c.expect(`response code 200`, req3.status, 200)

    c.phase('post update checks')

    const req4 = await fetch('http://127.0.0.1:8181/b1')
    const res4 = await req4.text()
    c.expect(`response code 200`, req4.status, 200)
    c.expect(`text response`, res4, 'backend #1')

    const res5 = await fetch('http://127.0.0.1:8181/b2') 
    c.expect("request to /b2 to fail", res5.status, 404)

})

t.test('live_readd_frontend', `Remove a frontend and put it back in without reloading.`, async c => {

    const killBFF = await createBFF("./backends/live_readd_frontend/main.js")
    c.cleanup(() => killBFF())

    c.phase("checks")

    const req1 = await fetch('http://127.0.0.1:8182/b1')
    const res1 = await req1.text()
    c.expect(`response code 200`, req1.status, 200)
    c.expect(`text response`, res1, 'backend #1')

    const req2 = await fetch('http://127.0.0.1:8182/b2')
    const res2 = await req2.text()
    c.expect(`response code 200`, req2.status, 200)
    c.expect(`text response`, res2, 'backend #2')

    c.phase('remove')

    const req3 = await fetch('http://127.0.0.1:3000/reloadconfig', {
        method: 'POST',
        headers: { 'Content-Type': "application/json" },
        body: JSON.stringify({
            frontends: {
                main1: {
                    address: "0.0.0.0",
                    port: 8182,
                    uri_path_prefix: "/b1",
                    backend: "backend1"
                }
            },
            backends: {
                backend1: {
                    require: "./backend1.js"
                }
            }
        })
    })
    c.expect(`response code 200`, req3.status, 200)

    c.phase('readd')

    const req4 = await fetch('http://127.0.0.1:3000/reloadconfig', {
        method: 'POST',
        headers: { 'Content-Type': "application/json" },
        body: JSON.stringify({
            frontends: {
                main1: {
                    address: "0.0.0.0",
                    port: 8182,
                    uri_path_prefix: "/b1",
                    backend: "backend1"
                },
                main2: {
                    address: "0.0.0.0",
                    port: 8182,
                    uri_path_prefix: "/b2",
                    backend: "backend2"
                }
            },
            backends: {
                backend1: {
                    require: "./backend1.js"
                },
                backend2: {
                    require: "./backend2.js"
                }
            }
        })
    })
    c.expect(`response code 200`, req4.status, 200)

    const req5 = await fetch('http://127.0.0.1:8182/b1')
    const res5 = await req5.text()
    c.expect(`response code 200`, req5.status, 200)
    c.expect(`text response`, res5, 'backend #1')

    const req6 = await fetch('http://127.0.0.1:8182/b2')
    const res6 = await req6.text()
    c.expect(`response code 200`, req6.status, 200)
    c.expect(`text response`, res6, 'backend #2')

})

t.test('live_update_incorrect_config', `Update BFF with bad configuration.`, async c => {

    const killBFF = await createBFF("./backends/live_update_incorrect_config/main.js")
    c.cleanup(() => killBFF())

    c.phase("checks")

    const req1 = await fetch('http://127.0.0.1:8989/')
    const res1 = await req1.text()
    c.expect(`response code 200`, req1.status, 200)
    c.expect(`text response`, res1, 'some text')

    c.phase('update')

    const req2 = await fetch('http://127.0.0.1:3000/reloadconfig', {
        method: 'POST',
        headers: { 'Content-Type': "application/json" },
        body: JSON.stringify({
            frontends: {
                main1: {
                    address: "0.0.0.0",
                    port: 8181,
                    uri_path_prefix: "/b1",
                    backend: "backend1"
                }
            },
            backends: { }
        })
    })
    c.expect(`response code 400`, req2.status, 400)

    c.phase("removed backend")

    const req3 = await fetch('http://127.0.0.1:8989/')
    const res3 = await req3.text()
    c.expect(`response code 200`, req3.status, 200)
    c.expect(`text response`, res3, 'some text')
    
    c.phase("send malformed json")

    const req4 = await fetch('http://127.0.0.1:3000/reloadconfig', {
        method: 'POST',
        body: `{
            "frontends": {
                "main1": {
                    "address": "0.0.0.0",
                    "port": 8181,
                    "uri_path_prefix": "/b1",
                    "backend": "backend1"
                }
            },
            "backends"-some-malformed-syntax-: {
                "main": {
                    "require": "./backend.js"
                }
            }
        }`
    })
    c.expect(`response code 400`, req4.status, 400)

    const req5 = await fetch('http://127.0.0.1:8989/')
    const res5 = await req5.text()
    c.expect(`response code 200`, req5.status, 200)
    c.expect(`text response`, res5, 'some text')

})

t.run(process.argv.length > 2 ? process.argv.slice(2, process.argv.length) : undefined)
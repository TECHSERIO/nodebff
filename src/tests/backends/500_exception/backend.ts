import express from 'express';

module.exports = {

    buildRouter(): express.Router {

        return express.Router()
            .get('/', (req, res) => {
                throw "a really creative exception"
            })

    }

}
 
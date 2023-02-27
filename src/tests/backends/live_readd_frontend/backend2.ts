import express from 'express';

module.exports = {

    buildRouter(): express.Router {

        return express.Router()
            .get('*', (req, res) => {
                res.send('backend #2');
            })

    }

}
 
import express from 'express';

module.exports = {

    buildRouter(): express.Router {

        return express.Router()
            .get('*', (req, res) => {
                setTimeout(() => {
                    res.send('some text');
                }, 6000)
            })

    }

}
 
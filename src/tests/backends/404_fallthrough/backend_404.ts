import express from 'express';

module.exports = {

    buildRouter(): express.Router {

        return express.Router()
            .get('*', (req, res) => {
               res.status(404).send('404');
            })

    }

}
 
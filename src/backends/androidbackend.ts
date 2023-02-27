import express from 'express';

const buildRouter = (): express.Router => {
    const router = express.Router();

    router.get('/', (req, res) => {
        res.send('Android module is running!');
    });

    router.get('/resource', (req, res) => {
        res.json(['Android', 'very', 'useful', 'resource']);
    });

    router.get('/resource/:name', (req, res) => {
        res.json(['Hello, ', req.params.name, '.']);
    });

    return router;
};

export {
    buildRouter
};

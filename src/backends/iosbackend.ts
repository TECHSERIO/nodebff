import express from 'express';

const buildRouter = (): express.Router => {
    const router = express.Router();

    router.get('/', (req, res) => {
        res.send('IOS module is running!');
    });

    router.get('/resource', (req, res) => {
        res.json(['IOSBackend', 'very', 'useful', 'resource']);
    });

    return router;
};

export {
    buildRouter
};

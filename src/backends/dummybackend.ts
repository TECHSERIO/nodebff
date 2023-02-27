import express from 'express';

const buildRouter = (): express.Router => {
    const router = express.Router();

    router.get('*', (req, res) => {
        res.send('Whatever you say, I will reply DUMMY, dummy!');
    });

    return router;
};

export {
    buildRouter
};

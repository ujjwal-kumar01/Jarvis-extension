import { Router } from 'express';
import type { Request, Response } from 'express';
import { signUp } from '../controllers/user.controller.js';

const router = Router();

router.route('/').get((_req: Request, res: Response) => {
    res.send('User route');
});

router.post('/register', signUp);

router.get('/id', (_req: Request, res: Response) => {
    res.send(`User with id `);
});

export default router;

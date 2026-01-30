import {Router} from 'express';
import type {Request, Response} from 'express';
import {identifyTask,executeTask} from '../controllers/task.controller.js';
import { verifyJWT } from '../middlewares/auth.middlewares.js';

const router = Router();

router.route('/').get((_req: Request, res: Response) => {
    res.send('task route');
});

router.post('/identifyTask',verifyJWT,identifyTask);
router.post('/executeTask',verifyJWT,executeTask);


export default router;


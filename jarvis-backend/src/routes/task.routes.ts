import {Router} from 'express';
import type {Request, Response} from 'express';
import {identifyTask,executeTask} from '../controllers/task.controller.js';
import { verifyJWT } from '../middlewares/auth.middlewares.js';
import {isVerified} from '../middlewares/verify.middlewares.js'

const router = Router();

router.route('/').get((_req: Request, res: Response) => {
    res.send('task route');
});

router.post('/identifyTask',verifyJWT,isVerified, identifyTask);
router.post('/executeTask',verifyJWT,isVerified, executeTask);


export default router;


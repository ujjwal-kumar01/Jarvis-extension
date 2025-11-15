import {Router} from 'express';
import type {Request, Response} from 'express';
import {identifyTask,executeTask} from '../controllers/task.controller.js';

const router = Router();

router.route('/').get((_req: Request, res: Response) => {
    res.send('task route');
});

router.post('/identifyTask',identifyTask);
router.post('/executeTask',executeTask);


export default router;


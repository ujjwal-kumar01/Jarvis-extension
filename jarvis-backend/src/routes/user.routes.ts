import { Router } from 'express';
import type { Request, Response } from 'express';
import { 
    signUp , 
    login, 
    verifyEmail, 
    resendVerificationCode,
    logout,
} from '../controllers/user.controller.js';
import { verifyJWT } from '../middlewares/auth.middlewares.js';
import {upload } from '../middlewares/multer.middlewares.js';

const router = Router();

router.route('/').get((_req: Request, res: Response) => {
    res.send('User route');
});

router.post('/register', upload.single('avatar'), signUp);
router.route("/login").post(login)
router.route("/logout").post(verifyJWT,logout)
router.post("/verifyEmail",verifyJWT ,verifyEmail)
router.post("/resendVerificationCode",verifyJWT ,resendVerificationCode)

export default router;

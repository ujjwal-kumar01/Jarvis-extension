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
import Google from '@auth/express/providers/google';
import { googleLogin } from '../controllers/user.controller.js';

const router = Router();

router.route('/').get((_req: Request, res: Response) => {
    res.send('User route');
});

router.post('/signup', upload.single('avatar'), signUp);
router.route("/login").post(login)
router.route("/logout").post(verifyJWT,logout)
router.post("/verifyEmail",verifyJWT ,verifyEmail)
router.post("/resendVerificationCode",verifyJWT ,resendVerificationCode)
router.post("/google-login", googleLogin)

export default router;

import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import userRoutes from './routes/user.routes.js';
import taskRoutes from './routes/task.routes.js';
import { ApiError } from './utils/ApiError.js';

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Cookie parser
app.use(cookieParser());

app.get('/hello', (_req: Request, res: Response) => {
    res.send('Hello World!');
});

app.use('/user', userRoutes);
app.use('/task', taskRoutes );

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
            errors: err.errors
        });
    }

    // Handle other errors
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: []
    });
});

export default app;

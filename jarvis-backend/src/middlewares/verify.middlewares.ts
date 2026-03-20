import { ApiError } from "../utils/ApiError.js";
import type { NextFunction, Request, Response } from "express";

export const isVerified = (req: Request, res: Response, next: NextFunction) => {
    try {
        // user should already be attached from verifyJWT
        if (!req.user) {
            throw new ApiError(401, "Unauthorized request");
        }

        if (!req.user.isVerified) {
            throw new ApiError(403, "Please verify your account to continue");
        }

        next();
    } catch (error) {
        throw new ApiError(
            (error as ApiError)?.statusCode || 403,
            (error as Error)?.message || "Account not verified"
        );
    }
};
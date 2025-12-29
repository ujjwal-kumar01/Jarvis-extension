import type { Request, Response } from 'express';
import User from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";

export const signUp = async (req: Request, res: Response): Promise<void> => {
    const { fullName, email, password } = req.body;

    if ([fullName, email, password].some((field) => !field?.trim())) {
        throw new ApiError(400, "All required fields must be filled");
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
        throw new ApiError(409, "User with this email already exists");
    }

    
};
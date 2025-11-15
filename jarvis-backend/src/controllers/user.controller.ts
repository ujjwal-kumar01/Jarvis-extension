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

    // Create new user
    const user = await User.create({
        username: fullName, // Map fullName to username as per the model
        email,
        password,
        verifyCode: Math.floor(100000 + Math.random() * 900000).toString(),
        verifyCodeExpiry: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    });

    res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: {
            id: user._id,
            username: user.username,
            email: user.email,
            isVerified: user.isVerified
        }
    });
};
import type { Request, Response } from "express";
import User from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { sendVerificationEmail } from "../utils/sendVerificationEmail.js";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

export const generateAccessAndRefreshTokens = async (
    userId: mongoose.Types.ObjectId
): Promise<{ accessToken: string; refreshToken: string }> => {
    try {
        if (!userId) {
            throw new ApiError(400, "User ID is not generated");
        }
        const user = await User.findById(userId);

        if (!user) {
            throw new ApiError(404, "User not found");
        }

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        const newRefreshTokens = await bcrypt.hash((refreshToken), 10);

        user.refreshToken = newRefreshTokens;

        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(
            500,
            "Something went wrong while generating access and refresh tokens"
        );
    }
};

export const signUp = async (req: Request, res: Response): Promise<void> => {
    try {
        const { username, email, password } = req.body;

        // ✅ Basic validation
        if ([username, email, password].some((field) => !field?.trim())) {
            throw new ApiError(400, "All required fields must be filled");
        }

        // ✅ Check existing user
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            if (!existingUser.isEmailVerified) {
                throw new ApiError(
                    409,
                    "User exists but email is not verified. Please verify your email after log in."
                );
            }

            throw new ApiError(
                409,
                "User with this email already exists. Please login."
            );
        }

        // ✅ Avatar Upload (Optional)
        let avatar: { url: string } | null = null;

        if (req.files && !Array.isArray(req.files)) {
            const avatarPath = req.files?.avatar?.[0]?.path;

            if (!avatarPath) {
                throw new ApiError(400, "Avatar file not uploaded correctly");
            }

            avatar = await uploadOnCloudinary(avatarPath);
        }

        // ✅ Generate Verification Code
        const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
        const verifyCodeExpiry = new Date(Date.now() + 15 * 60 * 1000);

        const verification = {
            code: verifyCode,
            expiresAt: verifyCodeExpiry,
            purpose: "email_verification",
        };

        // ✅ Create User (DB Layer)
        let newUser;
        try {
            newUser = await User.create({
                username,
                email,
                password,
                avatar: avatar?.url,
                verification,
            });
        } catch (dbError) {
            throw new ApiError(500, "Failed to create user");
        }

        // ✅ Send Verification Email (Separate Try-Catch)
        try {
            const emailResponse = await sendVerificationEmail(
                email,
                username,
                verifyCode
            );
            console.log("send email response:", emailResponse);
            if (!emailResponse?.success) {
                throw new Error("Email service failed");
            }
        } catch (emailError) {
            throw new ApiError(
                500,
                "Failed to send verification email. Please try again."
            );
        }

        const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(newUser._id as mongoose.Types.ObjectId);

        const loggedInUser = await User.findById(newUser._id).select("-password -refreshToken")

        const options = {
            httpOnly: true,
            secure: true,
        }

        res.status(201)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json({
                success: true,
                message: "User registered successfully. Please verify your email.",
                user: loggedInUser,
            });

    } catch (error: any) {
        throw new ApiError(
            error.statusCode || 500,
            error.message || "Something went wrong during signup"
        );
    }
};

export const verifyEmail = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        if (!req.user) {
            throw new ApiError(401, "Unauthorized");
        }

        const userId = req.user?._id;
        const { code } = req.body;

        if (!code) {
            throw new ApiError(400, "Verification code is required");
        }

        const user = await User.findById(userId);

        if (!user) {
            throw new ApiError(404, "User not found");
        }

        if (user.isEmailVerified) {
            throw new ApiError(400, "Email already verified");
        }

        const verification = user.verification;

        if (!verification || verification.purpose !== "email_verification") {
            throw new ApiError(
                400,
                "No verification request found. Please request a new code."
            );
        }

        if (verification.code !== code) {
            throw new ApiError(400, "Invalid verification code");
        }

        if (verification.expiresAt < new Date()) {
            throw new ApiError(400, "Verification code has expired");
        }

        user.isEmailVerified = true;
        user.verification = null as any;

        await user.save();

        res.status(200).json({
            success: true,
            message: "Email verified successfully",
        });
    } catch (error: any) {
        throw new ApiError(
            error.statusCode || 500,
            error.message || "Email verification failed"
        );
    }
};

export const resendVerificationCode = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        if (!req.user) {
            throw new ApiError(401, "Unauthorized");
        }
        const userId = req.user?._id;
        const user = await User.findById(userId);
        if (!user) {
            throw new ApiError(404, "User not found");
        }
        if (user.isEmailVerified) {
            throw new ApiError(400, "Email already verified");
        }
        // Generate new verification code
        const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
        const verifyCodeExpiry = new Date(Date.now() + 15 * 60 * 1000);
        user.verification = {   
            code: verifyCode,
            expiresAt: verifyCodeExpiry,
            purpose: "email_verification",
        };
        await user.save();
        // Send verification email
        const emailResponse = await sendVerificationEmail(
            user.email,
            user.username,
            verifyCode
        );
        if (!emailResponse?.success) {
            throw new Error("Email service failed");
        }
        res.status(200).json({
            success: true,
            message: "Verification code resent successfully",
        });
    }
    catch (error: any) {
        throw new ApiError(
            error.statusCode || 500,
            error.message || "Resend verification code failed"
        );
    }
};


export const login = async (req: Request, res: Response): Promise<void> => {
    // Implementation of login controller
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            throw new ApiError(400, "Email and password are required");
        }

        const user = await User.findOne({ email });
        if (!user) {
            throw new ApiError(404, "User not found");
        }
        const isPasswordValid = await bcrypt.compare(password, user.password || "");
        if (!isPasswordValid) {
            throw new ApiError(401, "Invalid password");
        }

        const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id as mongoose.Types.ObjectId);
        const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
        const options = {
            httpOnly: true,
            secure: true,
        }

        res.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json({
                success: true,
                message: "Login successful",
                user: loggedInUser,
            });
    }
    catch (error: any) {
        throw new ApiError(
            error.statusCode || 500,
            error.message || "Login failed"
        );
    }
}

export const logout = async (req: Request, res: Response): Promise<void> => {
    try {
        await User.findByIdAndUpdate(
            req.user._id,
            {
                $unset: {
                    refreshToken: 1 // this removes the field from document
                }
            },
            {
                new: true
            }
        )

        const options = {
            httpOnly: true,
            secure: true
        }

        res.status(200)
            .clearCookie("accessToken", options)
            .clearCookie("refreshToken", options)
            .json({
                success: true,
                message: "Logout successful"
            });
    }
    catch (error: any) {
        throw new ApiError(
            error.statusCode || 500,
            error.message || "Logout failed"
        );
    }
}


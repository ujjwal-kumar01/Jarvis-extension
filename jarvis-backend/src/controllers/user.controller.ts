import type { Request, Response, NextFunction } from "express";
import User from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { sendVerificationEmail } from "../utils/sendVerificationEmail.js";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
// import oauth2Client from "../utils/googleAuth.js";
import axios from "axios";
import { client } from "../utils/googleAuth.js";

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
                hasPassword: true,
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
        // Send verification email
        const emailResponse = await sendVerificationEmail(
            user.email,
            user.username,
            verifyCode
        );
        if (!emailResponse?.success) {
            throw new Error("Email service failed");
        }
        await user.save();
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


// export const googleLogin = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const { code } = req.body;
//     if (!code) {
//       throw new ApiError(400, "Authorization code is required");
//     }
//     console.log("Google authorization code:", code);

//     let googleResponse;
//     try {
//         googleResponse = await oauth2Client.getToken(code);        
//     } catch (error) {
//         console.error("Error exchanging code for tokens:", error);
//         throw new ApiError(401, "Failed to exchange code for tokens");
//     }

//     if (!googleResponse.tokens.access_token) {
//         console.error("Failed to obtain access token from Google:", googleResponse);
//       throw new ApiError(401, "Failed to obtain access token from Google");
//     }

//     console.log("Google access token:", googleResponse.tokens.access_token);

//     oauth2Client.setCredentials(googleResponse.tokens);
//     console.log("OAuth2 client credentials set.");

//     const googleUser = await axios
//       .get('https://openidconnect.googleapis.com/v1/userinfo', {
//         headers: {
//           Authorization: `Bearer ${googleResponse.tokens.access_token}`,
//         },
//       })
//       .then(res => res.data);

//       console.log("Google user info:", googleUser);

//     let user = await User.findOne({ email: googleUser.email });

//     if (!user) {
//       user = new User({
//         username: googleUser.name,
//         email: googleUser.email,
//         avatar: googleUser.picture,
//         isEmailVerified: true,
//       });
//       await user.save();
//     }

//     const { accessToken, refreshToken } =
//       await generateAccessAndRefreshTokens(user._id as mongoose.Types.ObjectId);

//     const loggedInUser = await User.findById(user._id)
//       .select("-password -refreshToken");

//     const options = {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === 'production',
//       sameSite: 'lax' as const,
//     };

//     res
//       .status(200)
//       .cookie("accessToken", accessToken, options)
//       .cookie("refreshToken", refreshToken, options)
//       .json({
//         success: true,
//         message: "Google login successful",
//         user: loggedInUser,
//       });

//   } catch (error: any) {
//     throw new ApiError(
//       error.statusCode || 500,
//       error.message || "Google login failed"
//     );
//   }
// };


export const googleLogin = async (req: Request, res: Response) => {
    try {
        const { credential } = req.body;

        if (!credential) {
            throw new ApiError(400, "Google credential is required");
        }

        if (!process.env.GOOGLE_CLIENT_ID) {
            throw new ApiError(500, "Google Client ID is not configured");
        }

        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();

        if (!payload?.email) {
            throw new ApiError(400, "Invalid Google token");
        }

        let user = await User.findOne({ email: payload.email });

        if (!user) {
            user = await User.create({
                username: payload.name,
                email: payload.email,
                avatar: payload.picture,
                isEmailVerified: payload.email_verified,
                googleId: "GoogleAuth",
            });
        }

        const { accessToken, refreshToken } =
            await generateAccessAndRefreshTokens(user._id as mongoose.Types.ObjectId);

        res
            .status(200)
            .cookie("accessToken", accessToken, { httpOnly: true })
            .cookie("refreshToken", refreshToken, { httpOnly: true })
            .json({
                success: true,
                message: "Google login successful",
            });

    } catch (err: any) {
        throw new ApiError(401, err.message || "Google login failed");
    }
};

export const getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            throw new ApiError(401, "Unauthorized");
        }
        const userId = req.user?._id;
        const user = await User.findById(userId).select("-password -refreshToken");
        if (!user) {
            throw new ApiError(404, "User not found");
        }
        res.status(200).json({
            success: true,
            user,
        });
    } catch (error: any) {
        throw new ApiError(
            error.statusCode || 500,
            error.message || "Failed to fetch user profile"
        );
    }
};

import crypto from "crypto";
const getEncryptionKey = (): Buffer => {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error("ENCRYPTION_KEY is missing");
  }

  if (key.length !== 64) {
    throw new Error("ENCRYPTION_KEY must be 64 hex characters");
  }

  return Buffer.from(key, "hex");
};

const encrypt = (text: string): string => {
  const iv = crypto.randomBytes(16);
  const key = getEncryptionKey();

  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);

  const encrypted =
    cipher.update(text, "utf8", "hex") + cipher.final("hex");

  return `${iv.toString("hex")}:${encrypted}`;
};


const decrypt = (encryptedText: string): string => {
  const key = getEncryptionKey();
  const [ivHex, encrypted] = encryptedText.split(":");

  if (!ivHex || !encrypted) {
    throw new Error("Invalid encrypted text format");
  }

  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);

  return (
    decipher.update(encrypted, "hex", "utf8") +
    decipher.final("utf8")
  );
};



export const updateGeminiKey = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { apiKey } = req.body;

    if (!req.user) {
      throw new ApiError(401, "Unauthorized");
    }

    if (!apiKey || typeof apiKey !== 'string') {
      throw new ApiError(400, "Invalid API key");
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const encryptedKey = encrypt(apiKey); // NOT bcrypt

    user.gemini.apiKeyEncrypted = encryptedKey;
    user.gemini.isProvidedByUser = true;
    user.gemini.apiKeyLast4 = apiKey.slice(-4); // 👈 store this

    await user.save();

    const newuser = await User.findById(user._id).select(
      "-password -refreshToken -gemini.apiKeyEncrypted"
    );

    res.status(200).json({
      success: true,
      message: "Gemini API key updated successfully",
      user:newuser
    });

  } catch (error: any) {
      throw new ApiError(
        error.statusCode || 500,
        error.message || "Failed to update Gemini key"
    );
  }
};

export const removeGeminiKey = async (
  req: Request,
  res: Response
) => {
  try {
    console.log("remove hit")
    if (!req.user) {
      throw new ApiError(401, "Unauthorized");
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    user.gemini.apiKeyEncrypted = "";
    user.gemini.isProvidedByUser = false;
    user.gemini.apiKeyLast4="";

    await user.save();
    const newuser = await User.findById(user._id).select(
      "-password -refreshToken -gemini.apiKeyEncrypted"
    );
    return res.status(200).json({
      success: true,
      message: "Gemini API key removed successfully",
      user:newuser
    });

  } catch (error: any) {
      throw new ApiError(
        error.statusCode || 500,
        error.message || "Failed to remove Gemini key"
    );
  }
};

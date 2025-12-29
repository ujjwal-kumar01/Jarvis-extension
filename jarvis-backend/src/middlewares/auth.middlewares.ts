import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken"
import User from "../models/user.models.js";
import type { NextFunction, Request, Response } from "express";

export const verifyJWT = async(req:Request, res: Response, next:NextFunction) => {
    try {
        const token = req.cookies?.accessToken || req.headers.authorization?.replace("Bearer ", "")
        
        // console.log(token);
        if (!token) {
            throw new ApiError(401, "Unauthorized request")
        }
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
    
        if (!user) {
            
            throw new ApiError(401, "Invalid Access Token")
        }
    
        req.user = user;
        next()
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token")
    }
    
}
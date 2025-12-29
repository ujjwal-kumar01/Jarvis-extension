import mongoose, { Document, Model } from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Interface for User document
export interface IUser extends Document {
  username?: string;
  email: string;
  password?: string;
  googleId?: string;
  isEmailVerified: boolean;
  avatar?: string;
  verification?: {
    code: string;
    expiresAt: Date;
    purpose: 'email_verification' | 'password_reset';
  };
  subscription?: {
    plan: 'free' | 'monthly' | 'yearly';
    status: 'trial' | 'active' | 'expired' | 'cancelled';
    trialEndsAt: Date;
    currentPeriodEndsAt?: Date;
  };
  gemini?: {
    apiKeyEncrypted?: string;
    isProvidedByUser: boolean;
  };
  refreshToken?: string;
}

// Interface for User model
export interface IUserModel extends Model<IUser> { }

const userSchema = new mongoose.Schema<IUser>(
  {
    username: {
      type: String,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    password: String,

    googleId: {
      type: String,
      sparse: true,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    avatar: String,

    verification: {
      code: String,
      expiresAt: Date,
      purpose: {
        type: String,
        enum: ["email_verification", "password_reset"],
      },
    },

    subscription: {
      plan: {
        type: String,
        enum: ["free", "monthly", "yearly"],
        default: "free",
      },
      status: {
        type: String,
        enum: ["trial", "active", "expired", "cancelled"],
        default: "trial",
      },
      trialEndsAt: {
        type: Date,
        default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      currentPeriodEndsAt: Date,
    },

    gemini: {
      apiKeyEncrypted: String,
      isProvidedByUser: {
        type: Boolean,
        default: false,
      },
    },
    refreshToken: {
      type: String,
      default: null
    }

  },
  { timestamps: true }
);

// Hash password only if present
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Instance method
userSchema.methods.isPasswordCorrect = async function (
  password: string
): Promise<boolean> {
  if (!this.password) return false; // prevent checking null
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    }
  )
}
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,

    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY
    }
  )
}


const User: IUserModel = mongoose.model<IUser, IUserModel>("User", userSchema);
export default User;
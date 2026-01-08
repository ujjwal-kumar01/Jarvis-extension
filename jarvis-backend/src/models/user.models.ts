import mongoose, { Document, Model } from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

/* =======================
   INTERFACES
======================= */

export interface IUser extends Document {
  username: string;
  email: string;
  password?: string;
  googleId?: string;
  isEmailVerified: boolean;
  avatar: string;
  hasPassword: boolean;

  verification?: {
    code: string;
    expiresAt: Date;
    purpose: "email_verification" | "password_reset";
  };

  subscription?: {
    plan: "free" | "monthly" | "yearly";
    status: "trial" | "active" | "expired" | "cancelled";
    trialEndsAt: Date;
    currentPeriodEndsAt?: Date;
  };

  gemini?: {
    apiKeyEncrypted?: string;
    isProvidedByUser: boolean;
  };

  refreshToken?: string;

  // Methods
  isPasswordCorrect(password: string): Promise<boolean>;
  generateAccessToken(): string;
  generateRefreshToken(): string;
}

export interface IUserModel extends Model<IUser> {}

/* =======================
   SCHEMA
======================= */

const userSchema = new mongoose.Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
    },

    password: {
      type: String,
    },

    hasPassword: {
      type: Boolean,
      default: false,
    },

    googleId: {
      type: String,
      sparse: true,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    avatar: {
      type: String,
      default: 'https://res.cloudinary.com/dowcqyxsi/image/upload/v1767789328/profile_mdwh3z.png',
    },

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
      default: null,
    },
  },
  { timestamps: true }
);

/* =======================
   MIDDLEWARES
======================= */

// Hash password before save
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

/* =======================
   METHODS
======================= */

userSchema.methods.isPasswordCorrect = async function (
  password: string
): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function (): string {
  if (!process.env.ACCESS_TOKEN_SECRET) {
    throw new Error("ACCESS_TOKEN_SECRET is not defined");
  }

  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
    },
    process.env.ACCESS_TOKEN_SECRET as string,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m",
    }
  );
};

userSchema.methods.generateRefreshToken = function (): string {
  if (!process.env.REFRESH_TOKEN_SECRET) {
    throw new Error("REFRESH_TOKEN_SECRET is not defined");
  }

  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET as string,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d",
    }
  );
};

/* =======================
   MODEL
======================= */

const User: IUserModel = mongoose.model<IUser, IUserModel>(
  "User",
  userSchema
);

export default User;

import mongoose, { Document, Model } from "mongoose";
import bcrypt from "bcryptjs";

// Interface for User document
export interface IUser extends Document {
  username: string;
  email: string;
  password?: string; // ✅ optional now
  authProvider: "local" | "google"; // ✅ added
  oauthId?: string; // ✅ store Google sub/id
  isVerified: boolean;
  isPaid: boolean;
  lastPaid?: Date;
  planOpted?: string;
  credits: number;
  avatar?: string;
  verifyCode?: string;
  verifyCodeExpiry?: Date;
  isPasswordCorrect(password: string): Promise<boolean>;
}

// Interface for User model
export interface IUserModel extends Model<IUser> {}

const userSchema = new mongoose.Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      match: [/.+\@.+\..+/, "Please use a valid email address"],
    },
    password: {
      type: String,
      required: false, // ✅ optional
      default: null,
    },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    oauthId: {
      type: String,
      default: null,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    lastPaid: {
      type: Date,
      default: null,
    },
    planOpted: {
      type: String,
      enum: ["free", "premium"],
      default: "free",
    },
    credits: {
      type: Number,
      default: 0,
    },
    avatar: {
      type: String,
    },
    verifyCode: {
      type: String,
      default: null,
    },
    verifyCodeExpiry: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
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

const User: IUserModel = mongoose.model<IUser, IUserModel>("User", userSchema);
export default User;



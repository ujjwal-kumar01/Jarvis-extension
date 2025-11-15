import { ExpressAuth } from "@auth/express";
import Google from "@auth/express/providers/google";
import User from "../models/user.models.js"; // your Mongoose model
import app from "../app.js";

app.set("trust proxy", true);

app.use(
  "/auth/*",
  ExpressAuth({
    providers: [
      Google({
        clientId: process.env.GOOGLE_CLIENT_ID || "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      }),
    ],
    secret: process.env.AUTH_SECRET || "",
    session: { strategy: "jwt" },

    callbacks: {
      async signIn({ user }) {
        try {
          // Check if user already exists
          let existingUser = await User.findOne({ email: user.email });

          if (!existingUser) {
            // Create new user with your schema defaults
            existingUser = new User({
              username: user.name || user.email?.split("@")[0],
              email: user.email,
              password: "", // since Google users don’t set password
              isVerified: true, // already verified since via Google
              isPaid: false,
              lastPaid: null,
              planOpted: "free",
              credits: 100,
              avatar: user.image || "",
              verifyCode: "google-oauth", // dummy since not needed
              verifyCodeExpiry: new Date(),
            });

            await existingUser.save();
            console.log("✅ New user created:", existingUser.email);
          }

          return true;
        } catch (err) {
          console.error("Error in signIn callback:", err);
          return false;
        }
      },

      async jwt({ token, user }) {
        if (user) {
          token.id = user.id;
          token.email = user.email ?? null;
        }
        return token;
      },

      async session({ session, token }) {
        if (token) {
          session.user.id = typeof token.id === "string" ? token.id : "";
          session.user.email = token.email ?? "";
        }
        return session;
      },
    },
  })
);

app.listen(5000, () =>
  console.log("🚀 Auth server running on http://localhost:5000")
);

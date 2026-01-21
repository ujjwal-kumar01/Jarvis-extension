import Link from "next/link";
import Image from "next/image";
import React from "react";
import image2 from "../../../public/image2.png"

function Home() {
  return (
    <div >
    <div className="min-h-screen w-full bg-gradient-to-br from-black via-zinc-900 to-black text-white ">
      {/* HERO SECTION */}
      <div className="topImage">
      <section className="max-w-7xl mx-auto px-6 pt-28 pb-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
          Jarvis – Your Personal AI Control Center
        </h1>

        <p className="mt-6 text-lg md:text-xl text-zinc-400 max-w-3xl mx-auto">
          Jarvis helps you connect, manage, and control AI models like Gemini
          with usage limits, subscriptions, and secure access — all in one
          powerful dashboard.
        </p>

        <div className="mt-10 flex justify-center gap-6">
          <Link
            href="/sign-up"
            className="rounded-full px-8 py-3 text-sm font-semibold
                       bg-gradient-to-r from-purple-500 to-blue-500
                       hover:opacity-90 transition"
          >
            Get Started Free
          </Link>

          <Link
            href="/sign-in"
            className="rounded-full px-8 py-3 text-sm font-semibold
                       border border-white/20 text-zinc-300
                       hover:bg-white/5 transition"
          >
            Sign In
          </Link>
        </div>
      </section>

      <Image
      src={image2}
      alt="dashboard"
      className=" z-10 w-4/5 md:h-4/5 mx-auto "
      />

      {/* FEATURES */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-semibold text-center mb-14">
          What Jarvis Gives You
        </h2>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              title: "Bring Your Own API Key",
              desc: "Use your own Gemini API key or let Jarvis manage usage securely for you.",
            },
            {
              title: "Usage Limits & Plans",
              desc: "Free users get limited requests. Upgrade to monthly or yearly plans for higher RPD.",
            },
            {
              title: "Secure & Verified Accounts",
              desc: "Email verification, Google sign-in, password management, and protected API access.",
            },
            {
              title: "Clean Dashboard",
              desc: "Modern, distraction-free UI with all controls in one place.",
            },
            {
              title: "Future Model Support",
              desc: "Designed to support multiple AI providers beyond Gemini.",
            },
            {
              title: "Developer First",
              desc: "Built with scalability, rate limiting, and clean architecture in mind.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-white/10 bg-white/5
                         p-6 backdrop-blur-md hover:bg-white/10 transition"
            >
              <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-zinc-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-7xl mx-auto px-6 py-15">
        <h2 className="text-3xl font-semibold text-center mb-14">
          How Jarvis Works
        </h2>

        <div className="grid md:grid-cols-4 gap-8">
          {[
            {
              step: "01",
              title: "Create Account",
              desc: "Sign up using email or Google. Email users verify once.",
            },
            {
              step: "02",
              title: "Add API Key",
              desc: "Optionally add your Gemini API key from the dashboard.",
            },
            {
              step: "03",
              title: "Choose Plan",
              desc: "Free, Monthly, or Yearly — higher plans unlock more requests.",
            },
            {
              step: "04",
              title: "Start Using Jarvis",
              desc: "Access AI features securely within your usage limits.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="relative rounded-2xl border border-white/10 bg-black/40 p-6"
            >
              <span className="relative -top-4 text-5xl font-bold text-white/15">
                {item.step}
              </span>
              <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-zinc-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PLANS */}
      <section className="max-w-7xl mx-auto px-6 py-15">
        <h2 className="text-3xl font-semibold text-center mb-14">
          Simple Pricing
        </h2>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              name: "Free",
              price: "₹0",
              features: ["Limited requests/day", "Basic access", "Email support"],
            },
            {
              name: "Monthly",
              price: "₹XXX",
              features: [
                "Higher RPD",
                "Priority access",
                "Advanced limits",
              ],
              highlight: true,
            },
            {
              name: "Yearly",
              price: "₹XXXX",
              features: [
                "Maximum RPD",
                "Best value",
                "Priority support",
              ],
            },
          ].map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl p-6 border ${
                plan.highlight
                  ? "border-purple-500/50 bg-purple-500/10"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
              <p className="text-3xl font-bold mb-4">{plan.price}</p>
              <ul className="space-y-2 text-sm text-zinc-400">
                {plan.features.map((f) => (
                  <li key={f}>• {f}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 text-center">
        <h2 className="text-3xl font-semibold mb-6">
          Ready to Build With Jarvis?
        </h2>
        <Link
          href="/sign-up"
          className="inline-block rounded-full px-10 py-4 text-sm font-semibold
                     bg-gradient-to-r from-purple-500 to-blue-500
                     hover:opacity-90 transition"
        >
          Start Free Now
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 py-8 text-center text-sm text-zinc-500">
        © {new Date().getFullYear()} Jarvis. Built for developers.
      </footer>
      </div>
    </div>
    </div>
  );
}

export default Home;

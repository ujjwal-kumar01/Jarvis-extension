'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInSchema } from '@/schemas/signInSchema';
import axios from 'axios';
import { useState, useEffect } from 'react';
import { toast } from "sonner"
import { Loader2, SeparatorHorizontal } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { GoogleLogin } from '@react-oauth/google';
import { Separator } from "@/components/ui/separator"


export default function SignInForm() {
  // const searchParams = useSearchParams();
  // const reason = searchParams.get("reason");
  //  useEffect(() => {
  //    if (reason === "unauthorized") {
  //     console.log("reason", reason);
  //     toast.error("Please sign in to continue");
  //     router.replace('/sign-in');
  //   }
  // }, []);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const form = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: z.infer<typeof signInSchema>) => {
    setIsSubmitting(true);
    try {
    const response = await axios.post('/backend/user/login', data);
      console.log('User signed in successfully:', response.data);
      toast.success("user logged in successfully", {
        description: "Enjoy using Jarvis",
      })
      if(response.data.user.isEmailVerified === false){
      router.replace('/dashboard/verify'); 
      } else {
        router.replace('/dashboard/info');
      }
    } catch (error) {
      let message = "Something went wrong";

      if (axios.isAxiosError(error)) {
        message =
          error.response?.data?.message ||
          error.response?.data?.error ||
          "Login failed";
      }

      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };
  
   const handleGoogleLogin = async (credential: string) => {
    try {
      const response = await axios.post('/backend/user/google-login', {
        credential, // 🔥 THIS is the ID token
      });

      toast.success("User logged in successfully", {
        description: "Enjoy using Jarvis",
      });

      router.replace('/dashboard/info');
    } catch (error) {
      let message = "Something went wrong";

      if (axios.isAxiosError(error)) {
        message =
          error.response?.data?.message ||
          error.response?.data?.error ||
          "Google login failed";
      }

      toast.error(message);
    }
  };

  return (
    <div className="h-screen w-full bg-gradient-to-br from-black via-zinc-900 to-black overflow-hidden">
      <div className="h-full w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 rounded-2xl border border-white/10 shadow-2xl">

        {/* LEFT – SIGN IN */}
        <div className="flex items-center justify-center bg-black text-white">
          {/* FLOATING SIGN-IN CARD */}
          <div className="w-full max-w-sm p-8 rounded-2xl bg-gradient-to-tr from-purple-500/10 via-transparent to-blue-500/10 border border-zinc-800 shadow-xl">
            <h1 className="text-2xl font-bold mb-1 text-center">
              Welcome back
            </h1>
            <p className="text-zinc-400 mb-6 text-center">
              Continue to use<span className="text-white"> Jarvis</span>
            </p>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  name="email"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-zinc-300">
                        Email 
                      </FormLabel>
                      <Input
                        {...field}
                        className="h-10 bg-zinc-800 border-zinc-700 text-white"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  name="password"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-zinc-300">
                        Password
                      </FormLabel>
                      <Input
                        type="password"
                        {...field}
                        className="h-10 bg-zinc-800 border-zinc-700 text-white"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                

                <Button
                  type="submit"
                  className="w-full h-10 bg-white text-black hover:bg-zinc-200"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Please wait
                </>
              ) : (
                'Log In'
              )}
                </Button>
              </form>
            </Form>

            <Separator className="my-6 bg-zinc-700" />

            <div className="mt-4 flex justify-center">
              <GoogleLogin
                onSuccess={(response) => {
                  if (!response.credential) {
                    toast.error("Google login failed");
                    return;
                  }
                  handleGoogleLogin(response.credential);
                }}
                onError={() => {
                  toast.error("Google login failed");
                }}
                theme="filled_black"
                shape="pill"
                size="medium"
                width="200"
              />
            </div>

            <p className="text-xs text-zinc-400 mt-2.5 text-center">
              Don&apos;t have an account?{' '}
              <Link href="/sign-up" className="text-white underline">
                Sign up
              </Link>
            </p>
          </div>
        </div>

        {/* RIGHT – HERO */}
        <div className="hidden md:flex flex-col justify-center items-center bg-black text-white p-10 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 via-transparent to-blue-500/10" />

          <h2 className="text-4xl font-semibold mb-4 text-center z-10">
            400k+ users.<br />50M+ AI actions.
          </h2>

          <p className="text-zinc-400 text-center max-w-sm z-10">
            Jarvis helps developers think, build, and ship faster using AI.
          </p>

          {/* 3D placeholder */}
          <div className="mt-10 w-[320px] h-[320px] z-10" />
        </div>
      </div>
    </div>
  );
}

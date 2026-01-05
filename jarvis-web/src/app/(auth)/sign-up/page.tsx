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
import { signUpSchema } from '@/schemas/signUpSchema';
import { useState } from 'react';
import axios from 'axios';
import { toast } from "sonner"
import type { AxiosError } from "axios";
import { Loader2 } from 'lucide-react';


export default function SignUpForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: z.infer<typeof signUpSchema>) => {
    setIsSubmitting(true);
    try {
      const response = await axios.post('/backend/user/signup', data);
      console.log('User signed up successfully:', response.data);
      toast("User has been created", {
        description: "Please verify your email to use Jarvis",
      })
      router.replace(`/dashboard/verify`);
    } catch (error) {
      let message = "Something went wrong";

      if (axios.isAxiosError(error)) {
        message =
          error.response?.data?.message ||
          error.response?.data?.error ||
          "Signup failed";
      }

      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }

    console.log(data);
  };

  return (
    <div className="h-screen w-full bg-gradient-to-br from-black via-zinc-900 to-black overflow-hidden">
      <div className="h-full w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 rounded-2xl border border-white/10 shadow-2xl">

        {/* LEFT – SIGN UP */}
        <div className="flex items-center justify-center bg-black text-white">
          {/* FLOATING SIGN-UP CARD */}
          <div className="w-full max-w-sm p-8 rounded-2xl bg-gradient-to-tr from-purple-500/10 via-transparent to-blue-500/10 border border-zinc-800 shadow-xl">
            <h1 className="text-2xl font-bold mb-1 text-center">
              Create account
            </h1>
            <p className="text-zinc-400 mb-6 text-center">
              Join <span className="text-white">Jarvis</span> today
            </p>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

                {/* USERNAME */}
                <FormField
                  name="username"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-zinc-300">
                        Username
                      </FormLabel>
                      <Input
                        {...field}
                        className="h-10 bg-zinc-800 border-zinc-700 text-white"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* EMAIL */}
                <FormField
                  name="email"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-zinc-300">
                        Email
                      </FormLabel>
                      <Input
                        type="email"
                        {...field}
                        className="h-10 bg-zinc-800 border-zinc-700 text-white"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* PASSWORD */}
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
                >{isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Please wait
                </>
              ) : (
                'Sign Up'
              )}
                </Button>
              </form>
            </Form>

            <p className="text-xs text-zinc-400 mt-5 text-center">
              Already have an account?{' '}
              <Link href="/sign-in" className="text-white underline">
                Log in
              </Link>
            </p>
          </div>
        </div>

        {/* RIGHT – HERO */}
        <div className="hidden md:flex flex-col justify-center items-center bg-black text-white p-10 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 via-transparent to-blue-500/10" />

          <h2 className="text-4xl font-semibold mb-4 text-center z-10">
            Build faster.<br />Think smarter.
          </h2>

          <p className="text-zinc-400 text-center max-w-sm z-10">
            Jarvis helps developers turn ideas into reality using AI.
          </p>

          {/* 3D placeholder */}
          <div className="mt-10 w-[320px] h-[320px] z-10" />
        </div>
      </div>
    </div>
  );
}

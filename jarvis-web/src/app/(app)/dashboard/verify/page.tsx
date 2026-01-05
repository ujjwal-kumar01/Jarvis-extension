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
import { verifySchema } from '@/schemas/verifySchema';

export default function VerifyForm() {
  const router = useRouter();

  const form = useForm<z.infer<typeof verifySchema>>({
    resolver: zodResolver(verifySchema),
    defaultValues: {
      code: '',
    },
  });

  const onSubmit = async (data: z.infer<typeof verifySchema>) => {
    console.log(data);
  };

  return (
    <div className="h-screen w-full bg-gradient-to-br from-black via-zinc-900 to-black overflow-hidden">
      <div className="h-full w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 rounded-2xl border border-white/10 shadow-2xl">

        {/* LEFT – VERIFY */}
        <div className="flex items-center justify-center bg-black text-white">
          {/* FLOATING VERIFY CARD */}
          <div className="w-full max-w-sm p-8 rounded-2xl bg-gradient-to-tr from-purple-500/10 via-transparent to-blue-500/10 border border-zinc-800 shadow-xl">
            <h1 className="text-2xl font-bold mb-1 text-center">
              Verify your email
            </h1>
            <p className="text-zinc-400 mb-6 text-center">
              Enter the code sent to your email
            </p>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  name="code"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-zinc-300">
                        Verification Code
                      </FormLabel>
                      <Input
                        {...field}
                        placeholder="Enter 6-digit code"
                        className="h-10 bg-zinc-800 border-zinc-700 text-white text-center tracking-widest"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-10 bg-white text-black hover:bg-zinc-200"
                >
                  Verify
                </Button>
              </form>
            </Form>

            <p className="text-xs text-zinc-400 mt-5 text-center">
              Didn&apos;t receive the code?{' '}
              <button className="text-white underline">
                Resend
              </button>
            </p>

            <p className="text-xs text-zinc-500 mt-2 text-center">
              <Link href="/sign-in" className="underline">
                Back to sign in
              </Link>
            </p>
          </div>
        </div>

        {/* RIGHT – HERO */}
        <div className="hidden md:flex flex-col justify-center items-center bg-black text-white p-10 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 via-transparent to-blue-500/10" />

          <h2 className="text-4xl font-semibold mb-4 text-center z-10">
            Almost there 🚀
          </h2>

          <p className="text-zinc-400 text-center max-w-sm z-10">
            Verify your email to unlock all Jarvis features.
          </p>

          {/* 3D placeholder */}
          <div className="mt-10 w-[320px] h-[320px] z-10" />
        </div>
      </div>
    </div>
  );
}

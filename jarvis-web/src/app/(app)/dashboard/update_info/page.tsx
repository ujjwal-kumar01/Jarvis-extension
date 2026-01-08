'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import  { useUser } from '@/app/context/userContext';

function UpdateInfo() {
  
// Simulated user data from context
const { user, setUser } = useUser();
const hasPassword = user?.hasPassword || false;

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  password: hasPassword
    ? z.string().min(6, 'Password must be at least 6 characters').optional()
    : z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Confirm Password must match'),
});

type FormData = z.infer<typeof schema>;

  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar || null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: FormData) => {
    console.log('Form submitted:', data);
    // Here: send data + avatar to backend
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setAvatarPreview(URL.createObjectURL(file));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-xl bg-gray-900/80 backdrop-blur-md border border-gray-800 rounded-2xl shadow-2xl p-8 space-y-8">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Update Profile</h1>
          <p className="text-sm text-gray-400 mt-1">Manage your Jarvis account settings</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

          {/* Avatar */}
          <div className="flex flex-col items-center gap-4">
            <img
              src={avatarPreview || '/avatar-placeholder.png'}
              alt="Avatar"
              className="w-24 h-24 rounded-full object-cover border border-gray-700"
            />
            <label className="cursor-pointer text-sm text-blue-400 hover:text-blue-300 transition">
              Change Avatar
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </label>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Name</label>
            <input
              type="text"
              {...register('name')}
              placeholder="Your name"
              className="w-full bg-black/60 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            {errors.name && (
              <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>
            )}
          </div>

          {/* Email (Read-only) */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <div className="relative">
              <input
                type="email"
                disabled
                value="verified@email.com"
                className="w-full bg-black/40 border border-gray-800 rounded-lg px-4 py-2 text-sm text-gray-400 cursor-not-allowed"
              />
              <span className="absolute right-3 top-2 text-xs text-green-400">
                Verified ✓
              </span>
            </div>
          </div>

          {/* Password Section */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Security</h2>
            <div className="space-y-4">
              {hasPassword && (
                <input
                  type="password"
                  placeholder="Current password"
                  {...register('password')}
                  className="w-full bg-black/60 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              )}
              <input
                type="password"
                placeholder={hasPassword ? 'New password' : 'Set password'}
                {...register('password')}
                className="w-full bg-black/60 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <input
                type="password"
                placeholder="Confirm password"
                {...register('confirmPassword')}
                className="w-full bg-black/60 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {errors.password && (
                <p className="text-xs text-red-400">{errors.password.message}</p>
              )}
              {errors.confirmPassword && (
                <p className="text-xs text-red-400">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          {/* Save Button */}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 transition py-2.5 rounded-lg font-medium tracking-wide"
          >
            Save Changes
          </button>

        </form>
      </div>
    </div>
  );
};

export default UpdateInfo;

'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUser } from '@/app/context/userContext';
import { toast } from 'sonner';
import axios from 'axios';

function UpdateInfo() {
  const { user, setUser } = useUser();
  const hasPassword = user?.hasPassword ?? false;

  /* =======================
     Zod Schema
  ======================== */
  const schema = z
    .object({
      username: z.string().min(2, 'Name must be at least 2 characters'),
      oldPassword: z.string().optional(),
      password: z.string().optional(),
      confirmPassword: z.string().optional(),
      avatar: z
        .custom<FileList>()
        .optional()
        .refine(
          files => !files || files.length === 0 || files[0].size <= 2_000_000,
          'Avatar must be under 2MB'
        )
        .refine(
          files =>
            !files ||
            files.length === 0 ||
            ['image/png', 'image/jpeg', 'image/webp'].includes(files[0].type),
          'Only PNG, JPG, or WEBP images are allowed'
        )
    })
    .refine(
      data => !data.password || data.password === data.confirmPassword,
      {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
      }
    )
    .refine(
      data => !hasPassword || !data.password || !!data.oldPassword,
      {
        message: 'Current password is required',
        path: ['oldPassword'],
      }
    );

  type FormData = z.infer<typeof schema>;

  /* =======================
     Avatar Preview
  ======================== */
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    user?.avatar || null
  );

  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  useEffect(() => {
    if (user?.avatar && !avatarPreview?.startsWith('blob:')) {
      setAvatarPreview(user.avatar);
    }
  }, [user]);

  /* =======================
     React Hook Form
  ======================== */
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (user) {
      reset({ username: user.username });
    }
  }, [user, reset]);

  /* =======================
     Submit Handler
  ======================== */
  const onSubmit = async (data: FormData) => {
    try {
      const formData = new FormData();

      // Only send changed fields
      if (data.username && data.username !== user?.username) {
        formData.append('username', data.username);
      }

      if (data.password) {
        formData.append('password', data.password);
      }

      if (data.oldPassword) {
        formData.append('oldPassword', data.oldPassword);
      }

      if (data.avatar?.[0]) {
        formData.append('avatar', data.avatar[0]);
      }

      // Prevent empty submit
      if ([...formData.keys()].length === 0) {
        toast.info('No changes to update');
        return;
      }

      const response = await axios.post(
        '/backend/user/updateProfile',
        formData,
        { withCredentials: true }
      );

      setUser(response.data.user);
      // reset({
      //   username: response.data.user.username,
      // });

      toast.success('Profile updated successfully');
    } catch (error) {
      console.log(error)
      let message = "Something went wrong";
      if (axios.isAxiosError(error)) {
        message =
          error.response?.data?.message ||
          error.response?.data?.error ||
          "Update Failed"
      }

      toast.error('Error updating profile', {
        description: message,
      });
    }
    reset({
      username: watch('username'),
      password: '',
      confirmPassword: '',
      oldPassword: '',
    });

  };

  /* =======================
     Avatar Change Handler
  ======================== */
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarPreview(prev => {
      if (prev?.startsWith('blob:')) {
        URL.revokeObjectURL(prev);
      }
      return URL.createObjectURL(file);
    });
  };

  /* =======================
     JSX
  ======================== */
  return (
    <div className="min-h-screen rounded-2xl bg-gradient-to-br from-black via-gray-900 to-black text-white flex items-center justify-center px-4">
      <div className="w-full m-3 max-w-xl bg-gray-900/80 backdrop-blur-md border border-gray-800 rounded-2xl shadow-2xl p-8 space-y-8">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Update Profile</h1>
          <p className="text-sm text-gray-400 mt-1">
            Manage your Jarvis account settings
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

          {/* Avatar */}
          <div className="flex flex-col items-center gap-4">
            <img
              src={avatarPreview || '/avatar-placeholder.png'}
              alt="Avatar"
              className="w-24 h-24 rounded-full object-cover border border-gray-700"
            />
            <label className="cursor-pointer text-sm text-blue-400 hover:text-blue-300">
              Change Avatar
              <input
                type="file"
                accept="image/*"
                {...register('avatar', {
                  onChange: handleAvatarChange,
                })}
                className="hidden"
              />
            </label>
            {errors.avatar && (
              <p className="text-xs text-red-400">{errors.avatar.message}</p>
            )}
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Name</label>
            <input
              {...register('username')}
              className="w-full bg-black/60 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            {errors.username && (
              <p className="text-xs text-red-400 mt-1">
                {errors.username.message}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="w-full">
            <label className="block text-sm text-gray-400 mb-1">
              Email
            </label>

            <input
              type="email"
              disabled
              value={user?.email || ''}
              className="w-full bg-black/40 border border-gray-800 rounded-lg px-4 py-2 text-sm text-gray-400 cursor-not-allowed focus:outline-none"
            />

            {/* Verification status */}
            <div className="mt-1">
              {user?.isEmailVerified ? (
                <span className="text-xs text-green-400 font-medium mx-2">
                  ✓ Verified
                </span>
              ) : (
                <span className="text-xs text-red-400 font-medium mx-2">
                  ⚠ Please verify your email
                </span>
              )}
            </div>
          </div>



          {/* Password Section */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Security</h2>

            {hasPassword && (
              <div>
                <input
                  type="password"
                  placeholder="Current password"
                  {...register('oldPassword')}
                  className="w-full bg-black/60 border border-gray-700 rounded-lg px-4 py-2 text-sm mb-2"
                />
                {errors.oldPassword && (
                  <p className="text-xs text-red-400">
                    {errors.oldPassword.message}
                  </p>
                )}
              </div>
            )}

            <input
              type="password"
              placeholder={hasPassword ? 'New password' : 'Set password'}
              {...register('password')}
              className="w-full bg-black/60 border border-gray-700 rounded-lg px-4 py-2 text-sm mt-2"
            />

            <input
              type="password"
              placeholder="Confirm password"
              {...register('confirmPassword')}
              className="w-full bg-black/60 border border-gray-700 rounded-lg px-4 py-2 text-sm mt-2"
            />

            {errors.confirmPassword && (
              <p className="text-xs text-red-400 mt-1">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 transition py-2.5 rounded-lg font-medium"
          >
            Save Changes
          </button>

        </form>
      </div>
    </div>
  );
}

export default UpdateInfo;

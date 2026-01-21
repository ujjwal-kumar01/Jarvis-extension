'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { useUser } from '@/app/context/userContext';
import axios from 'axios';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type FormValues = {
  apiKey: string;
};

function UpdateAPI() {
  const { user, setUser } = useUser();
  const [loading, setLoading] = React.useState(false);
  const [addOpen, setAddOpen] = React.useState(false);
  const [removeOpen, setRemoveOpen] = React.useState(false);

  // ✅ FIX 1: defaultValues added
  const { register, getValues, reset } = useForm<FormValues>({
    defaultValues: {
      apiKey: '',
    },
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Loading...
      </div>
    );
  }

  const hasKey = user.gemini?.isProvidedByUser;

  // 🔹 Add / Replace
  const submitApiKey = async () => {
    const apiKey = getValues("apiKey");
    if (!apiKey) {
      toast.error("API key is required");
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(
        '/backend/user/update-gemini-key',
        { apiKey },
        { withCredentials: true }
      );

      setUser(response.data.user);

      toast.success('API key updated successfully');

      // ✅ FIX 2: explicit reset
      reset({ apiKey: '' });
      setAddOpen(false);
    } catch (error) {
      toast.error('Failed to update API key');
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Remove
  const removeApiKey = async () => {
    try {
      setLoading(true);
      const response = await axios.delete(
        '/backend/user/removeGeminiKey',
        { withCredentials: true }
      );

      setUser(response.data.user);

      toast.success('API key removed successfully');
      setRemoveOpen(false);
    } catch (error) {
      console.log(error);
      toast.error('Failed to remove API key');
    } finally {
      setLoading(false);
    }
  };

  const last4 = user.gemini?.apiKeyLast4;

  const maskedKey = last4
    ? `**** **** **** ${last4}`
    : 'No API key set';

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white flex items-center justify-center px-4 rounded-2xl">
      <div className="w-full max-w-xl bg-gray-900/80 border border-gray-800 rounded-2xl shadow-2xl p-8 space-y-8">

        <div className="text-center">
          <h1 className="text-2xl font-semibold">API Settings</h1>
          <p className="text-sm text-gray-400">Manage your AI provider configuration</p>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Gemini API</h2>

          <input
            type="password"
            placeholder={hasKey ? 'Enter new Gemini API key' : 'Enter Gemini API key'}
            {...register('apiKey')}
            className="w-full bg-black/40 border border-gray-800 rounded-lg px-4 py-2 text-sm"
          />

          <p className="text-xs text-gray-500">
            {hasKey
              ? 'Your existing key will be replaced.'
              : 'Your API key will be encrypted and securely stored.'}
          </p>

          <div className="flex gap-3">

            {/* ADD / REPLACE */}
            <AlertDialog open={addOpen} onOpenChange={setAddOpen}>
              <AlertDialogTrigger asChild>
                <Button disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  {hasKey ? 'Replace API Key' : 'Add Your API Key'}
                </Button>
              </AlertDialogTrigger>

              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {hasKey ? 'Replace API key?' : 'Add API key?'}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This action securely updates your Gemini API configuration.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                  <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={submitApiKey} disabled={loading}>
                    {loading ? 'Saving...' : 'Confirm'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* REMOVE */}
            {hasKey && (
              <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={loading}
                    className="flex-1 border-red-400 text-red-400"
                  >
                    Remove Key
                  </Button>
                </AlertDialogTrigger>

                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove API key?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove your Gemini API key.
                    </AlertDialogDescription>
                  </AlertDialogHeader>

                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={removeApiKey}
                      disabled={loading}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {loading ? 'Removing...' : 'Remove'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {/* Status */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Status</h2>

          <div className="rounded-lg border border-gray-800 bg-black/40 px-4 py-3 text-sm">
            {hasKey ? (
              <>
                <span className="text-green-400 font-medium">
                  Active — Using your Gemini API key
                </span>

                {/* ✅ FIX 3: better spacing + position */}
                <div className="mt-2">
                  <label className="block text-xs text-gray-500 mb-1">
                    Stored API Key
                  </label>
                  <input
                    disabled
                    value={maskedKey}
                    className="w-full bg-black/40 border border-gray-800 rounded-lg px-4 py-2 text-sm text-gray-400 tracking-widest"
                  />
                </div>
              </>
            ) : (
              <span className="text-yellow-400 font-medium">
                Not Active — please enter your Gemini API key
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default UpdateAPI;

// context/UserContext.tsx
'use client'; // Context itself runs on client

import { createContext, useContext, useState } from 'react';

interface User {
  _id?: string;
  name?: string;
  email?: string;
  avatar?: string;
  hasPassword?: boolean;
}

interface UserContextType {
  user: any | null;
  setUser: (user: any | null) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children, initialUser }: { children: React.ReactNode, initialUser: User }) => {
  const [user, setUser] = useState<User>(initialUser || {});

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser must be used within UserProvider");
  return context;
};

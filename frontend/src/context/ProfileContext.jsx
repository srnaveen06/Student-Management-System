import React, { createContext, useState, useContext } from 'react';
import ProfileModal from '../components/ProfileModal/ProfileModal';

const ProfileContext = createContext({ openProfile: () => {} });

export const useProfile = () => useContext(ProfileContext);

// Provider renders the global ProfileModal and exposes openProfile()
export const ProfileProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const openProfile = () => setIsOpen(true);
  const closeProfile = () => setIsOpen(false);

  return (
    <ProfileContext.Provider value={{ openProfile }}>
      {children}
      <ProfileModal isOpen={isOpen} onClose={closeProfile} />
    </ProfileContext.Provider>
  );
};
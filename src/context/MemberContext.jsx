import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

export const MemberContext = createContext();

export const MemberProvider = ({ children }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/customer`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch members');
      }

      const data = await response.json();
      setMembers(data);
    } catch (err) {
      console.error('Error fetching members:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // We only want to fetch members when MemberProvider mounts
  // However, we need a valid token. If the user logs in *after* this mounts,
  // we might miss fetching. A better approach is to provide the `fetchMembers`
  // function to be called after login or when the app becomes active,
  // or we can try to fetch immediately and handle the missing token case gracefully.
  useEffect(() => {
    fetchMembers();
  }, []);

  const refreshMembers = () => {
    fetchMembers();
  };

  return (
    <MemberContext.Provider
      value={{
        members,
        loading,
        error,
        fetchMembers,
        refreshMembers,
      }}
    >
      {children}
    </MemberContext.Provider>
  );
};

export const useMember = () => {
  return useContext(MemberContext);
};

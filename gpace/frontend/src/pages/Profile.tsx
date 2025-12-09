import React, { useEffect, useState } from 'react';
import { getUserProfile, updateUserProfile } from '@/utils/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const Profile = () => {
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    major: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getUserProfile();
        setProfile(data);
      } catch (err) {
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateUserProfile(profile);
      alert('Profile updated successfully');
    } catch (err) {
      setError('Failed to update profile');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Profile</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          name="name"
          value={profile.name}
          onChange={handleChange}
          placeholder="Name"
          required
        />
        <Input
          name="email"
          type="email"
          value={profile.email}
          onChange={handleChange}
          placeholder="Email"
          required
        />
        <Input
          name="major"
          value={profile.major}
          onChange={handleChange}
          placeholder="Major"
          required
        />
        <Button type="submit">Update Profile</Button>
      </form>
    </div>
  );
};

export default Profile;
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const fetchCourses = async (token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/courses`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    throw new Error('Error fetching courses');
  }
};

export const fetchGPA = async (token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/gpa`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    throw new Error('Error fetching GPA');
  }
};

export const uploadDocument = async (token, formData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/documents`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    throw new Error('Error uploading document');
  }
};
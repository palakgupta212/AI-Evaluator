import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

export const login = (username, password) =>
  api.post('/auth/login', { username, password });

export const uploadFile = (file, type, extra) => {
  const form = new FormData();
  form.append('file', file);
  Object.entries(extra || {}).forEach(([k, v]) => form.append(k, v));
  return api.post('/evaluate', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    params: { isKey: type === 'answerKey' },
  });
};

export const fetchTeacherDashboard = teacherId =>
  api.get(`/dashboard/teacher/${teacherId}`);
export const fetchStudentDashboard = studentId =>
  api.get(`/dashboard/student/${studentId}`);

export default api;

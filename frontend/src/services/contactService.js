import apiClient from './apiClient';

const trimTo = (value, maxLength) => String(value || '').trim().slice(0, maxLength);

export const contactService = {
  async create({ title, body, name, email }) {
    const payload = {
      title: trimTo(title, 30),
      body: trimTo(body, 100),
      name: trimTo(name, 80),
      email: trimTo(email, 120),
    };

    if (!payload.title || !payload.body || !payload.name || !payload.email) {
      throw new Error('Thieu thong tin lien he bat buoc.');
    }

    const res = await apiClient.post('/api/contact_us/create', payload);
    return res.data?.data ?? res.data;
  },
};

export default contactService;

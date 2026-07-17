export const validateNIK = (nik: string): boolean => {
  return /^\d{16}$/.test(nik);
};

export const validatePhone = (phone: string): boolean => {
  return /^08\d{8,13}$/.test(phone);
};

export const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const generateNomorDokumen = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][month - 1];
  const random = Math.floor(Math.random() * 900) + 100;
  return `PKK/${year}/${roman}/${random}`;
};

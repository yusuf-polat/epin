import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithQuery } from '../../setup/render';
import RegisterForm from '@/features/auth/components/RegisterForm';
import ResetPasswordForm from '@/features/auth/components/ResetPasswordForm';

const TOKEN = 'a'.repeat(64);
const { register, resetPassword, search } = vi.hoisted(() => ({ register: vi.fn(), resetPassword: vi.fn(), search: { value: '' } }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(search.value),
}));
vi.mock('@/features/auth/components/GoogleAuthButton', () => ({ default: () => null }));
vi.mock('@/features/auth/services/auth.api', () => ({
  authApi: { register, resetPassword, login: vi.fn(), google: vi.fn(), logout: vi.fn(), me: vi.fn(), forgotPassword: vi.fn() },
}));

beforeEach(() => {
  register.mockReset();
  resetPassword.mockReset();
});

describe('RegisterForm', () => {
  it('sözleşmeler onaylanmadan kayıt isteği gönderilmez', async () => {
    search.value = '';
    renderWithQuery(<RegisterForm />);
    await userEvent.type(screen.getByPlaceholderText('Adınız ve Soyadınız'), 'Test Kullanıcı');
    await userEvent.type(screen.getByPlaceholderText('ornek@nexuspin.io'), 'test@nexuspin.io');
    await userEvent.type(screen.getByPlaceholderText('En az 8 karakter'), 'Sifre1234');
    await userEvent.click(screen.getByRole('button', { name: 'Kayıt Ol ve Başla' }));

    expect(await screen.findByText('Devam etmek için sözleşmeleri onaylamanız gerekir')).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();

    register.mockResolvedValue({ user: { id: 'u1' } });
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'Kayıt Ol ve Başla' }));
    await waitFor(() => expect(register).toHaveBeenCalledWith(expect.objectContaining({ email: 'test@nexuspin.io', acceptTerms: true })));
  });
});

describe('ResetPasswordForm', () => {
  it('bağlantıda token yoksa formu göstermez', () => {
    search.value = '';
    renderWithQuery(<ResetPasswordForm />);
    expect(screen.getByText('Geçersiz Bağlantı')).toBeInTheDocument();
  });

  it('şifreler eşleşmezse istek atmaz, eşleşince token ile gönderir', async () => {
    search.value = `token=${TOKEN}`;
    renderWithQuery(<ResetPasswordForm />);
    const [pass, confirm] = screen.getAllByDisplayValue('');
    await userEvent.type(pass, 'YeniSifre123');
    await userEvent.type(confirm, 'Farkli123');
    await userEvent.click(screen.getByRole('button', { name: 'Şifremi Güncelle' }));
    expect(await screen.findByText('Şifreler eşleşmiyor')).toBeInTheDocument();
    expect(resetPassword).not.toHaveBeenCalled();

    resetPassword.mockResolvedValue(null);
    await userEvent.clear(confirm);
    await userEvent.type(confirm, 'YeniSifre123');
    await userEvent.click(screen.getByRole('button', { name: 'Şifremi Güncelle' }));
    await waitFor(() => expect(resetPassword).toHaveBeenCalledWith(TOKEN, 'YeniSifre123'));
    expect(await screen.findByText(/Şifreniz güncellendi/)).toBeInTheDocument();
  });
});

import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithQuery } from '../../setup/render';
import LoginForm from '@/features/auth/components/LoginForm';

const { push, refresh, login, twoFactorLogin } = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), login: vi.fn(), twoFactorLogin: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
  useSearchParams: () => new URLSearchParams('redirect=/hesabim/siparislerim'),
}));
vi.mock('@/features/auth/components/GoogleAuthButton', () => ({ default: () => null }));
vi.mock('@/features/auth/services/auth.api', () => ({
  authApi: { login, twoFactorLogin, register: vi.fn(), google: vi.fn(), logout: vi.fn(), me: vi.fn() },
  twoFactorApi: {},
}));

async function fillAndSubmit(email: string, password?: string) {
  await userEvent.type(screen.getByPlaceholderText('ornek@nexuspin.io'), email);
  if (password) await userEvent.type(screen.getByPlaceholderText('••••••••'), password);
  await userEvent.click(screen.getByRole('button', { name: 'Giriş Yap' }));
}

describe('LoginForm', () => {
  beforeEach(() => {
    push.mockReset();
    login.mockReset();
    twoFactorLogin.mockReset();
  });

  it('geçersiz alanlarda istek atmadan hata mesajlarını gösterir', async () => {
    renderWithQuery(<LoginForm />);
    await fillAndSubmit('gecersiz');

    expect(await screen.findByText('Geçerli bir e-posta adresi giriniz')).toBeInTheDocument();
    expect(screen.getByText('Şifre gereklidir')).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it('başarılı girişte güvenli yönlendirme adresine gider', async () => {
    login.mockResolvedValue({ id: 'u1', name: 'Test', email: 'a@b.com', role: 'USER' });
    renderWithQuery(<LoginForm />);
    await fillAndSubmit('a@b.com', 'Parola123');

    await waitFor(() => expect(push).toHaveBeenCalledWith('/hesabim/siparislerim'));
    expect(login).toHaveBeenCalledWith({ email: 'a@b.com', password: 'Parola123' });
  });

  it('sunucu hatasını kullanıcıya gösterir ve yönlendirmez', async () => {
    login.mockRejectedValue(new Error('E-posta veya şifre hatalı'));
    renderWithQuery(<LoginForm />);
    await fillAndSubmit('a@b.com', 'yanlis');

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('2FA açık hesapta yönlendirmeden önce doğrulama kodunu ister', async () => {
    login.mockResolvedValue({ twoFactorRequired: true, challengeToken: 'challenge-token' });
    twoFactorLogin.mockResolvedValue({ user: { id: 'u1', name: 'Test', email: 'a@b.com', role: 'USER' } });
    renderWithQuery(<LoginForm />);
    await fillAndSubmit('a@b.com', 'Parola123');

    const code = await screen.findByPlaceholderText('000000');
    expect(push).not.toHaveBeenCalled();
    const submit = screen.getByRole('button', { name: 'Doğrula ve Giriş Yap' });
    expect(submit).toBeDisabled();

    // Rakam dışı karakterler ayıklanır, 6 hane dolunca gönderilebilir
    await userEvent.type(code, '12a3456');
    expect(code).toHaveValue('123456');
    await userEvent.click(submit);

    await waitFor(() => expect(push).toHaveBeenCalledWith('/hesabim/siparislerim'));
    expect(twoFactorLogin).toHaveBeenCalledWith('challenge-token', '123456');
  });

  it('kurtarma kodu moduna geçilebilir', async () => {
    login.mockResolvedValue({ twoFactorRequired: true, challengeToken: 'c' });
    twoFactorLogin.mockRejectedValue(new Error('Doğrulama kodu hatalı'));
    renderWithQuery(<LoginForm />);
    await fillAndSubmit('a@b.com', 'Parola123');

    await userEvent.click(await screen.findByRole('button', { name: 'Kurtarma kodu kullan' }));
    const input = screen.getByPlaceholderText('XXXXX-XXXXX');
    await userEvent.type(input, 'abcde-fghjk');
    expect(input).toHaveValue('ABCDE-FGHJK');
    await userEvent.click(screen.getByRole('button', { name: 'Doğrula ve Giriş Yap' }));

    expect(await screen.findByText('Doğrulama kodu hatalı')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});

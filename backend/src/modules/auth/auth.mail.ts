import { env } from '@/config/env';
import { MailMessage } from '@/config/mailer';

const escapeHtml = (v: string) => v.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function passwordResetMail(to: string, name: string, token: string): MailMessage {
  const link = `${env.frontendUrl}/auth/sifre-sifirla?token=${encodeURIComponent(token)}`;
  const minutes = env.PASSWORD_RESET_TTL_MINUTES;
  return {
    to,
    subject: 'NexusPin şifre sıfırlama',
    text:
      `Merhaba ${name},\n\nŞifrenizi sıfırlamak için aşağıdaki bağlantıyı ${minutes} dakika içinde kullanınız:\n${link}\n\n` +
      'Bu isteği siz yapmadıysanız bu e-postayı dikkate almayınız; şifreniz değişmeyecektir.',
    html:
      `<p>Merhaba ${escapeHtml(name)},</p>` +
      `<p>Şifrenizi sıfırlamak için aşağıdaki bağlantıyı <strong>${minutes} dakika</strong> içinde kullanınız:</p>` +
      `<p><a href="${escapeHtml(link)}">Şifremi sıfırla</a></p>` +
      '<p>Bu isteği siz yapmadıysanız bu e-postayı dikkate almayınız; şifreniz değişmeyecektir.</p>',
  };
}

export function passwordChangedMail(to: string, name: string): MailMessage {
  return {
    to,
    subject: 'NexusPin şifreniz değiştirildi',
    text:
      `Merhaba ${name},\n\nHesabınızın şifresi az önce değiştirildi ve diğer cihazlardaki oturumlar kapatıldı.\n` +
      'Bu işlemi siz yapmadıysanız lütfen hemen destek ekibimizle iletişime geçiniz.',
  };
}

export function emailVerificationMail(to: string, name: string, token: string): MailMessage {
  const link = `${env.frontendUrl}/auth/eposta-dogrula?token=${encodeURIComponent(token)}`;
  const hours = env.EMAIL_VERIFICATION_TTL_HOURS;
  return {
    to,
    subject: 'NexusPin e-posta adresinizi doğrulayın',
    text:
      `Merhaba ${name},\n\nNexusPin hesabınızı doğrulamak için aşağıdaki bağlantıyı ${hours} saat içinde açınız:\n${link}\n\n` +
      'Bu hesabı siz oluşturmadıysanız bu e-postayı dikkate almayınız.',
    html:
      `<p>Merhaba ${escapeHtml(name)},</p>` +
      `<p>NexusPin hesabınızı doğrulamak için aşağıdaki bağlantıyı <strong>${hours} saat</strong> içinde açınız:</p>` +
      `<p><a href="${escapeHtml(link)}">E-posta adresimi doğrula</a></p>` +
      '<p>Bu hesabı siz oluşturmadıysanız bu e-postayı dikkate almayınız.</p>',
  };
}

export function twoFactorChangedMail(to: string, name: string, enabled: boolean): MailMessage {
  return {
    to,
    subject: enabled ? 'NexusPin iki adımlı doğrulama açıldı' : 'NexusPin iki adımlı doğrulama kapatıldı',
    text:
      `Merhaba ${name},\n\nHesabınızda iki adımlı doğrulama ${enabled ? 'açıldı' : 'kapatıldı'}.\n` +
      'Bu işlemi siz yapmadıysanız lütfen hemen şifrenizi değiştirip destek ekibimizle iletişime geçiniz.',
  };
}

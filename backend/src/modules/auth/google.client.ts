import { env } from '@/config/env';
import { UnauthorizedError } from '@/utils/errors';
import { GoogleAuthDTO, GoogleProfile } from './auth.types';
import { GOOGLE_REQUEST_TIMEOUT_MS } from './auth.constants';

interface GoogleTokenInfo {
  aud?: string;
  azp?: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  picture?: string;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(GOOGLE_REQUEST_TIMEOUT_MS) });
  } catch {
    throw new UnauthorizedError('Google doğrulama servisine ulaşılamadı', 'GOOGLE_UNREACHABLE');
  }
  if (!res.ok) throw new UnauthorizedError('Google kimlik doğrulaması başarısız oldu', 'GOOGLE_INVALID_TOKEN');
  return (await res.json()) as T;
}

/**
 * Google'dan gelen token'ı Google sunucularında doğrular. Token'ın bizim
 * client ID'mize ait olduğu ve e-postanın doğrulanmış olduğu kontrol edilir.
 * İstemcinin gönderdiği e-posta/isim bilgisine asla güvenilmez.
 */
export async function verifyGoogleIdentity(dto: GoogleAuthDTO): Promise<GoogleProfile> {
  const info = dto.credential
    ? await fetchJson<GoogleTokenInfo>(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(dto.credential)}`)
    : await fetchJson<GoogleTokenInfo>(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(dto.accessToken!)}`);

  const audience = info.aud ?? info.azp;
  if (!env.GOOGLE_CLIENT_ID || audience !== env.GOOGLE_CLIENT_ID) {
    throw new UnauthorizedError('Google token bu uygulamaya ait değil', 'GOOGLE_AUDIENCE_MISMATCH');
  }

  const verified = info.email_verified === true || info.email_verified === 'true';
  if (!info.email || !verified) {
    throw new UnauthorizedError('Google hesabınızın e-posta adresi doğrulanmamış', 'GOOGLE_EMAIL_UNVERIFIED');
  }

  let { name, picture } = info;
  // Access token ile gelen tokeninfo profil bilgisi içermez; userinfo'dan tamamla
  if (!dto.credential && (!name || !picture)) {
    const profile = await fetchJson<{ name?: string; picture?: string }>('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${dto.accessToken}` },
    }).catch(() => ({} as { name?: string; picture?: string }));
    name = name ?? profile.name;
    picture = picture ?? profile.picture;
  }

  return { email: info.email.toLowerCase(), name, picture };
}

export interface RegisterDTO {
  email: string;
  name: string;
  password: string;
  acceptTerms: true;
}

export interface ResetPasswordDTO {
  token: string;
  password: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

/** Google Identity Services'tan gelen ID token (credential) veya OAuth access token */
export interface GoogleAuthDTO {
  credential?: string;
  accessToken?: string;
}

export interface GoogleProfile {
  email: string;
  name?: string;
  picture?: string;
}

export interface TwoFactorLoginDTO {
  challengeToken: string;
  code: string;
}

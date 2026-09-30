/** Backend'den JSON olarak gelen tarih alanları (ISO 8601) */
export type ISODateString = string;

export type Nullable<T> = T | null;

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
}

/** Durum rozetleri için ortak etiket + sınıf tanımı */
export interface StatusStyle {
  label: string;
  className: string;
}

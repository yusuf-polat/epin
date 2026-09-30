\# 🏗️ Full-Stack Proje Mimarisi



Bu proje iki ana uygulamadan oluşan, \*\*ayrıştırılmış frontend/backend mimarisine\*\* sahiptir.



```text

project/

│

├── backend/          # Node.js + Express + TypeScript

│

├── frontend/         # Next.js + TypeScript

│

├── docker-compose.yml

├── .gitignore

└── README.md

```



Temel yaklaşım:



```text

&#x20;                   ┌──────────────────────┐

&#x20;                   │       Frontend       │

&#x20;                   │       Next.js        │

&#x20;                   │   React + TypeScript │

&#x20;                   └──────────┬───────────┘

&#x20;                              │

&#x20;                        HTTP / JSON

&#x20;                              │

&#x20;                              ▼

&#x20;                   ┌──────────────────────┐

&#x20;                   │       Backend        │

&#x20;                   │   Node.js + Express   │

&#x20;                   │      TypeScript      │

&#x20;                   └──────────┬───────────┘

&#x20;                              │

&#x20;               ┌──────────────┼──────────────┐

&#x20;               ▼              ▼              ▼

&#x20;          PostgreSQL       Redis          Storage

&#x20;            Prisma                       S3/Cloudinary

```



\---



\# 1. Mimari Felsefe



Proje genelinde \*\*Feature-Based / Domain-Oriented Architecture\*\* kullanılmaktadır.



Amaç:



\* Business logic'in birbirine karışmasını engellemek

\* Frontend ve backend'i bağımsız geliştirebilmek

\* Büyük projelerde kodun bulunabilirliğini artırmak

\* Test edilebilirliği yükseltmek

\* Yeni feature eklemeyi kolaylaştırmak

\* Takım halinde geliştirmeyi kolaylaştırmak

\* Backend ve frontend arasında net bir API kontratı oluşturmak



Ana prensip:



> Kod, teknik katmana göre değil mümkün olduğunca iş alanına göre organize edilir.



Kötü yaklaşım:



```text

controllers/

services/

repositories/

models/

```



Daha iyi yaklaşım:



```text

modules/

├── users/

├── listings/

├── appointments/

├── categories/

└── locations/

```



Her feature kendi sorumluluklarını taşır.



\---



\# 2. Monorepo Yapısı



Önerilen proje yapısı:



```text

project/

│

├── backend/

│   ├── src/

│   ├── prisma/

│   ├── tests/

│   ├── Dockerfile

│   ├── package.json

│   └── tsconfig.json

│

├── frontend/

│   ├── src/

│   ├── public/

│   ├── tests/

│   ├── Dockerfile

│   ├── package.json

│   └── tsconfig.json

│

├── docker-compose.yml

├── .gitignore

└── README.md

```



Frontend ve backend birbirinden bağımsız deploy edilebilir.



Örneğin:



```text

Frontend

https://www.example.com



Backend

https://api.example.com

```



\---



\# 3. Backend Mimarisi



Backend:



```text

Node.js

Express

TypeScript

Prisma

PostgreSQL

Redis

Zod

```



şeklinde yapılandırılır.



\## Backend klasör yapısı



```text

backend/

│

├── prisma/

│   ├── schema.prisma

│   └── migrations/

│

├── src/

│   │

│   ├── config/

│   │   ├── env.ts

│   │   ├── db.ts

│   │   ├── prisma.ts

│   │   └── redis.ts

│   │

│   ├── middlewares/

│   │   ├── auth.middleware.ts

│   │   ├── errorHandler.ts

│   │   ├── validateRequest.ts

│   │   ├── rateLimit.ts

│   │   └── notFound.ts

│   │

│   ├── utils/

│   │   ├── apiResponse.ts

│   │   ├── logger.ts

│   │   ├── asyncHandler.ts

│   │   └── errors.ts

│   │

│   ├── modules/

│   │   │

│   │   ├── auth/

│   │   ├── users/

│   │   ├── listings/

│   │   ├── categories/

│   │   ├── locations/

│   │   ├── appointments/

│   │   └── ...

│   │

│   ├── app.ts

│   └── server.ts

│

├── tests/

│

├── Dockerfile

├── package.json

└── tsconfig.json

```



\---



\# 4. Backend Module Yapısı



Örneğin `listings`:



```text

modules/

└── listings/

&#x20;   │

&#x20;   ├── listing.controller.ts

&#x20;   ├── listing.service.ts

&#x20;   ├── listing.repository.ts

&#x20;   ├── listing.routes.ts

&#x20;   ├── listing.schema.ts

&#x20;   ├── listing.types.ts

&#x20;   └── listing.constants.ts

```



\### Controller



HTTP katmanıdır.



Sorumlulukları:



\* Request okumak

\* Request'ten gerekli veriyi almak

\* Service çağırmak

\* HTTP response oluşturmak



Controller:



```text

req

&#x20;↓

controller

&#x20;↓

service

&#x20;↓

response

```



Controller içerisinde:



```text

❌ Prisma sorgusu

❌ Business logic

❌ Karmaşık hesaplama

❌ DB transaction

```



bulunmaz.



\---



\# 5. Service



Business logic burada bulunur.



Örneğin:



```text

Create Listing

&#x20;      ↓

User kontrolü

&#x20;      ↓

Category kontrolü

&#x20;      ↓

Location kontrolü

&#x20;      ↓

Listing oluştur

&#x20;      ↓

Cache temizle

&#x20;      ↓

Sonucu dön

```



Service:



```text

❌ req

❌ res

❌ Express bağımlılığı

```



kullanmaz.



Böylece service kolayca unit test edilebilir.



\---



\# 6. Repository



Repository yalnızca data access katmanıdır.



Örneğin:



```ts

export async function findListingById(id: string) {

&#x20; return prisma.listing.findUnique({

&#x20;   where: { id },

&#x20; });

}

```



Repository:



```text

Controller

&#x20;     ↓

Service

&#x20;     ↓

Repository

&#x20;     ↓

Prisma

&#x20;     ↓

PostgreSQL

```



şeklinde çalışır.



Repository'de business rule bulunmaz.



\---



\# 7. Validation



Request validation için Zod kullanılır.



Örneğin:



```text

listing.schema.ts

```



```ts

export const createListingSchema = z.object({

&#x20; title: z.string().min(3),

&#x20; price: z.number().positive(),

&#x20; categoryId: z.string().uuid(),

});

```



Akış:



```text

Request

&#x20;  ↓

Zod Validation

&#x20;  ↓

Controller

&#x20;  ↓

Service

```



Invalid request service katmanına ulaşmadan reddedilir.



\---



\# 8. Error Handling



Global error handler kullanılmalıdır.



```text

Service

&#x20;  │

&#x20;  └── throw AppError

&#x20;            ↓

&#x20;     errorHandler

&#x20;            ↓

&#x20;      HTTP Response

```



Örneğin:



```ts

throw new NotFoundError("Listing bulunamadı");

```



Frontend'e:



```json

{

&#x20; "success": false,

&#x20; "error": {

&#x20;   "code": "LISTING\_NOT\_FOUND",

&#x20;   "message": "Listing bulunamadı"

&#x20; }

}

```



gibi standart bir format döndürülür.



\---



\# 9. API Response Standardı



API response formatı mümkün olduğunca standart tutulmalıdır.



Başarılı response:



```json

{

&#x20; "success": true,

&#x20; "data": {}

}

```



Liste:



```json

{

&#x20; "success": true,

&#x20; "data": \[],

&#x20; "meta": {

&#x20;   "page": 1,

&#x20;   "limit": 20,

&#x20;   "total": 120

&#x20; }

}

```



Hata:



```json

{

&#x20; "success": false,

&#x20; "error": {

&#x20;   "code": "VALIDATION\_ERROR",

&#x20;   "message": "Geçersiz istek",

&#x20;   "details": {}

&#x20; }

}

```



\---



\# 10. Database



PostgreSQL ana database olarak kullanılır.



Prisma:



```text

Application

&#x20;    ↓

Repository

&#x20;    ↓

Prisma

&#x20;    ↓

PostgreSQL

```



Prisma singleton:



```text

src/config/prisma.ts

```



içerisinden export edilir.



Development ortamında birden fazla Prisma Client instance oluşması engellenmelidir.



\---



\# 11. Frontend Mimarisi



Frontend:



```text

Next.js

React

TypeScript

App Router

```



kullanır.



Önerilen frontend yapısı:



```text

frontend/

│

├── src/

│   │

│   ├── app/

│   │

│   ├── features/

│   │

│   ├── components/

│   │

│   ├── lib/

│   │

│   ├── hooks/

│   │

│   ├── config/

│   │

│   ├── types/

│   │

│   └── styles/

│

├── public/

│

├── package.json

└── tsconfig.json

```



\---



\# 12. Next.js `app` Klasörü



`app` klasörünün ana sorumluluğu:



```text

Routing

Layout

Loading

Error

Metadata

Page composition

```



Business logic burada tutulmaz.



Örnek:



```text

app/

│

├── (public)/

│   ├── page.tsx

│   ├── listings/

│   │   └── page.tsx

│   └── listings/

│       └── \[slug]/

│           └── page.tsx

│

├── (auth)/

│   ├── login/

│   │   └── page.tsx

│   └── register/

│       └── page.tsx

│

├── (dashboard)/

│   ├── dashboard/

│   │   └── page.tsx

│   │

│   ├── listings/

│   │   ├── page.tsx

│   │   ├── new/

│   │   │   └── page.tsx

│   │   └── \[id]/

│   │       └── page.tsx

│   │

│   └── settings/

│       └── page.tsx

│

├── layout.tsx

├── loading.tsx

├── error.tsx

└── not-found.tsx

```



Route Groups:



```text

(auth)

(public)

(dashboard)

```



URL'e dahil olmaz.



Örneğin:



```text

app/(dashboard)/dashboard/page.tsx

```



URL:



```text

/dashboard

```



olur.



\---



\# 13. Frontend Feature-Based Architecture



Frontend'deki asıl business/domain kodları:



```text

features/

```



altında bulunur.



Örneğin:



```text

features/

│

├── auth/

│   ├── components/

│   ├── hooks/

│   ├── services/

│   ├── schemas/

│   ├── actions/

│   ├── types.ts

│   └── constants.ts

│

├── listings/

│   ├── components/

│   ├── hooks/

│   ├── services/

│   ├── schemas/

│   ├── actions/

│   ├── types.ts

│   └── constants.ts

│

├── users/

│   ├── components/

│   ├── hooks/

│   ├── services/

│   └── types.ts

│

├── appointments/

│   ├── components/

│   ├── hooks/

│   ├── services/

│   └── types.ts

│

└── locations/

&#x20;   ├── components/

&#x20;   ├── hooks/

&#x20;   ├── services/

&#x20;   └── types.ts

```



\---



\# 14. Frontend Feature Örneği



`listings`:



```text

features/listings/

│

├── components/

│   ├── ListingCard.tsx

│   ├── ListingGrid.tsx

│   ├── ListingFilters.tsx

│   ├── ListingForm.tsx

│   └── ListingMap.tsx

│

├── services/

│   └── listing.api.ts

│

├── hooks/

│   ├── useListings.ts

│   └── useListingFilters.ts

│

├── schemas/

│   └── listing.schema.ts

│

├── actions/

│   └── listing.actions.ts

│

├── types.ts

└── constants.ts

```



\---



\# 15. API Client



Frontend'in backend'e yaptığı HTTP istekleri tek bir abstraction üzerinden yapılmalıdır.



Örneğin:



```text

lib/api/

├── client.ts

├── errors.ts

└── types.ts

```



```ts

apiClient.get("/listings");

apiClient.post("/listings", data);

apiClient.patch(`/listings/${id}`, data);

apiClient.delete(`/listings/${id}`);

```



Her feature kendi API fonksiyonlarını içerir:



```text

features/listings/services/listing.api.ts

```



Örneğin:



```ts

export async function getListings(params: ListingFilters) {

&#x20; return apiClient.get("/listings", {

&#x20;   params,

&#x20; });

}

```



Böylece component içinde:



```ts

fetch("https://api.example.com/listings")

```



gibi URL'ler dağılmaz.



\---



\# 16. Server Component / Client Component



Next.js App Router'da mümkün olduğunca Server Component kullanılmalıdır.



Örneğin:



```tsx

export default async function ListingsPage() {

&#x20; const listings = await getListings();



&#x20; return <ListingGrid listings={listings} />;

}

```



Client Component yalnızca interaktivite gerektiğinde:



```tsx

"use client";



export function ListingFilters() {

&#x20; // filter state

&#x20; // user interaction

}

```



kullanılır.



Genel prensip:



```text

Server Component

&#x20;       ↓

Data fetching

&#x20;       ↓

Client Component

&#x20;       ↓

Interaction

```



Her şeyi `"use client"` yapmak tercih edilmez.



\---



\# 17. State Management



Global state gerekmeyen state global store'a taşınmaz.



State türleri ayrılmalıdır:



```text

Server State

&#x20;   ↓

TanStack Query



Local UI State

&#x20;   ↓

useState



Complex Client State

&#x20;   ↓

Zustand



URL State

&#x20;   ↓

searchParams

```



Örneğin ilan filtreleri:



```text

/listings?city=istanbul\&minPrice=500000\&maxPrice=5000000

```



gibi URL üzerinde tutulabilir.



Böylece:



\* paylaşılabilir

\* bookmark yapılabilir

\* browser back/forward çalışır

\* SSR ile uyumlu olur



\---



\# 18. TanStack Query



Backend'den gelen client-side server state için TanStack Query kullanılabilir.



Örneğin:



```text

features/listings/hooks/useListings.ts

```



```ts

export function useListings(filters: ListingFilters) {

&#x20; return useQuery({

&#x20;   queryKey: \["listings", filters],

&#x20;   queryFn: () => getListings(filters),

&#x20; });

}

```



Mutation:



```ts

useMutation({

&#x20; mutationFn: createListing,

});

```



Bu sayede:



```text

Caching

Refetching

Loading state

Error state

Mutation state

Cache invalidation

```



merkezi şekilde yönetilebilir.



\---



\# 19. UI Component Mimarisi



Global component'ler:



```text

components/

│

├── ui/

│   ├── Button.tsx

│   ├── Input.tsx

│   ├── Modal.tsx

│   ├── Select.tsx

│   ├── Table.tsx

│   └── Badge.tsx

│

├── layout/

│   ├── Header.tsx

│   ├── Footer.tsx

│   ├── Sidebar.tsx

│   └── DashboardLayout.tsx

│

└── shared/

&#x20;   ├── EmptyState.tsx

&#x20;   ├── ErrorState.tsx

&#x20;   ├── LoadingState.tsx

&#x20;   └── Pagination.tsx

```



Domain-specific component'ler ise:



```text

features/listings/components/

```



altında bulunur.



Örneğin:



```text

❌ components/ui/ListingCard.tsx



✅ features/listings/components/ListingCard.tsx

```



\---



\# 20. Form Yönetimi



Formlarda:



```text

React Hook Form

\+

Zod

```



kullanılabilir.



Örneğin:



```text

features/listings/

├── schemas/

│   └── listing.schema.ts

└── components/

&#x20;   └── ListingForm.tsx

```



Validation kuralları frontend'de UX için bulunabilir.



Ancak:



> Frontend validation hiçbir zaman backend validation'ın yerine geçmez.



Backend her request'i yeniden validate eder.



\---



\# 21. Frontend ve Backend Arasında Type Güvenliği



İki ayrı uygulama olduğundan API kontratının kontrol altında tutulması önemlidir.



Önerilen yapı:



```text

packages/

└── api-contract/

&#x20;   ├── schemas/

&#x20;   ├── types/

&#x20;   └── index.ts

```



Tam monorepo yapısına geçilecekse:



```text

project/

├── apps/

│   ├── frontend/

│   └── backend/

│

└── packages/

&#x20;   ├── api-contract/

&#x20;   ├── eslint-config/

&#x20;   └── typescript-config/

```



kullanılabilir.



Örneğin ortak Zod schema:



```ts

export const listingResponseSchema = z.object({

&#x20; id: z.string(),

&#x20; title: z.string(),

&#x20; price: z.number(),

});

```



Bu schema üzerinden TypeScript type üretilebilir.



\---



\# 22. API Kontratının Tek Kaynaktan Yönetilmesi



Daha büyük projelerde backend'in OpenAPI specification üretmesi önerilir.



Akış:



```text

Backend

&#x20;  ↓

OpenAPI

&#x20;  ↓

API Contract

&#x20;  ↓

Frontend

```



Böylece endpoint değişiklikleri frontend tarafında daha kolay takip edilir.



Alternatif olarak:



```text

OpenAPI

&#x20;  ↓

Generated TypeScript Client

```



kullanılabilir.



Bu yaklaşım özellikle endpoint sayısı arttığında değerlidir.



\---



\# 23. Authentication



Authentication backend tarafından yönetilir.



Genel akış:



```text

Frontend

&#x20;  ↓

POST /auth/login

&#x20;  ↓

Backend

&#x20;  ↓

Authentication

&#x20;  ↓

HTTP-only Cookie

```



Browser tarafında mümkün olduğunca token'ın `localStorage` içinde tutulmasından kaçınılmalıdır.



Cookie kullanılıyorsa:



```text

HttpOnly

Secure

SameSite

```



ayarları deployment senaryosuna göre doğru yapılandırılmalıdır.



Frontend:



```text

/auth/login

```



sayfasına sahip olur.



Backend:



```text

/modules/auth/

```



içerisinde authentication business logic'ini barındırır.



\---



\# 24. Authorization



Authentication:



```text

"Bu kullanıcı kim?"

```



Authorization:



```text

"Bu kullanıcı bunu yapabilir mi?"

```



Backend'de merkezi olarak uygulanmalıdır.



Örneğin:



```text

USER

AGENT

ADMIN

```



rolleri.



Fakat yalnızca frontend'de:



```tsx

if (user.role === "ADMIN") {

&#x20; ...

}

```



kontrolü yapmak güvenlik sağlamaz.



Asıl yetki kontrolü backend'de yapılmalıdır.



\---



\# 25. Logging



Backend:



```text

utils/logger.ts

```



üzerinden merkezi logging kullanılmalıdır.



Örneğin:



```text

HTTP Request

Database Error

Authentication Failure

Unhandled Error

External API Error

```



loglanabilir.



Production'da JSON structured logging tercih edilebilir.



Önemli:



```text

❌ password

❌ access token

❌ refresh token

❌ sensitive personal data

```



loglanmamalıdır.



\---



\# 26. Environment Variables



Backend:



```text

backend/.env

```



Örnek:



```env

NODE\_ENV=development



PORT=4000



DATABASE\_URL=postgresql://...



REDIS\_URL=redis://...



JWT\_SECRET=...



CORS\_ORIGIN=http://localhost:3000

```



Frontend:



```text

frontend/.env.local

```



Örnek:



```env

NEXT\_PUBLIC\_API\_URL=http://localhost:4000/api

```



Public ve secret environment variable'lar kesinlikle ayrılmalıdır.



Next.js'te:



```text

NEXT\_PUBLIC\_\*

```



ile başlayan değerlerin browser'a ulaşabileceği unutulmamalıdır.



Secret bilgiler burada tutulmamalıdır.



\---



\# 27. CORS



Development:



```text

Frontend

localhost:3000



Backend

localhost:4000

```



Backend yalnızca izin verilen frontend origin'lerine izin vermelidir.



Production:



```text

https://example.com

&#x20;       ↓

https://api.example.com

```



gibi explicit origin configuration kullanılmalıdır.



\---



\# 28. Cache



Redis gerektiğinde:



```text

Backend

&#x20;  ↓

Service

&#x20;  ↓

Redis

&#x20;  ↓

PostgreSQL

```



şeklinde kullanılabilir.



Cache özellikle:



```text

locations

categories

popular listings

search metadata

session data

rate limiting

```



gibi alanlarda değerlendirilebilir.



Her veriyi cache'lemek yerine ölçülebilir ihtiyaç doğrultusunda kullanılmalıdır.



\---



\# 29. Background Jobs



Uzun süren işlemler HTTP request içerisinde çalıştırılmamalıdır.



Örneğin:



```text

Email gönderme

Image processing

Notification

Report generation

Data import

```



için:



```text

Backend

&#x20;  ↓

Queue

&#x20;  ↓

Worker

```



mimarisi kullanılabilir.



Örneğin:



```text

BullMQ

\+

Redis

```



kullanılabilir.



\---



\# 30. Image / File Upload



Dosya upload işlemleri mümkün olduğunca backend server'ın diskine bağlı bırakılmamalıdır.



Önerilen:



```text

Frontend

&#x20;  ↓

Backend

&#x20;  ↓

Object Storage

```



veya doğrudan signed URL:



```text

Frontend

&#x20;  ↓

Backend → Signed URL

&#x20;  ↓

Object Storage

```



kullanılabilir.



Örneğin:



```text

S3

Cloudflare R2

Cloudinary

```



gibi object storage çözümleri kullanılabilir.



\---



\# 31. Security Katmanı



Backend'de en azından:



```text

Helmet

CORS

Rate Limiting

Input Validation

Authentication

Authorization

Secure Cookies

Request Size Limits

```



gibi güvenlik katmanları düşünülmelidir.



Ayrıca:



```text

SQL Injection

XSS

CSRF

Brute Force

Credential Stuffing

File Upload Abuse

```



gibi riskler tasarım aşamasında değerlendirilmelidir.



\---



\# 32. Testing



Backend:



```text

tests/

├── unit/

├── integration/

└── e2e/

```



Frontend:



```text

tests/

├── unit/

├── component/

└── e2e/

```



Test piramidi:



```text

&#x20;            E2E

&#x20;           /   \\

&#x20;      Integration

&#x20;         /     \\

&#x20;       Unit  Component

```



Her şeyi E2E test etmek yerine business logic'in önemli bölümleri unit testlerle korunmalıdır.



\---



\# 33. Backend Test Örneği



Service:



```text

listing.service.ts

```



için:



```text

createListing

updateListing

deleteListing

publishListing

```



gibi business rule'lar test edilir.



Repository testlerinde ise:



```text

findById

findMany

create

update

delete

```



gibi database davranışları test edilebilir.



\---



\# 34. Frontend Testleri



Örneğin:



```text

ListingCard

ListingFilters

ListingForm

```



component'leri test edilebilir.



Özellikle:



```text

Loading

Error

Empty

Success

```



durumlarının tamamı düşünülmelidir.



\---



\# 35. Loading / Error / Empty State



Her veri getiren feature:



```text

Loading

Success

Empty

Error

```



durumlarını ele almalıdır.



Next.js:



```text

loading.tsx

error.tsx

not-found.tsx

```



mekanizmaları uygun yerlerde kullanılabilir.



Component seviyesinde:



```text

<LoadingState />

<EmptyState />

<ErrorState />

```



gibi ortak component'ler oluşturulabilir.



\---



\# 36. Naming Convention



Backend:



```text

listing.controller.ts

listing.service.ts

listing.repository.ts

listing.routes.ts

listing.schema.ts

listing.types.ts

```



Frontend:



```text

ListingCard.tsx

ListingForm.tsx

ListingFilters.tsx

listing.api.ts

listing.schema.ts

listing.types.ts

useListings.ts

```



Genel kural:



```text

React Component → PascalCase



TypeScript utility → kebab-case



Backend layer → feature.role.ts

```



\---



\# 37. Import Alias



Hem frontend hem backend'de path alias kullanılmalıdır.



Örneğin:



```ts

@/features/listings

@/components/ui

@/lib/api

```



Backend:



```ts

@/modules/listings

@/config

@/utils

```



Böylece:



```ts

../../../../services/...

```



gibi karmaşık import'lar engellenir.



\---



\# 38. Frontend ve Backend Arasındaki Sınır



En önemli mimari kurallardan biri:



```text

Frontend

&#x20;  ❌

Database



Frontend

&#x20;  ❌

Prisma



Frontend

&#x20;  ❌

Backend internal service



Frontend

&#x20;  ↓

HTTP API

&#x20;  ↓

Backend

```



Frontend yalnızca public API contract üzerinden backend ile konuşmalıdır.



Backend'in:



```text

repository

service

database

Prisma

Redis

```



detayları frontend tarafından bilinmemelidir.



\---



\# 39. Önerilen Nihai Proje Yapısı



Tüm yapıyı birleştirirsek:



```text

project/

│

├── backend/

│   │

│   ├── prisma/

│   │   ├── schema.prisma

│   │   └── migrations/

│   │

│   ├── src/

│   │   ├── config/

│   │   │   ├── env.ts

│   │   │   ├── prisma.ts

│   │   │   └── redis.ts

│   │   │

│   │   ├── middlewares/

│   │   │   ├── auth.middleware.ts

│   │   │   ├── errorHandler.ts

│   │   │   ├── validateRequest.ts

│   │   │   └── rateLimit.ts

│   │   │

│   │   ├── utils/

│   │   │   ├── apiResponse.ts

│   │   │   ├── errors.ts

│   │   │   ├── logger.ts

│   │   │   └── asyncHandler.ts

│   │   │

│   │   ├── modules/

│   │   │   ├── auth/

│   │   │   ├── users/

│   │   │   ├── listings/

│   │   │   ├── categories/

│   │   │   ├── locations/

│   │   │   └── appointments/

│   │   │

│   │   ├── app.ts

│   │   └── server.ts

│   │

│   ├── tests/

│   ├── Dockerfile

│   ├── package.json

│   └── tsconfig.json

│

│

├── frontend/

│   │

│   ├── src/

│   │   │

│   │   ├── app/

│   │   │   ├── (public)/

│   │   │   ├── (auth)/

│   │   │   ├── (dashboard)/

│   │   │   ├── layout.tsx

│   │   │   ├── loading.tsx

│   │   │   ├── error.tsx

│   │   │   └── not-found.tsx

│   │   │

│   │   ├── features/

│   │   │   ├── auth/

│   │   │   ├── users/

│   │   │   ├── listings/

│   │   │   ├── categories/

│   │   │   ├── locations/

│   │   │   └── appointments/

│   │   │

│   │   ├── components/

│   │   │   ├── ui/

│   │   │   ├── layout/

│   │   │   └── shared/

│   │   │

│   │   ├── lib/

│   │   │   ├── api/

│   │   │   ├── auth/

│   │   │   ├── utils/

│   │   │   └── validations/

│   │   │

│   │   ├── hooks/

│   │   ├── config/

│   │   ├── types/

│   │   └── styles/

│   │

│   ├── public/

│   ├── tests/

│   ├── Dockerfile

│   ├── package.json

│   └── tsconfig.json

│

├── docker-compose.yml

├── .gitignore

└── README.md

```



\# 40. Request Flow



Bir ilan oluşturma örneği:



```text

&#x20;               FRONTEND

&#x20;                  │

&#x20;                  │ POST /listings

&#x20;                  ▼

&#x20;         ┌─────────────────┐

&#x20;         │ Express Router  │

&#x20;         └────────┬────────┘

&#x20;                  ▼

&#x20;         ┌─────────────────┐

&#x20;         │   Middleware    │

&#x20;         │ Auth + Zod      │

&#x20;         └────────┬────────┘

&#x20;                  ▼

&#x20;         ┌─────────────────┐

&#x20;         │   Controller    │

&#x20;         └────────┬────────┘

&#x20;                  ▼

&#x20;         ┌─────────────────┐

&#x20;         │    Service      │

&#x20;         │ Business Logic  │

&#x20;         └────────┬────────┘

&#x20;                  ▼

&#x20;         ┌─────────────────┐

&#x20;         │   Repository    │

&#x20;         └────────┬────────┘

&#x20;                  ▼

&#x20;         ┌─────────────────┐

&#x20;         │     Prisma      │

&#x20;         └────────┬────────┘

&#x20;                  ▼

&#x20;            PostgreSQL

```



Response:



```text

PostgreSQL

&#x20;   ↓

Prisma

&#x20;   ↓

Repository

&#x20;   ↓

Service

&#x20;   ↓

Controller

&#x20;   ↓

JSON Response

&#x20;   ↓

Next.js

```



\---



\# 41. Temel Mimari Kurallar



Projede aşağıdaki kurallar korunmalıdır:



\### Backend



```text

Controller → HTTP

Service → Business Logic

Repository → Database

Schema → Validation

Middleware → Cross-cutting concerns

```



\### Frontend



```text

app → Routing

features → Business/UI feature

components → Shared UI

lib → Infrastructure

hooks → Reusable React logic

```



\### Genel



```text

Frontend → Backend API

Backend → Database

```



Frontend doğrudan database'e erişmez.



\---



\# 42. Dependency Rule



Bağımlılıklar mümkün olduğunca dışarıdan içeri doğru akar:



```text

&#x20;            APP

&#x20;             ↓

&#x20;          FEATURE

&#x20;             ↓

&#x20;           LIB

&#x20;             ↓

&#x20;      INFRASTRUCTURE

```



Bir feature'ın başka bir feature'a bağımlılığı gerekiyorsa bu bağımlılık açık ve kontrollü olmalıdır.



Örneğin:



```text

listings → locations

```



mantıklı olabilir.



Ancak:



```text

users → listings → appointments → users

```



gibi circular dependency oluşturulmamalıdır.



\---



\# 43. Projenin Ana Prensibi



Bu mimarinin temel amacı şu yapıyı korumaktır:



```text

┌──────────────────────────────────────────┐

│                 FRONTEND                 │

│                                          │

│       Next.js / React / TypeScript       │

│                                          │

│  app → features → components → lib       │

└────────────────────┬─────────────────────┘

&#x20;                    │

&#x20;                    │ HTTP / API Contract

&#x20;                    ▼

┌──────────────────────────────────────────┐

│                 BACKEND                  │

│                                          │

│       Node.js / Express / TypeScript     │

│                                          │

│  routes → controller → service → repo    │

└────────────────────┬─────────────────────┘

&#x20;                    │

&#x20;                    ▼

┌──────────────────────────────────────────┐

│             INFRASTRUCTURE               │

│                                          │

│ PostgreSQL │ Redis │ Object Storage      │

└──────────────────────────────────────────┘

```



Bu sayede frontend ve backend birbirinden bağımsız ölçeklenebilir, test edilebilir ve deploy edilebilir.




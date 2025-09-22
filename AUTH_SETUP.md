# Autentifikacija - Setup Guide

## Implementirane funkcionalnosti

✅ **Login stranica** - Kreirana sa Nuxt UI AuthForm komponentom
✅ **Supabase integracija** - Potpuno konfigurisana autentifikacija  
✅ **Middleware za zaštićene stranice** - Automatska kontrola pristupa
✅ **Javne stranice** - `/pub/*` dostupne bez prijave
✅ **Invitation flow** - Postavljanje password-a preko invitation email-a

## Potrebna konfiguracija

### 1. Supabase Environment Variables

Kreirati `.env` fajl u root direktorijumu sa sledećim varijablama:

```env
# Supabase Configuration
NUXT_SUPABASE_URL=https://your-project-id.supabase.co
NUXT_SUPABASE_ANON_KEY=your-anon-key

# Email Configuration (opciono)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_password
```

### 2. Supabase Database Setup

Potrebno je kreirati korisnike u Supabase Auth:

```sql
-- U Supabase SQL Editor
-- Kreiranje test korisnika (opciono)
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    now(),
    now()
);
```

## Kako funkcioniše

### 1. Login stranica (`/login`)
- Koristi Nuxt UI AuthForm komponentu
- Validacija preko Zod schema
- Toast notifikacije za feedback
- Auto-redirect nakon uspešne prijave

### 2. Middleware (`middleware/auth.global.ts`)
- **Javne rute**: `/login`, `/pub/*` - dostupne svima
- **Zaštićene rute**: sve ostale - samo za ulogovane korisnike
- Auto-redirect na `/login` za neautentifikovane korisnike

### 3. Layout sa logout funkcionalnosti
- User dropdown sa informacijama o korisniku
- Logout opcija
- Toast notifikacije

### 4. Invitation flow za nove korisnike
- **Invitation link detektovanje** - Automatski prepoznaje invitation URL-ove
- **Password setup forma** - Dinamički se menja interface za postavljanje password-a
- **Token validacija** - Proverava validnost invitation token-a
- **Seamless redirect** - Nakon postavljanja password-a prebacuje na login formu

## Test scenario

### Regularna prijava
1. **Pokušaj pristupa zaštićenoj stranici** → Redirect na `/login`
2. **Uspešna prijava** → Redirect na početnu stranicu
3. **Pristup javnoj stranici** (`/pub/form/[id]`) → Radi bez prijave
4. **Logout** → Redirect na `/login`

### Invitation flow
1. **Korisnik prima invitation email** sa linkom poput:
   ```
   http://localhost:3000/login#access_token=...&type=invite&...
   ```
2. **Otvara link** → Automatski se prikazuje "Postavite lozinku" forma
3. **Unosi novu lozinku** → Lozinka se postavlja u Supabase
4. **Uspešno postavljanje** → Prebacuje se na login formu
5. **Može se prijaviti** sa email-om i novom lozinkom

## Troubleshooting

### Greška: "Invalid login credentials"
- Proveriti da li korisnik postoji u Supabase Auth
- Proveriti da li su environment varijable ispravno podešene

### Middleware ne radi
- Proveriti da li je fajl `middleware/auth.global.ts` u pravilnom direktorijumu
- Restartovati development server

### Toast poruke se ne prikazuju
- Proveriti da li je `@nuxt/ui` pravilno instaliran
- Proveriti da li postoji `UToast` komponenta u layout-u

## Sledeći koraci

- [ ] Implementirati "Forgot Password" funkcionalnost
- [ ] Dodati profil stranicu
- [ ] Implementirati role-based access control
- [ ] Dodati "Remember me" funkcionalnost

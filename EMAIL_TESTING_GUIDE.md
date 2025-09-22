# Email Funkcionalnost - Vodič za testiranje

## Implementirana funkcionalnost

✅ **Email server sa SMTP podrškom** - `/server/api/email/send.post.ts`
✅ **QR kod email** - `/server/api/email/send-qr.post.ts`  
✅ **Sertifikat email** - `/server/api/email/send-certificate.post.ts`
✅ **Registracija email** - `/server/api/email/send-registration.post.ts`
✅ **Frontend integracija** - Ažurirani postojeći dugmad
✅ **Email composable** - `/app/composables/useEmail.js`

## Kako funkcioniše

### 1. SMTP Konfiguracija
- Čita se iz `settings` tabele (kolona `smtp`)
- Format: 
```json
{
  "smtp": {
    "host": "mail.krstics.com",
    "port": 587,
    "password": "peramikalaza", 
    "username": "admin@krstics.com",
    "encryption": "tls"
  },
  "adminEmail": "admin@krstics.com",
  "companyName": "Thewelop",
  "silentEmail": "silent@krstics.com"
}
```

### 2. Email Template-i
- Čitaju se iz `events` tabele (kolona `emails`)
- Format:
```json
{
  "qr": {
    "enabled": true,
    "subject": "qr",
    "bodyHtml": "Ovo je registracioni <span style=\"font-weight: bolder;\"><i>qr</i></span>"
  },
  "certificate": {
    "enabled": true, 
    "subject": "Certificate",
    "bodyHtml": "Ovo je registracioni <span style=\"font-weight: bolder;\"><i>Certificate</i></span>"
  },
  "registration": {
    "enabled": true,
    "subject": "Registration", 
    "bodyHtml": "Ovo je registracioni <b><i>email</i></b>"
  }
}
```

### 3. Automatska integracija

**QR kod i sertifikat dugmad** - Sada šalju email umesto download
- Lokacija: `/app/pages/event/[id].vue`
- Dugmad: "Email Certificate" i "Email QR Code"

**Registration email** - Automatski se šalje nakon registracije
- Lokacije: `/app/pages/form/[id].vue` i `/app/pages/pub/form/[id].vue`
- Šalje se nakon uspešne registracije

### 4. Email variable replacement

U subject i body HTML-u možeš koristiti:
- `{{recipientName}}` - Ime primaoca
- `{{recipientEmail}}` - Email primaoca
- `{{eventName}}` - Naziv eventa
- `{{companyName}}` - Naziv kompanije
- `{{firstName}}` - Ime 
- `{{lastName}}` - Prezime
- `{{fullName}}` - Puno ime
- `{{email}}` - Email adresa
- `{{phone}}` - Telefon
- `{{company}}` - Kompanija
- `{{registrationDate}}` - Datum registracije
- `{{currentDate}}` - Trenutni datum
- `{{currentYear}}` - Trenutna godina

## Testiranje

### 1. Podesi SMTP konfiguraciju
- Idi na `/settings/email`
- Unesi SMTP podatke
- Klikni "Save Settings"

### 2. Podesi email template-e
- Idi na bilo koji event: `/event/{id}`
- Klikni na "Email Templates" ili idi direktno na `/email-templates/{eventId}`
- Aktiviraj i podesi template-e za QR, Certificate, Registration

### 3. Testiraj slanje

**Registration email:**
- Registruj se za event preko `/pub/form/{eventId}`
- Email će automatski biti poslat

**QR kod email:**
- Idi na `/event/{eventId}`
- Klikni na Actions za bilo kojeg attendee-a
- Izaberi "Email QR Code"

**Certificate email:**
- Idi na `/event/{eventId}` 
- Klikni na Actions za bilo kojeg attendee-a
- Izaberi "Email Certificate"

## Napomene

- Silent email (`silent@krstics.com`) se automatski dodaje u BCC
- Svi email-ovi se šalju od admin email-a (`admin@krstics.com`)
- Company name se koristi kao sender name
- Email funkcionalnost neće prekinuti registraciju ako ne uspe - samo će se logovati greška
- QR kod se attachuje kao PNG slika
- Sertifikat se attachuje kao PDF fajl

## Struktura fajlova

```
server/api/email/
├── send.post.ts           # Glavni email endpoint
├── send-qr.post.ts        # QR kod email
├── send-certificate.post.ts # Sertifikat email  
└── send-registration.post.ts # Registracija email

app/composables/
└── useEmail.js            # Email helper funkcije

app/pages/
├── event/[id].vue         # Ažurirano za email dugmad
├── form/[id].vue          # Ažurirano za registration email
└── pub/form/[id].vue      # Ažurirano za registration email
```

## Dependencies

- `nodemailer` - Dodato za SMTP funkcionalnost
- Koristiće postojeći `qrcode` package za QR kod generisanje
- Koristiće postojeći `/api/certificates/generate` za sertifikat generisanje

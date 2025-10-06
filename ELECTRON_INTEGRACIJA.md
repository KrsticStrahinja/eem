# Electron Integracija - Silent Printing ID Kartica

## 📋 Šta je urađeno

Stranica `/pub/scan/index.vue` je modifikovana da **automatski detektuje Electron okruženje** i šalje PDF ID kartice na silent printing.

## 🔄 Flow rada

```
1. QR kod se skenira
   ↓
2. Izvuku se podaci iz baze (attendee info)
   ↓
3. Attendee se markira kao "attended"
   ↓
4. Generiše se PDF ID kartica (pdf-lib)
   ↓
5. Detektuje se Electron API
   ↓
6. PDF se šalje kao base64 string
   ↓
7. Electron automatski štampa (silent)
   ↓
8. Success modal 3 sekunde
   ↓
9. Stranica se resetuje
```

## ⚙️ Kako radi kod

### U Nuxt aplikaciji (`app/pages/pub/scan/index.vue`)

```javascript
const printPdfBytes = async pdfBytes => {
    // Detektuj Electron API
    if (window.electronAPI?.printPdfSilent) {
        // Konvertuj PDF u base64
        const base64Pdf = btoa(
            new Uint8Array(pdfBytes).reduce((data, byte) => 
                data + String.fromCharCode(byte), ''
            )
        )
        
        // Pošalji Electron-u za silent print
        await window.electronAPI.printPdfSilent(base64Pdf)
        return
    }
    
    // Fallback: browser print dialog
    // ... iframe printing ...
}
```

Kod automatski:
- ✅ Detektuje da li radi u Electron-u
- ✅ Pokušava 3 moguća API metoda: `printPdfSilent`, `printSilent`, `print`
- ✅ Konvertuje PDF bytes u base64
- ✅ Šalje na Electron za printing
- ✅ Ima fallback na browser print ako nije Electron

## 🔧 Šta treba u Electron aplikaciji

### 1. Preload Script (`preload.js`)

```javascript
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
    printPdfSilent: async (base64Pdf) => {
        return await ipcRenderer.invoke('print-pdf-silent', base64Pdf)
    }
})
```

### 2. Main Process (`main.js`)

```javascript
const { ipcMain } = require('electron')
const fs = require('fs')
const os = require('os')
const path = require('path')

ipcMain.handle('print-pdf-silent', async (event, base64Pdf) => {
    // Sačuvaj PDF u temp folder
    const tempPdfPath = path.join(os.tmpdir(), `idcard_${Date.now()}.pdf`)
    const pdfBuffer = Buffer.from(base64Pdf, 'base64')
    fs.writeFileSync(tempPdfPath, pdfBuffer)

    // Kreiraj hidden window
    const printWindow = new BrowserWindow({ show: false })
    await printWindow.loadURL(`file://${tempPdfPath}`)

    // Silent print
    printWindow.webContents.print({
        silent: true,
        printBackground: true
    }, (success) => {
        printWindow.close()
        fs.unlinkSync(tempPdfPath)  // Cleanup
    })

    return { success: true }
})
```

### 3. Kreiranje Window-a

```javascript
const mainWindow = new BrowserWindow({
    webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false
    }
})

// Učitaj Nuxt app
mainWindow.loadURL('http://localhost:3000/pub/scan')
```

## 🧪 Testiranje

### 1. Provera da li Electron API postoji

U Electron app-u, otvori Developer Tools (F12):

```javascript
console.log(window.electronAPI)
// Output: { printPdfSilent: ƒ }
```

### 2. Console logovi

Nuxt app ispisuje u console:

```
✅ Ako je Electron:
   "Electron API detected, attempting silent print..."
   "PDF sent via printPdfSilent"

❌ Ako nije Electron:
   "Using browser print dialog (not in Electron)"
```

## 🖨️ Konfiguracija štampača

### Postavi default štampač:

**Windows**: Settings → Devices → Printers → Set as default  
**macOS**: System Preferences → Printers → Set Default  
**Linux**: `lpoptions -d printer_name`

### Koristi specifični štampač:

```javascript
printWindow.webContents.print({
    silent: true,
    deviceName: 'HP LaserJet Pro'  // Tačno ime štampača
})
```

## 📊 API verzije

Nuxt app podržava 3 moguća Electron API-ja:

| Metoda | Prioritet | Opis |
|--------|-----------|------|
| `window.electronAPI.printPdfSilent(base64)` | 1 | Preporučeno ime |
| `window.electronAPI.printSilent(base64)` | 2 | Alternativno ime |
| `window.electronAPI.print(base64)` | 3 | Jednostavno ime |

Koristi bilo koji - kod će automatski detektovati!

## ❌ Troubleshooting

### Problem: "Electron API not detected"
```javascript
// Proveri u console-u:
console.log(window.electronAPI)

// Ako je undefined, proveri:
// 1. Da li je preload.js podešen u BrowserWindow?
// 2. Da li je contextIsolation: true?
// 3. Da li je contextBridge.exposeInMainWorld pozvan?
```

### Problem: Štampanje ne radi
- ✅ Da li je štampač uključen?
- ✅ Da li je postavljen kao default?
- ✅ Da li `silent: true` u print options?
- ✅ Da li Electron verzija podržava silent print (5.0+)?

### Problem: PDF se ne generiše
- Proveri console errors u Nuxt app-u
- Proveri da li event ima `idcard` template
- Proveri da li je template URL validan

## 📝 Napomene

- PDF se prosleđuje kao **base64 string** radi kompatibilnosti
- Temp fajl se **automatski briše** posle printanja
- Kod je **bezbedан**: contextIsolation + preload only
- **Fallback na browser print** ako nije Electron

## 🚀 Production Deploy

1. Build Nuxt app: `npm run build`
2. Package Electron app: `electron-builder`
3. Postavi URL u Electron na production domain
4. Distribuiraj Electron executable

Detaljne instrukcije: `ELECTRON_API_SPECIFICATION.md`


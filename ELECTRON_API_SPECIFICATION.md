# Electron API Specifikacija za Silent Printing

## Pregled

Ova stranica (`/pub/scan/index.vue`) je dizajnirana da radi u Electron aplikaciji sa automatskim (silent) štampanjem ID kartica.

## Kako radi integracija

Kada se skenira QR kod, aplikacija:

1. ✅ Izvlači podatke attendee-a iz baze
2. ✅ Markira ga kao "attended"
3. ✅ Generiše PDF ID karticu sa svim podacima
4. 🔄 **Detektuje Electron okruženje**
5. 🖨️ **Šalje PDF Electron API-ju za silent printing**

## Electron API Specifikacija

Vaša Electron aplikacija treba da expose-uje jedan od sledećih API-ja kroz `preload.js`:

### Opcija 1: `printPdfSilent` (Preporučeno)

```javascript
// preload.js
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
    printPdfSilent: async (base64Pdf) => {
        return await ipcRenderer.invoke('print-pdf-silent', base64Pdf)
    }
})
```

### Opcija 2: `printSilent`

```javascript
// preload.js
contextBridge.exposeInMainWorld('electronAPI', {
    printSilent: async (base64Pdf) => {
        return await ipcRenderer.invoke('print-silent', base64Pdf)
    }
})
```

### Opcija 3: `print`

```javascript
// preload.js
contextBridge.exposeInMainWorld('electronAPI', {
    print: async (base64Pdf) => {
        return await ipcRenderer.invoke('print', base64Pdf)
    }
})
```

## Main Process Handler

U vašem Electron `main.js` ili `main.ts`, dodajte IPC handler:

```javascript
const { app, BrowserWindow, ipcMain } = require('electron')
const fs = require('fs')
const path = require('path')
const os = require('os')

// Handler za silent printing
ipcMain.handle('print-pdf-silent', async (event, base64Pdf) => {
    try {
        // 1. Kreiraj privremeni PDF fajl
        const tempDir = os.tmpdir()
        const tempPdfPath = path.join(tempDir, `idcard_${Date.now()}.pdf`)
        
        // 2. Konvertuj base64 u buffer i sačuvaj
        const pdfBuffer = Buffer.from(base64Pdf, 'base64')
        fs.writeFileSync(tempPdfPath, pdfBuffer)

        // 3. Kreiraj hidden window za printing
        const printWindow = new BrowserWindow({
            show: false,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            }
        })

        // 4. Učitaj PDF
        await printWindow.loadURL(`file://${tempPdfPath}`)

        // 5. Silent print na default štampač
        printWindow.webContents.print({
            silent: true,              // Bez dijaloga
            printBackground: true,     // Štampaj background
            deviceName: '',            // Default štampač
            margins: {
                marginType: 'none'     // Bez margina
            }
        }, (success, failureReason) => {
            if (!success) {
                console.error('Print failed:', failureReason)
            }
            
            // Cleanup
            printWindow.close()
            
            // Obriši temp fajl
            setTimeout(() => {
                try {
                    fs.unlinkSync(tempPdfPath)
                } catch (err) {
                    console.error('Failed to delete temp PDF:', err)
                }
            }, 2000)
        })

        return { success: true }
    } catch (error) {
        console.error('Error in silent print:', error)
        return { success: false, error: error.message }
    }
})
```

## Kreiranje BrowserWindow-a

U `main.js`, kreirajte window sa `preload` script-om:

```javascript
function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    })

    // Učitaj Nuxt app stranicu
    mainWindow.loadURL('http://localhost:3000/pub/scan')
    
    // Ili za production:
    // mainWindow.loadURL('https://your-domain.com/pub/scan')
}
```

## Format podataka

### Input: PDF kao Base64 string

```javascript
// Nuxt app šalje:
const base64Pdf = "JVBERi0xLjcKCjEgMCBvYmo..." // Base64 encoded PDF
await window.electronAPI.printPdfSilent(base64Pdf)
```

### Output: Promise sa rezultatom

```javascript
{
    success: true,
    // ili
    success: false,
    error: "Error message"
}
```

## Testiranje integracije

### 1. Testiraj da li Electron API postoji

Otvori Console u Electron app-u (F12):

```javascript
console.log(window.electronAPI)
// Trebalo bi da vidiš: { printPdfSilent: ƒ }
```

### 2. Testiraj poziv

```javascript
// Dummy base64 PDF za test
const testPdf = "JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PC9UeXBlL1BhZ2UvUGFyZW50IDIgMCBSL1Jlc291cmNlczw8L0ZvbnQ8PC9GMSA1IDAgUj4+L1Byb2NTZXRbL1BERi9UZXh0L0ltYWdlQi9JbWFnZUMvSW1hZ2VJXT4+L01lZGlhQm94WzAgMCA1OTUgODQyXS9Db250ZW50cyA0IDAgUj4+CmVuZG9iago0IDAgb2JqCjw8L0ZpbHRlci9GbGF0ZURlY29kZS9MZW5ndGggNDQ+PnN0cmVhbQp4nCvkMlAwULCx0XfOL0hVsFIw1DMw1zMwszRW0AS5wNzcwsjAHCguAGpgqGBgpWBuYWloaWRoZmJuYgkkAZ2gDwplbmRzdHJlYW0KZW5kb2JqCjIgMCBvYmoKPDwvVHlwZS9QYWdlcy9Db3VudCAxL0tpZHNbMyAwIFJdPj4KZW5kb2JqCjUgMCBvYmoKPDwvVHlwZS9Gb250L1N1YnR5cGUvVHlwZTEvQmFzZUZvbnQvSGVsdmV0aWNhL0VuY29kaW5nL1dpbkFuc2lFbmNvZGluZz4+CmVuZG9iagoxIDAgb2JqCjw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAyIDAgUj4+CmVuZG9iagp4cmVmCjAgNgowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDA0MDkgMDAwMDAgbiAKMDAwMDAwMDM1OCAwMDAwMCBuIAowMDAwMDAwMDE1IDAwMDAwIG4gCjAwMDAwMDAxNjYgMDAwMDAgbiAKMDAwMDAwMDQwNyAwMDAwMCBuIAp0cmFpbGVyCjw8L1NpemUgNi9Sb290IDEgMCBSPj4Kc3RhcnR4cmVmCjQ1OAolJUVPRgo="

window.electronAPI.printPdfSilent(testPdf)
    .then(result => console.log('Print result:', result))
    .catch(err => console.error('Print error:', err))
```

## Debugging

### Console logs u Nuxt app-u

Kod ispisuje poruke koje ti pomažu da vidiš šta se dešava:

```javascript
// Ako je Electron detektovan:
"Electron API detected, attempting silent print..."
"PDF sent via printPdfSilent"

// Ako nije u Electron-u:
"Using browser print dialog (not in Electron)"
```

### Provera štampača

U Electron main process-u, možeš da vidiš dostupne štampače:

```javascript
const printers = await mainWindow.webContents.getPrintersAsync()
console.log('Available printers:', printers)
```

## Konfiguracija štampača

### Postavi default štampač

**Windows:**
```
Settings → Devices → Printers & scanners → Choose default printer
```

**macOS:**
```
System Preferences → Printers & Scanners → Set as Default
```

**Linux:**
```bash
lpoptions -d printer_name
```

### Koristi specifični štampač

Promeni `deviceName` u print options:

```javascript
printWindow.webContents.print({
    silent: true,
    deviceName: 'HP LaserJet Pro',  // Exact printer name
    // ...
}, ...)
```

## Advanced Options

### Print više kopija

```javascript
printWindow.webContents.print({
    silent: true,
    copies: 2,  // 2 kopije
    // ...
}, ...)
```

### Custom page size

```javascript
printWindow.webContents.print({
    silent: true,
    pageSize: 'A4',  // ili 'Letter', 'Legal', etc.
    // ...
}, ...)
```

### Landscape orientacija

```javascript
printWindow.webContents.print({
    silent: true,
    landscape: true,
    // ...
}, ...)
```

## Troubleshooting

### Problem: "Electron API not detected"
- Proveri da li je `preload.js` pravilno podešen
- Proveri `webPreferences` u BrowserWindow
- Otvori console i proveri `window.electronAPI`

### Problem: Štampanje ne radi
- Proveri da li je štampač uključen
- Proveri da li je postavljen kao default
- Pogledaj error u Electron main process console

### Problem: Print dialog se i dalje pojavljuje
- Proveri da li je `silent: true` u print options
- Neki OS/printers ne podržavaju silent printing
- Proveri Electron verziju (potrebna 5.0+)

## Security Notes

- ✅ `contextIsolation: true` - Izoluje renderer od Node.js
- ✅ `nodeIntegration: false` - Bez direktnog Node.js pristupa
- ✅ Samo preload.js može da expose-uje API
- ✅ PDF se brzo briše posle štampanja
- ✅ Temp folderi su OS-managed i bezbedni

## Verzije

- **Electron**: 5.0+ (za silent printing)
- **Node.js**: 14+
- **Nuxt**: 3.x

## Dodatna dokumentacija

- [Electron webContents.print()](https://www.electronjs.org/docs/latest/api/web-contents#contentsprintoptions-callback)
- [Electron IPC](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [Context Isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation)


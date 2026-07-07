# Come aggiornare il sito (senza sviluppatore)

Hai due cose semplici da conoscere: la **cartella `media/`** (dove stanno i file) e il
file **`assets/progetti.js`** (la lista che decide cosa appare nelle gallerie).

---

## ✏️ Aggiungere / togliere / riordinare i VIDEO delle gallerie

Tutto si fa in **un solo file**: `assets/progetti.js`. Aprilo con un editor di testo
(anche TextEdit). Dentro trovi tre liste: `brand`, `orizzontali`, `verticali`.

**Per aggiungere un video:**
1. Salva il file video in `media/orizzontali/` (16:9) oppure `media/verticali/` (9:16).
2. In `progetti.js`, copia una riga esistente e cambia i dati. Esempio:

```js
{ titolo: "Nuovo progetto", cliente: "Nome cliente", video: "media/verticali/nuovo.mp4" },
```

3. Salva. Ricarica il sito: il video è già nella galleria, con anteprima al passaggio
   del mouse e player al click. ✨

**Per togliere un video:** cancella la sua riga.
**Per cambiare ordine:** sposta le righe su/giù.
**Per cambiare titolo o cliente:** modifica il testo tra virgolette.

⚠️ Regola d'oro: ogni riga (tranne l'ultima di una lista) finisce con la **virgola** `,`.

> La home page si aggiorna da sola: le due tessere "Orizzontali/Verticali" usano
> automaticamente il **primo** video di ciascuna lista.

---

## 🏢 Aggiungere / cambiare i BRAND (sezione "Top brand")

Sempre in `progetti.js`, nella lista `brand`:

```js
{ nome: "Nome Azienda", logo: "media/loghi/nome-logo.png" },
```

Metti il logo in `media/loghi/` (PNG con sfondo trasparente è l'ideale).

---

## 🖼️ Cambiare la PRESENTAZIONE (Home → sezione About)

Qui basta **sostituire i file** tenendo lo stesso nome:

- `media/presentazione.mp4` → il video verticale che parte da solo, muto, in loop
- `media/ritratto.jpg` → la tua foto verticale

Sovrascrivi il vecchio file con il nuovo (stesso nome) e il sito si aggiorna.

---

## Note tecniche utili

- I video devono essere **`.mp4`** (H.264). Se hai un `.mov`, va convertito prima.
- Per il web tieni i file leggeri: **1080p o 720p**, possibilmente sotto i ~30–50 MB.
  File molto pesanti rallentano il caricamento online.
- Copertine/anteprime: non servono immagini separate, il sito usa un fotogramma del
  video stesso.

/* ================================================================
   LA TUA LISTA PROGETTI  ✏️
   ----------------------------------------------------------------
   Questo è l'UNICO file che devi modificare per aggiornare le
   gallerie e i brand del sito. Non serve toccare l'HTML.

   Nel campo "video" puoi mettere DUE tipi di indirizzo:

   • Link YOUTUBE (consigliato per l'online — anche video "non in elenco"):
       video: "https://youtu.be/XXXXXXXX"
     La copertina della card viene presa AUTOMATICAMENTE da YouTube,
     e il player nel popup riproduce il video in HD. Nessun file da caricare.

   • File LOCALE (utile in fase di prova, sul tuo computer):
       video: "media/verticali/nome.mp4"

   Per AGGIUNGERE un video: copia una riga e cambia titolo, cliente e video.
   Per TOGLIERE un video: cancella la sua riga.
   Per RIORDINARE: sposta le righe su/giù.

   ⚠️ Ricorda: ogni riga (tranne l'ultima) finisce con una virgola.
   ================================================================ */

window.PORTFOLIO = {

  /* --- Aziende / brand (sezione "Top brand") --- */
  brand: [
    { nome: "Fashion Week Studio", logo: "media/loghi/fashion-week-studio.png" },
    { nome: "Lostallo Mondiale",   logo: "media/loghi/lostallo-mondiale.png" },
    { nome: "Senesi Giardini",     logo: "media/loghi/senesi-giardini.jpg" },
    { nome: "Citynews",            logo: "media/loghi/citynews.png" }
  ],

  /* --- Galleria ORIZZONTALE (16:9) --- */
  orizzontali: [
    { titolo: "Senesi Giardini",   cliente: "Video aziendale", video: "https://youtu.be/NwnoK20wll8" },
    { titolo: "Lostallo Mondiale", cliente: "Evento",          video: "https://youtu.be/qQA7P2ePN4I" }
  ],

  /* --- Galleria VERTICALE (9:16) --- */
  verticali: [
    { titolo: "Backstage MFW",      cliente: "Fashion Week Studio", video: "https://youtube.com/shorts/5BvZQuIkyoU" },
    { titolo: "La nostra squadra",  cliente: "Pizzeria La Ruota",   video: "https://youtube.com/shorts/qx8060ErJ9s" },
    { titolo: "Giornata in pista",  cliente: "Day 1",               video: "https://youtu.be/v4xwE48U2bA" }
  ]

};

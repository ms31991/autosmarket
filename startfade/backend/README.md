# AutoMarket API (Node.js)

Ky është backend-i i ri. API-të janë të njëjtat si më parë (`http://localhost:5068/api/...`) dhe përdorin databazën ekzistuese `AutoMarketDB`.

## Nisja

1. Ndalo procesin e vjetër .NET në portin 5068.
2. Në këtë folder:

```
npm install
npm start
```

Windows Authentication përdor `msnodesqlv8`. Nëse instalimi dështon, vendos `SQL_USER` dhe `SQL_PASSWORD` te `.env`.

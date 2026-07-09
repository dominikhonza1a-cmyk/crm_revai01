# Google OAuth — příprava pro Gmail sync a kalendář (fáze 3)

Aby CRM mohlo číst e-maily (párování na klienty do timeline) a kalendář (schůzky u dealů),
potřebuje **OAuth přístup ke Google Workspace**. Tohle je jednorázový setup v Google Cloud
Console (~10–15 minut klikání), který musí udělat vlastník Workspace účtu. Bez něj integrace nejde.

## Co vznikne
- Google Cloud projekt s povoleným Gmail API + Calendar API
- OAuth client (Client ID + Client Secret) → do env jako `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- V CRM pak: Nastavení → „Připojit Google účet" → každý uživatel si připojí svůj (refresh token
  se uloží šifrovaně per-user)

## Postup krok za krokem

### 1. Google Cloud projekt
1. Otevři https://console.cloud.google.com (přihlášen jako `info@automatizace-ai.cz`)
2. Nahoře vlevo rozbal výběr projektů → **New Project**
3. Name: `revai CRM` → Create → po vytvoření se do projektu přepni (výběr nahoře)

### 2. Povolení API
1. Menu ☰ → **APIs & Services → Library**
2. Vyhledej **Gmail API** → Enable
3. Zpět do Library → vyhledej **Google Calendar API** → Enable

### 3. OAuth consent screen (souhlasová obrazovka)
1. **APIs & Services → OAuth consent screen**
2. **User type:**
   - Máte-li Google **Workspace** (e-maily na vlastní doméně) → zvol **Internal**
     (jen lidé z vaší domény, žádné ověřování Googlem — nejjednodušší) ✅
   - Jinak **External** → po vyplnění přidej v sekci *Test users* oba vaše e-maily
     (v režimu Testing funguje bez ověření pro max 100 testerů)
3. Vyplň: App name `revai CRM`, User support email `info@automatizace-ai.cz`,
   Developer contact `info@automatizace-ai.cz` → Save and Continue
4. **Scopes** → Add or Remove Scopes → vyhledej a zaškrtni:
   - `.../auth/gmail.readonly` (čtení e-mailů pro logování do timeline)
   - `.../auth/calendar.readonly` (čtení událostí kalendáře)
   → Update → Save and Continue (zbytek klidně přeskoč)

### 4. OAuth Client ID
1. **APIs & Services → Credentials → + Create Credentials → OAuth client ID**
2. Application type: **Web application**, Name: `revai CRM web`
3. **Authorized redirect URIs** — přidej OBĚ:
   - `https://crm.automatizace-ai.cz/api/integrations/google/callback`
   - `http://localhost:3000/api/integrations/google/callback` (pro vývoj)
4. Create → zobrazí se **Client ID** a **Client Secret** → zkopíruj oboje
   (secret jde znovu zobrazit v detailu klienta, ale ulož si ho rovnou)

### 5. Env proměnné
Do lokálního `.env` **a** do Netlify (Client Secret označ jako secret) přidej:
```
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
```
→ Netlify Trigger deploy.

### 6. Předání
Napiš do chatu „Google OAuth hotový" — pak se dostaví zbytek (OAuth flow v CRM, tlačítko
„Připojit Google účet" v Nastavení, sync joby: e-maily dle domény klienta → timeline,
kalendářní události k dealům/schůzkám, denní přehled).

## Bezpečnost
- Client Secret patří jen do env (lokálně + Netlify), nikdy do gitu.
- Refresh tokeny uživatelů se budou ukládat šifrovaně v DB (AES-GCM, klíč v env),
  scope jen **readonly** — CRM nikdy nebude e-maily odesílat ani mazat.
- Odpojení účtu = smazání tokenu + revokace na https://myaccount.google.com/permissions.

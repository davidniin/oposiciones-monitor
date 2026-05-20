# Monitor de oposiciones — Educació social (Diputació de Barcelona)

Avisa por email cuando aparecen nuevas oposiciones en
[cido.diba.cat](https://cido.diba.cat/oposicions) filtradas por "Educació social".

Corre 2 veces al día (9:00 y 15:00 hora España, aprox.) en GitHub Actions, sin coste.

---

## 🚀 Setup en mi PC personal — paso a paso

> Sigue estos pasos en orden. Cada uno se hace una sola vez.

### Paso 1 — Llevar el código al PC personal

El código está actualmente en `/Users/dninmur/oposiciones-monitor/` del PC del trabajo.
Para llevártelo al PC personal:

**Opción A** — Comprimir y mandárselo por mail/AirDrop/USB:
```bash
cd /Users/dninmur
zip -r oposiciones-monitor.zip oposiciones-monitor -x "*/node_modules/*"
```
Descomprimir en el PC personal en la ubicación que prefieras
(ejemplo: `~/Documents/oposiciones-monitor`).

**Opción B** — Subirlo primero a GitHub desde aquí (no recomendado: usa la cuenta del curro).
Mejor opción A.

### Paso 2 — Instalar Node.js (si no lo tienes)

En el PC personal, comprueba:
```bash
node --version
```

Si dice `v20.x` o superior, perfecto. Si no, instálalo:
- Mac: `brew install node` (recomienda 20+)
- O descarga desde [nodejs.org](https://nodejs.org)

### Paso 3 — Instalar las dependencias

Desde dentro de la carpeta del proyecto:
```bash
cd ~/Documents/oposiciones-monitor    # ajusta la ruta
npm install
```

### Paso 4 — Probar que todo funciona en local

```bash
npm test          # deberían pasar los 31 tests
npm run dry-run   # debería decir "scraper returned ~35 offers" y "first run"
```

Si los dos comandos van bien, el código está sano. Aún no se envía ningún email.

### Paso 5 — Crear cuenta de Resend (gratis, 100 emails/día)

re_ZpJKVT2Z_EKFkb6DXMy3tHNzsG9SBgieW
1. Entra en [resend.com](https://resend.com) y regístrate (sin tarjeta).
2. Ve a **API Keys** → **Create API Key** → nombre "oposiciones-monitor", permission "Sending access".
3. Copia la clave (empieza por `re_`). Guárdala en algún sitio temporal —
   solo la vas a ver una vez.

> El remitente será `onboarding@resend.dev`. Funciona sin verificar dominio,
> aunque puede caer en spam la primera vez.

### Paso 6 — Crear el repo en GitHub (cuenta personal)

1. Entra en [github.com](https://github.com) con tu **cuenta personal**.
2. Botón **New repository**:
   - Nombre: `oposiciones-monitor`
   - Privado o público, da igual (no contiene secretos: están en GitHub Secrets).
   - **NO** marques "Add README", "Add .gitignore" ni "Add license"
     (ya los tenemos).
3. **Create repository**.

### Paso 7 — Inicializar git y subir el código

Desde dentro de la carpeta del proyecto en el PC personal:

```bash
git init
git add .
git commit -m "initial commit"

# Configura identidad SOLO para este repo (no afecta a tu config global)
git config user.name "TU-USUARIO-PERSONAL"
git config user.email "tu-email-personal@example.com"

git branch -M main
git remote add origin https://github.com/TU-USUARIO-PERSONAL/oposiciones-monitor.git
git push -u origin main
```

> Si el push pide login y no quiere tu contraseña: GitHub dejó de aceptar contraseñas
> hace tiempo. Crea un [Personal Access Token](https://github.com/settings/tokens):
> Settings → Developer settings → Personal access tokens → Tokens (classic) →
> Generate new token (classic) → scope `repo` → copia el token y úsalo como
> contraseña al hacer push.

### Paso 8 — Configurar los 3 secrets del repo

En GitHub, en tu repo recién creado:

**Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Crea estos 3, uno por uno:

| Name | Value | Para qué |
|---|---|---|
| `RESEND_API_KEY` | `re_...` (la clave del paso 5) | Para enviar emails |
| `RECIPIENT_EMAIL` | email de tu novia | Recibirá los avisos de novedades |
| `TECH_EMAIL` | tu email personal | Recibirá alertas si el scraper falla 3 veces |

### Paso 9 — Lanzar el primer run manual

En GitHub, en tu repo:

1. Pestaña **Actions** (arriba).
2. Si te pide aprobar workflows en el primer push: **I understand my workflows, go ahead and enable them**.
3. En la izquierda, click **Monitor oposiciones**.
4. Botón **Run workflow** (a la derecha) → **Run workflow** (verde).
5. Espera ~30 segundos y refresca. Debería salir un check verde.

⚠️ **El primer run NO manda email**. Solo aprende qué ofertas existen ya
y las marca como "vistas". Esto es intencional, sin él el primer email tendría
35 oposiciones y sería ruido. A partir del segundo run notificará solo lo nuevo.

### Paso 10 — Comprobar que el cron está activo

A partir de ahora el workflow se ejecutará solo a las **08:00 UTC** y **14:00 UTC**
(09:00 y 15:00 hora España en invierno; 10:00 y 16:00 en verano).

Si quieres forzar otra ejecución manual para probar, repite el paso 9.

---

## 🎉 Listo

Cuando aparezca una oposición nueva, tu novia recibirá un email con asunto
🚨 grande, en bandeja de entrada de Gmail destacará. El email lleva el detalle
(título, institución, plazo) y un enlace clickable a CIDO.

> Pídele que la primera vez marque el email como "No es spam" si va a parar a
> esa carpeta — los siguientes ya entrarán bien.

---

## 🔧 Comandos útiles

```bash
npm install      # instalar dependencias
npm test         # correr los tests (31 tests)
npm run dry-run  # probar el scraper sin enviar email ni guardar estado
npm start        # correr de verdad (envía email si hay novedades)
```

## 🛠️ Ajustes que puedes hacer después

- **Cambiar la frecuencia o la hora**: editar `.github/workflows/scraper.yml`
  (sintaxis cron, en UTC).
- **Cambiar el filtro de búsqueda**: editar `SEARCH_URL` en `src/scraper.js`.
- **Cambiar el remitente del email**: editar `FROM_ADDRESS` en `src/notifier.js`
  (necesitarás verificar dominio en Resend).

## 📁 Estructura del proyecto

```
.
├── .github/workflows/scraper.yml   Workflow GitHub Actions con cron
├── src/
│   ├── main.js                     Entry point
│   ├── scraper.js                  Descarga y parsea cido.diba.cat
│   ├── stateManager.js             Lee/escribe state/seen.json
│   ├── notifier.js                 Envía emails con Resend
│   └── errorHandler.js             Cuenta fallos y avisa al TECH_EMAIL
├── state/seen.json                 IDs ya notificados (auto-commit por el bot)
├── tests/                          Tests con vitest
├── package.json
├── .env.example
└── .gitignore
```

## ❓ Troubleshooting

**No me llega ningún email tras varios runs.**
Comprueba en la pestaña Actions del repo que los workflows están en verde.
Si están en rojo, abre el run y mira el log. Si están en verde y aun así no llega
nada, es que no hay ofertas nuevas — espera al próximo run.

**El workflow falla con `Resource not accessible by integration` al hacer push del state.**
En el repo, ve a **Settings → Actions → General → Workflow permissions** y marca
"Read and write permissions". Guarda.

**Los emails llegan a spam.**
Pasa la primera vez. Marca uno como "no es spam" y los siguientes entran bien.
Para una solución definitiva, verifica un dominio propio en Resend.

**Falla con `0 offers (anomaly)`.**
La web de CIDO ha cambiado el HTML. Revisa los selectores en `src/scraper.js`.
El TECH_EMAIL recibirá un aviso al tercer fallo consecutivo.

**Quiero borrar el estado y empezar de cero.**
Edita `state/seen.json` y deja `"seen_ids": []`. Commit + push. El próximo run
se comportará como una primera ejecución (no enviará email, solo aprenderá).

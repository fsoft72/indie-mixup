# Migrazione a pnpm 12 di un repo che incorpora LiWE3

Guida per portare a **pnpm 12.x** un repo "consumer" che usa i pacchetti LiWE3
(`@backend/liwe3`, `@backend-modules/*`, `@frontend/liwe3`, `@frontend-modules/*`).

Nel modello LiWE3 il framework non e' una dipendenza di registry: viene **copiato
dentro** il repo consumer da `scripts/liwe3-update.sh` (clona `cf-liwe3-ng`
master e sovrascrive i file tracciati, con le regole di
`scripts/data/liwe3-update.defaults.conf` del framework piu' le regole proprie
dell'app in `scripts/data/liwe3-update.local.conf`). Il consumer aggiunge il proprio codice in
`app/backend/src/`, `app/frontend/src/` e i propri moduli in
`app/modules/<nome>/{backend,frontend}/`.

**Punto di partenza assunto qui:** pnpm 12 e' gia' installato sulla macchina
(`pnpm --version` -> `12.x`) e gli script di migrazione **arrivano da
`liwe3-update.sh`** (non si scaricano a mano). Quindi il primo passo e' proprio
`liwe3-update.sh`.

> Riferimento completo della migrazione a monte: `PNPM-12.md` nella root di
> `cf-liwe3-ng`.

---

## Cosa cambia e perche' rompe il consumer

| Cambiamento a monte                                                                                                        | Effetto sul consumer dopo `liwe3-update.sh`                                                                                                                                           |
| -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@backend/liwe3/core` -> `@backend/liwe3`, `@backend/modules/<x>` -> `@backend-modules/<x>` (nomi npm validi, un solo `/`) | `liwe3/**` copiato usa i nomi nuovi, ma `app/backend/src/**`, `app/frontend/src/**`, `app/modules/**` e il **tuo** `tsconfig.json` importano ancora i nomi vecchi -> **import rotti** |
| `pnpm-workspace.yaml`: `onlyBuiltDependencies` -> `allowBuilds`                                                            | `pnpm-workspace.yaml` e' in `[skip]`: **non** viene aggiornato -> pnpm 12 ignora `onlyBuiltDependencies` e fallisce con `ERR_PNPM_IGNORED_BUILDS`                                     |
| root `package.json`: `packageManager` -> `pnpm@12.3.4`, rimosso campo `pnpm` morto                                         | il root `package.json` e' in `[copy-if-missing]`: `liwe3-update.sh` **non lo sovrascrive**, quindi `packageManager` va allineato a mano (vedi sotto)                                  |
| lockfile: blocco `packageManagerDependencies` / `@pnpm/exe`                                                                | `pnpm-lock.yaml` e' in `[skip]`: lo rigeneri tu con `pnpm install`                                                                                                                    |

**Il punto critico: `app/**`.** E' li' che stanno i moduli del consumer, ed e'
li' che il rename NON arriva da solo.

---

## Prerequisiti

- **pnpm 12.x gia' installato** (`pnpm --version`). Se non ce l'hai, vedi
  "Se pnpm 12 non e' attivo" al Passo 3.
- Node **>= 22** (`node -v`). pnpm 11+ lo richiede.
- `git`, `perl`, `jq` disponibili.
- Working tree **pulito**.
- Sapere dove sta la root del workspace pnpm del consumer (dove stanno
  `pnpm-workspace.yaml` e `pnpm-lock.yaml`); tutti i comandi si lanciano da li'.

---

## Procedura

Ordine: `liwe3-update.sh` **prima di tutto** (porta gli script e il `liwe3/**`
gia' rinominato), poi il rename del solo `app/**`, poi le impostazioni pnpm.
**Non fare commit tra `liwe3-update.sh` e il rename**: nel mezzo il repo non
compila (import misti vecchi/nuovi). Il primo commit arriva quando tutto e'
di nuovo coerente.

### Passo 1 - `liwe3-update.sh`

```bash
# se non hai ancora lo script (primo aggiornamento in assoluto):
#   git -C /tmp clone --depth 1 https://github.com/fsoft72/cf-liwe3-ng.git cf-liwe3-ng
#   cp /tmp/cf-liwe3-ng/scripts/liwe3-update.sh scripts/ && chmod +x scripts/liwe3-update.sh

./scripts/liwe3-update.sh --dry-run
./scripts/liwe3-update.sh
```

Dopo questo passo hai:

- `liwe3/**` alla versione a monte, gia' coi nomi `@backend/liwe3` /
  `@backend-modules/*`
- `scripts/**` aggiornato: `rename-backend-packages.sh`,
  `pnpm12-consumer-check.sh`, `db_*.sh`
- root `package.json` **invariato** (e' in `[copy-if-missing]`): imposta a mano `packageManager: "pnpm@12.3.4+sha512..."` e togli l'eventuale campo `pnpm` morto
- `pnpm-workspace.yaml` e `pnpm-lock.yaml` **invariati** (sono in `[skip]`)
- `app/**` e il tuo `tsconfig.json` root **invariati** -> ancora coi nomi vecchi

Il working tree ora e' sporco e incoerente. Non committare: vai al Passo 2.

### Passo 2 - Rinomina `@backend/*` nel resto del repo

Lo script e' appena arrivato da `liwe3-update.sh`. Girando su un tree gia' sporco
serve `--allow-dirty`:

```bash
# anteprima (deve elencare app/** e tsconfig.json; liwe3/** e' gia' a posto)
./scripts/rename-backend-packages.sh --dry-run

./scripts/rename-backend-packages.sh --allow-dirty     # + --with-docs per *.md e *.py

git diff
```

Sostituzioni letterali su tutti i file tracciati con estensione
`ts|mts|js|mjs|cjs|svelte|json|jsonc|sh|example`:

| Cerca                 | Sostituisci         | Copre                                                                                                      |
| --------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------- |
| `@backend/liwe3/core` | `@backend/liwe3`    | nomi pacchetto, dipendenze, alias, **e i sottopath** `@backend/liwe3/core/src/*` -> `@backend/liwe3/src/*` |
| `@backend/modules/`   | `@backend-modules/` | nomi moduli, dipendenze, wildcard tsconfig, alias wrangler/vitest                                          |

(piu' due varianti con slash escaped per le `sed` interne agli script `db_*.sh`).

Nel consumer tocca in genere:

- `app/backend/src/**`, `app/frontend/src/**`, `app/modules/*/**` - specifier di `import`
- `app/**/package.json` - `name` dei tuoi moduli (`@backend/modules/<x>` -> `@backend-modules/<x>`) e chiavi `dependencies`
- il tuo `tsconfig.json` root - alias `@backend/liwe3/core`, `@backend/liwe3/core/*`, `@backend/modules/*`
- `app/**/vitest.config.*` e `app/**/wrangler.jsonc` - mappe `alias`

Cleanup facoltativo del `tsconfig.json` root (allinea il mapping ai sottopath
`@backend/liwe3/src/...`):

```diff
- "@backend/liwe3/*": [ "./liwe3/backend/core/src/*" ]
+ "@backend/liwe3/*": [ "./liwe3/backend/core/*" ]
```

### Passo 3 - `pnpm-workspace.yaml` (a mano) + verifica pnpm 12

`liwe3-update.sh` salta `pnpm-workspace.yaml`. Sostituisci il blocco build-script:

```diff
-onlyBuiltDependencies:
-    - esbuild
-    - sharp
-    - workerd
+allowBuilds:
+    esbuild: true
+    sharp: true
+    workerd: true
```

Aggiungi alla mappa ogni altro pacchetto del tuo repo con uno script di
install/postinstall legittimo (`pnpm install` al Passo 4 te li elenca con
`ERR_PNPM_IGNORED_BUILDS`). Se avevi un campo `pnpm` nella root `package.json`
(gia' ignorato da pnpm 10.26+), toglilo.

```bash
pnpm --version      # deve dire 12.x
```

**Se pnpm 12 non e' attivo** (perche' `pnpm --version` dice ancora 10/11, o
perche' il campo `packageManager` pinnato a `12.3.4` non combacia con la tua
installazione):

- **corepack** (pnpm gestito da Node): `corepack enable && corepack use pnpm@12`
- **standalone** (installer script): `pnpm config set --location=global
  manage-package-manager-versions true`, poi un `pnpm install` scarica e
  ri-esegue la versione del campo `packageManager`
- se la tua 12.x e' un patch diverso da `12.3.4` e vuoi tenerti la tua:
  allinea il campo `packageManager` nel root `package.json` alla tua versione
  (con l'hash che ti stampa `corepack use pnpm@<tua-versione>`), oppure
  rimuovi il campo se non usi la gestione delle versioni

### Passo 4 - `pnpm install` e breaking changes di pnpm 12

```bash
pnpm install
```

| Sintomo                                                                      | Causa                                                                             | Fix                                                                                                                             |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `ERR_PNPM_UNRECOGNIZED_WORKSPACE_SETTINGS`                                   | chiave rimossa in v11 in `pnpm-workspace.yaml`                                    | rimuovi/migra la chiave (es. `onlyBuiltDependencies` -> `allowBuilds`, Passo 3)                                                 |
| `ERR_PNPM_IGNORED_BUILDS: <pkg>`                                             | `strictDepBuilds` ora e' `true` di default                                        | aggiungi `<pkg>: true` ad `allowBuilds`, oppure `pnpm approve-builds`                                                           |
| `ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION`                                     | nuovo default `minimumReleaseAge: 1440` (24h) su release fresche                  | `minimumReleaseAge: 0` in `~/.config/pnpm/config.yaml` (macchina) oppure in `pnpm-workspace.yaml` (committato, per tutti)       |
| install che re-risolve tutte le dep                                          | resolve fresco entro le nuove policy                                              | `git checkout -- pnpm-lock.yaml`, poi `pnpm install --frozen-lockfile`; se serve un update, fallo come commit separato e mirato |
| errore su importer con `..` / dipendenze `file:../qualcosa` fuori dalla root | validazione path piu' severa in v12                                               | porta quei pacchetti dentro il workspace o pubblicali; ripiego temporaneo `corepack use pnpm@11.26.0`                           |
| `engineStrict` fallisce l'install                                            | pnpm 12: `engineStrict` segue l'arco `dependencies`, non il sottoalbero opzionale | aggiorna la dipendenza incompatibile indicata nel messaggio                                                                     |

### Passo 5 - Verifica e commit

```bash
./scripts/pnpm12-consumer-check.sh        # atteso: tutto ✓

git grep -nE '@backend/(liwe3/core|modules/)' -- '*.ts' '*.svelte' '*.json' '*.jsonc' \
  ':!scripts/rename-backend-packages.sh'      # atteso: vuoto
git grep -nE '@backend/(liwe3/core|modules/)' -- 'app/**'   # atteso: vuoto

pnpm install --frozen-lockfile
pnpm -w run build        # o i tuoi script di build
pnpm -w run test         # inclusi i test dei moduli in app/modules/**
pnpm -F <tuo-app-backend> exec wrangler deploy --dry-run --outdir /tmp/dry
```

Tutto verde -> un solo commit (tree coerente, compila):

```bash
git add -A
git commit -m "CHORE: sync LiWE3 + migrate to pnpm 12"
```

Se preferisci due commit, separa con `git add -p`: prima il sync `liwe3/**` +
`package.json`, poi rename `app/**` + `pnpm-workspace.yaml` + `pnpm-lock.yaml`.
Nessuno dei due, da solo, compila: usalo solo se ti serve per la review.

---

## Rollback

```bash
git checkout -- .                          # modifiche non committate
git revert <hash-del-commit-di-migrazione> # se gia' committato

# torna a pnpm 10 (standalone):
pnpm config set --location=global manage-package-manager-versions false
# e rimetti "packageManager": "pnpm@10.x..." nel root package.json
pnpm install
```

---

## Trappole

- **Collisione di nomi moduli.** Dopo il rename, un modulo del consumer in
  `app/modules/user/` si chiamerebbe `@backend-modules/user` come quello di LiWE3
  in `liwe3/modules/user/` -> pnpm dara' errore di nome duplicato nel workspace.
  Vale gia' oggi con `@backend/modules/user`; se hai moduli con lo stesso nome di
  quelli LiWE3, rinominali (`@backend-modules/<prefisso>-user`) prima del Passo 2.
- **root `package.json` mai aggiornato** da `liwe3-update.sh` (e' in
  `[copy-if-missing]`, come `tsconfig.json` e `app/`): le tue dipendenze e i tuoi
  script custom restano al sicuro, ma le modifiche a monte (`packageManager`,
  script `dev` / `predev`, ...) vanno riportate a mano.
- **`pnpm-workspace.yaml` mai aggiornato** da `liwe3-update.sh` (e' in `[skip]`):
  ogni cambio di impostazioni pnpm a monte va riportato a mano.
- **Config di macchina non committata.** `manage-package-manager-versions` sta in
  `~/.config/pnpm/rc`, `minimumReleaseAge` in `~/.config/pnpm/config.yaml`.
  Teammate e CI devono replicarle (oppure metti `minimumReleaseAge` in
  `pnpm-workspace.yaml`, che pero' vale committato per tutti).
- **Playground.** Se il tuo repo tiene anche `playground/**` con
  `pnpm run playground:setup` (`pnpm ... install --ignore-workspace`), sotto
  pnpm 12 quell'install isolato si rompe: `--ignore-workspace` ignora tutto
  `pnpm-workspace.yaml` (impostazioni incluse), quindi non c'e' dove dichiarare
  `allowBuilds`. Opzione piu' pulita: togliere `--ignore-workspace` da
  `playground:setup` (le glob del workspace gia' includono `playground/*`).
- **`allowBuilds` NON e' accettato nel config globale**
  (`~/.config/pnpm/config.yaml`): deve stare in un `pnpm-workspace.yaml` di
  progetto.

---

## Riepilogo comandi

```bash
# 1. porta LiWE3 aggiornato (script + liwe3/** rinominato + packageManager)
./scripts/liwe3-update.sh --dry-run && ./scripts/liwe3-update.sh
#    -> NON committare qui

# 2. rinomina il resto (app/**, tsconfig, wrangler, vitest) sul tree sporco
./scripts/rename-backend-packages.sh --dry-run
./scripts/rename-backend-packages.sh --allow-dirty

# 3. pnpm-workspace.yaml: onlyBuiltDependencies -> allowBuilds  (a mano)
#    + verifica: pnpm --version == 12.x

# 4. install + fix breaking changes (vedi tabella)
pnpm install

# 5. verifica e commit unico
./scripts/pnpm12-consumer-check.sh
pnpm install --frozen-lockfile && pnpm -w run build && pnpm -w run test
git add -A && git commit -m "CHORE: sync LiWE3 + migrate to pnpm 12"
```

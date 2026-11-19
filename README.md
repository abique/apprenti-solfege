# Apprenti Solfège ♪ おんがくの ぼうけん

Une petite application web, **100 % statique** (aucun serveur, aucun compte, aucune dépendance), pour apprendre le solfège en s'amusant, pensée pour les 8–11 ans.

## Ce qu'on y trouve

| Exercice | Ce qu'on apprend | Niveaux |
|---|---|---|
| **Lire les notes** | Nommer une note sur la portée (clé de sol, puis clé de fa) | 8 |
| **L'oreille musicale** | Associer le son au nom de la note (avec le Do comme repère, puis sans) | 7 |
| **Chanter juste** | Chanter la note demandée : le micro vérifie la justesse (peu importe l'octave) | 7 |
| **Les intervalles** | Reconnaître tierces, quintes, octaves… (avec des chansons pour s'en souvenir) | 8 |
| **Les accords** | Majeur « joyeux », mineur « triste », diminué, augmenté, accords de 7e | 8 |
| **Défi chrono** | 60 secondes pour lire ou reconnaître à l'oreille un maximum de notes, sur un niveau déjà atteint | — |
| **Piano libre** | Jouer librement et voir la note s'afficher sur la portée | — |
| **Salle de concert** | Écouter des morceaux avec leur partition : les notes s'allument pendant la lecture | — |

### Salle de concert

- **Grands compositeurs** : Bach, Mozart, Beethoven, Chopin, Liszt, Debussy, Satie — des morceaux (ou mouvements) complets ; quelques-uns sont marqués « version simplifiée » quand les ornements ou les cadences ont dû être écrits plus simplement.
- **Morceaux d'étude** : les classiques de l'apprentissage (Menuet en sol, Sonatine de Clementi, Burgmüller, Album pour la jeunesse de Schumann…), classés par difficulté.
- **Mes morceaux** : on importe ses propres fichiers **MIDI** (par exemple des musiques de Ghibli ou d'animes achetées) ; ils sont joués avec des notes qui tombent sur le clavier. Ils restent dans le navigateur de l'appareil (IndexedDB) et ne sont envoyés nulle part.

Toutes les partitions fournies sont des œuvres du **domaine public**, transcrites au format [ABC](https://abcnotation.com) dans `music/*.abc`. Les œuvres encore protégées par le droit d'auteur (Yann Tiersen, Joe Hisaishi / Ghibli, musiques d'animes…) ne sont volontairement pas incluses : c'est le rôle de « Mes morceaux ».

Les partitions sont dessinées et jouées par [abcjs](https://github.com/paulrosen/abcjs) (licence MIT, copié dans `vendor/`). Le son de piano échantillonné (police sonore FluidR3) est téléchargé depuis `paulrosen.github.io` la première fois, puis gardé pour le mode hors ligne ; sans connexion, l'appli bascule sur son propre petit synthé. On peut toucher une note de la partition pour l'entendre et voir son nom.

- **Noms des notes** : toujours **Do, Ré, Mi…** en grand, avec la notation **C, D, E…** en petit (réglable : C D E, ドレミ, les deux, ou rien).
- **Difficulté adaptative** : une partie = 10 questions. Avec 8 bonnes réponses sur les 10 dernières, on passe au niveau suivant ; avec 4 ou moins, on redescend réviser. Dans un niveau, les notes les moins bien maîtrisées reviennent plus souvent.
- **Défi chrono** (lire les notes, oreille musicale) : pour gagner en vitesse sur ce qu'on connaît déjà. On choisit un niveau déjà atteint, on se compare seulement à son propre record (par niveau), une erreur montre la bonne réponse et fait perdre un peu de temps, et le défi ne change ni le niveau ni les médailles. Pour l'activer sur un autre exercice, il suffit d'y ajouter une propriété `chrono` (délais après une bonne réponse et après une erreur).
- **Médailles** par exercice : Débutant → Bronze → Argent → Or → Platine → Diamant. On ne perd jamais une médaille gagnée.
- **Plusieurs joueurs** sur le même appareil, chacun avec son prénom, son compagnon (12 petites créatures originales) et éventuellement sa photo prise à la webcam.
- **♪ à gagner** pour débloquer des tenues pour le compagnon (béret, hachimaki, casque audio, couronne…).
- **Page « Mes progrès »** pour les parents : niveau, taux de réussite, notes à travailler.
- **Clavier MIDI** optionnel (réglages) pour répondre et jouer avec un vrai clavier.
- **Hors ligne** et **installable** sur la tablette (PWA).

## Lancer sur l'ordinateur

Il faut simplement servir le dossier avec n'importe quel serveur web statique :

```bash
python3 -m http.server 8765
```

puis ouvrir <http://localhost:8765>. (Ouvrir `index.html` directement en `file://` ne fonctionne pas : les modules JavaScript l'interdisent.)

## Utiliser sur la tablette Android

Le **micro**, la **caméra** et le **mode hors ligne** ne sont autorisés par les navigateurs qu'en **HTTPS** (ou sur `localhost`). Le plus simple est donc de publier le dossier sur un hébergement statique HTTPS, par exemple **GitHub Pages** :

1. Pousser ce dépôt sur GitHub.
2. Dans *Settings → Pages*, choisir *Deploy from a branch*, branche `main`, dossier `/ (root)`.
3. Ouvrir l'adresse donnée (`https://<utilisateur>.github.io/apprenti-solfege/`) dans Chrome sur la tablette, puis menu ⋮ → **Ajouter à l'écran d'accueil** / **Installer l'application**.

Sur le réseau local en simple `http://` (ex. `http://192.168.1.10:8765` servi depuis le PC du salon), tout fonctionne **sauf** le chant, la photo et le hors ligne.

## Où est stockée la progression ?

Dans le `localStorage` du navigateur, sur l'appareil. Chaque appareil (tablette, PC) a donc sa propre progression. Dans **Réglages → Sauvegarde**, on peut **exporter** un fichier `.json` et l'**importer** ailleurs (aussi possible depuis l'écran « Qui joue ? »). L'application demande au navigateur de ne pas effacer ces données automatiquement.

## Organisation du code

```
index.html, css/style.css      Page et thème
js/main.js                     Routeur (#/home, #/play/reading…), fond animé, démarrage
js/music.js                    Théorie : notes, noms, intervalles, accords
js/audio.js                    Synthétiseur Web Audio (piano doux, bruitages)
js/pitch.js                    Détection de hauteur (YIN) et micro
js/adaptive.js                 Niveaux, fenêtre glissante, médailles
js/storage.js                  Joueurs, sauvegarde, export/import
js/avatars.js                  Créatures SVG et tenues
js/staff.js, js/piano.js       Portée SVG et clavier tactile
js/exercises/*.js              Un fichier par exercice (+ runner.js, le moteur commun)
js/screens/*.js                Écrans : joueurs, profil, accueil, réglages, piano, progrès, salle de concert
js/library/                    Catalogue des morceaux, chargement d'abcjs, stockage des MIDI importés
js/midifile.js                 Lecture des fichiers MIDI
music/*.abc                    Partitions du domaine public (format ABC)
vendor/                        abcjs (licence MIT)
dev/check-music.html           Vérification des partitions (outil de développement)
sw.js, manifest.webmanifest    Mode hors ligne et installation
tests/                         Tests unitaires (Node ≥ 20) : npm test
```

Pour ajuster la difficulté, il suffit de modifier le tableau `LEVELS` en haut de chaque fichier d'exercice (notes, intervalles, tolérance de justesse en cents pour le chant, petits conseils affichés par le compagnon).

**Ajouter un morceau à la Salle de concert** : écrire `music/<id>.abc` (deux voix `RH` / `LH`, voir les fichiers existants), l'ajouter dans `js/library/catalog.js` et dans la liste `MUSIC` de `sw.js` (pour le hors-ligne), puis ouvrir <http://localhost:8765/dev/check-music.html> : la page vérifie chaque partition (présence dans `sw.js`, avertissements, durée de chaque mesure, même nombre de mesures aux deux mains).

Le service worker charge toujours la dernière version quand l'appareil est en ligne et garde une copie pour le mode hors ligne. Si vous ajoutez un fichier JavaScript, ajoutez-le aussi à la liste `CORE` de `sw.js`.

---
title: "Niagara N4 te sort « Program is not signed » ? Allez, on dégomme ça"
date: "2026-06-02"
tags: ["niagara", "n4", "tridium", "code-signing", "gtb"]
excerpt: "Tu compiles ton premier objet Program sur une Jace 8000 et BAM — petit point orange, « Program is not signed ». Pas de panique : c'est juste Tridium qui te demande de signer ton code. Je t'explique le pourquoi et je te déroule la procédure, station locale ET Jace distant."
cover: "/articles/signer-programmes-niagara-n4/cover.svg"
---

Hello la GTB ! 👋

Bon, plante le décor : t'es sur site, t'as ton Workbench ouvert, tu viens de pondre un petit objet **Program** des familles — trois lignes de logique dans `onExecute()`, rien de méchant. Tu compiles, fier de toi… et là, ce petit point orange de la mort accompagné du message qui va te suivre toute la journée :

> **Program is not signed.**

![Le message « Program is not signed » au-dessus de l'éditeur de code d'un objet Program dans le Workbench Niagara](/articles/signer-programmes-niagara-n4/01-erreur-program-not-signed.png)

Ton premier réflexe ? Relancer la compilation. Évidemment ça change rien. Deuxième réflexe ? Te dire que t'as cassé quelque chose. Spoiler : non, t'as rien cassé. C'est Tridium qui a décidé que désormais, ton code, faut le **signer**.

Allez, je t'explique d'où ça sort et surtout comment s'en débarrasser proprement. Compte une dizaine de minutes, montre en main.

## Mais c'est quoi ce délire de signature ?

Niagara N4, à terme, va **exiger la signature du code** (le fameux *code signing*) pour tous les objets Program. En clair : Tridium veut s'assurer que le bout de code qui tourne dans la station a bien été produit par quelqu'un d'identifié, et pas balancé par le premier rigolo qui passait par là.

C'est de la sécurité, et honnêtement c'est plutôt sain. Le souci, c'est que le jour où ça s'active, si t'es pas au courant, t'as l'impression que ta station est cassée. Les produits concernés que tu croiseras le plus :

- **I/A Series N4 — Jace 8000**
- **I/A Series N4 — Enterprise Server**

La solution tient en une phrase : on va **fabriquer un certificat** dans le Workbench, et l'utiliser pour signer nos Program. Une fois, bien fait, et on n'en parle plus. C'est parti.

## Étape 1 — On fabrique le certificat

Dans le menu déroulant du Workbench : **Tools → Certificate Management**.

> ⚠️ **Attention, piège classique** : tu NE veux PAS le Certificate Management de la **Platform**. Celui-là est différent, il sert pour les stations en cours d'exécution. Tu prends bien celui des **Tools**. Note-le dans un coin, c'est l'erreur que tout le monde fait au début.

Ensuite :

1. Onglet **User Key Store** → clic sur **New**.
2. Tu remplis tous les champs requis (Alias, Common Name, etc. — mets des trucs explicites, ton futur toi te remerciera).
3. **LE détail à ne pas zapper** : la date **Not After**. Par défaut elle est à **+1 an**. Si tu la laisses, ton certificat expire dans un an et tu te retapes toute l'histoire. Pousse-la loin. Genre 2099. On n'est pas à dix ans près.
4. Dans **Certificate Usage**, tu sélectionnes bien **Code Signing**.

![Fenêtre Generate Self Signed Certificate avec la date Not After et le Certificate Usage réglé sur Code Signing mis en évidence](/articles/signer-programmes-niagara-n4/02-certificat-code-signing.png)

Tu valides avec **OK**, et là il te demande de définir un **mot de passe** pour le certificat.

> 📝 Ce mot de passe, le Workbench te le redemandera à la compilation. Donc tu le choisis pas au pif un vendredi soir, et tu le ranges dans ton gestionnaire de mots de passe. Pas sur un post-it. J'ai dit pas sur un post-it.

![Boîte de dialogue de saisie du mot de passe du certificat](/articles/signer-programmes-niagara-n4/03-mot-de-passe.png)

## Étape 2 — On exporte le certificat

Maintenant on va sortir le certificat du Key Store pour pouvoir le faire reconnaître ailleurs.

Sélectionne ton tout nouveau certificat, puis clique sur **Export**.

![Le certificat sélectionné dans le User Key Store avec le bouton Export](/articles/signer-programmes-niagara-n4/04-export-certificat.png)

Là, point important : tu exportes le certificat **SANS la clé privée**. Il te demande un nom de fichier et un emplacement. C'est cette version « publique » qu'on ira faire approuver partout.

> 💡 **Le conseil de pro** : fais aussi un export **AVEC la clé privée**, range-le bien au chaud avec un nom explicite (et son mot de passe). Pourquoi ? Le jour où tu changes de PC ou que tu bosses depuis une autre machine, tu pourras réimporter exactement le même certificat au lieu d'en refaire un. Ça t'évite d'avoir quinze certificats différents qui traînent dans la nature.

![Boîte de dialogue d'export du certificat, option sans clé privée](/articles/signer-programmes-niagara-n4/05-export-sans-cle.png)

## Étape 3 — On dit au Workbench qu'on lui fait confiance

On vient de créer le certificat, maintenant faut que le Workbench l'**accepte**.

1. Change d'onglet, direction **User Trust Store**.
2. Bouton **Import** en bas, tu sélectionnes le certificat **sans la clé privée** (celui de l'étape 2).

S'il passe au **vert**, c'est gagné : il est accepté. 🟢

![Le certificat affiché en vert dans l'onglet User Trust Store](/articles/signer-programmes-niagara-n4/06-trust-store-vert.png)

## Étape 4 — On branche le certificat sur la signature de code

Presque fini. Faut juste dire au Workbench : « pour signer, utilise CE certificat ».

1. Menu déroulant → **Tools → Options**.
2. Dans le panneau de gauche, trouve **Code Signing Options**.
3. Section **Signing Cert** → sélectionne ton certificat (celui que tu viens de faire passer au vert), puis **OK**.

Voilà, le Workbench sait désormais avec quoi signer. Mais on n'a pas tout à fait terminé…

## Étape 5 — On configure la Platform locale

Dernier morceau pour la station locale : il faut aussi que la **Platform** de ta machine fasse confiance au certificat.

1. Ouvre la **Platform localhost** → double-clic sur **Certificate Management**.
2. Onglet **User Trust Store** → **Import** → et tu re-sélectionnes le certificat **sans la clé privée**. (Oui, encore lui. C'est le même partout, c'est ça le principe.)

![Certificate Management de la Platform localhost, onglet User Trust Store](/articles/signer-programmes-niagara-n4/07-platform-localhost.png)

## Et… ça compile ! 🎉

Retour sur ton objet Program. Tu compiles.

> 📝 La **première fois**, le Workbench te demande le **mot de passe** du certificat (celui de l'étape 1, tu l'avais bien rangé hein ?). Tu le saisis, et…

…le point passe au vert, le code se compile, plus de message qui râle. **Program is up-to-date.** Le bonheur.

![L'objet Program compilé avec succès, statut Program is up-to-date](/articles/signer-programmes-niagara-n4/08-compilation-ok.png)

---

## « Oui mais moi c'est sur une Jace distante »

Ah, le classique. Tu fais toute la manip ci-dessus, tout marche nickel en local, tu pousses fier sur ta **Jace 8000**… et elle te sort un nouveau message tout neuf :

> **Certificate not trusted.**

![Le message « Certificate not trusted » lors d'une compilation sur une Jace distante](/articles/signer-programmes-niagara-n4/09-erreur-jace.png)

Logique en fait : ta Jace, elle, n'a jamais entendu parler de ton certificat. Faut lui présenter, exactement comme tu l'as fait pour la Platform locale.

1. Sur la **Platform de la Jace** → double-clic sur **Certificate Management**.
2. Onglet **User Trust Store**.
3. **Import** → ton certificat **sans la clé privée**.

Et c'est tout. Tes objets Program se compilent maintenant tranquillement sur la Jace.

> 🔁 **À retenir** : le certificat « sans clé privée », c'est lui qu'on va promener partout (Workbench Trust Store, Platform locale, Platform de chaque Jace). À chaque nouvelle machine ou nouvelle Jace qui doit faire tourner ton code signé, tu refais juste cet import dans son **User Trust Store**. Cinq secondes.

## En résumé

Pour ne plus jamais te faire avoir :

1. **Tools → Certificate Management** (pas celui de la Platform !), onglet **User Key Store** → **New**, usage **Code Signing**, date d'expiration repoussée loin.
2. **Export** sans clé privée (et une sauvegarde avec clé privée au chaud).
3. Import dans le **User Trust Store** du Workbench → vert.
4. **Tools → Options → Code Signing Options** → tu pointes ton certificat.
5. Import du certificat dans le **User Trust Store** de chaque Platform (locale **et** chaque Jace).

Dix minutes une bonne fois, et l'erreur « Program is not signed » devient un mauvais souvenir. Maintenant, retourne coder ta logique tranquille.

Amusez-vous bien 🛠️

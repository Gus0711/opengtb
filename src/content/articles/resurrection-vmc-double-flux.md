---
title: "On a ressuscité une VMC double flux morte depuis 3 ans (tuée par une télécommande noyée)"
date: "2026-05-20"
author: "Gus"
tags: ["gtb", "cvc", "distech-controls", "ecy-650", "retrofit"]
excerpt: "Trois ans qu'une grosse VMC double flux dormait, débranchée, abandonnée. La cause du drame ? Une simple télécommande qui avait pris l'eau. On est repartis de zéro : dépose de la régul propriétaire, recâblage intégral, automate Distech ECY-650… et un redémarrage à retenir son souffle. Récit d'un rétrofit, avec ses victoires et son imprévu qui pique."
cover: "/articles/resurrection-vmc-double-flux/cta-toiture.jpg"
---

Hello la GTB ! 👋

Aujourd'hui je te raconte pas un tuto, mais une **histoire de chantier**. Le genre qui finit bien, mais avec une petite frayeur au milieu — parce que c'est ça, le vrai métier.

Le décor : une grosse VMC double flux, sur le toit d'un bâtiment scolaire. Sauf que cette machine-là, ça faisait **trois ans** qu'elle dormait. Débranchée. Abandonnée. Une belle bête à l'arrêt complet.

![La CTA double flux sur la toiture, avec ses gaines et sa passerelle d'accès](/articles/resurrection-vmc-double-flux/cta-toiture.jpg)

Et tu sais quoi a tué cette installation pendant trois ans ? Accroche-toi…

## Le coupable : une télécommande qui a pris l'eau 💧

Voilà. Pas un moteur grillé, pas un échangeur bouché, pas une carte de puissance partie en fumée. Non. **Une simple télécommande**, la petite régul propriétaire qui pilotait tout, qui a pris l'eau et rendu l'âme.

Et comme c'était du **matériel propriétaire**, pas de pièce de rechange simple, pas de solution évidente. Résultat : au lieu de bricoler, on a laissé tomber. La machine entière, mise au placard. Trois ans. Pour une télécommande.

C'est exactement le genre de truc qui me fait grincer des dents : une installation complète, des dizaines de milliers d'euros de matos CVC, K.O. à cause d'un boîtier propriétaire à 200 balles devenu introuvable. La leçon est déjà là, mais on y reviendra à la fin.

## On repart de zéro 🔧

Pas de demi-mesure. On a fait une **rénovation complète**, en repartant de la feuille blanche :

- ✂️ **Dépose** de toute l'ancienne régulation propriétaire. Dehors, le boîtier maudit.
- 🕵️ **Repérage et recâblage intégral** : sondes, pressostats, registres, moteurs… on a tout retracé, fil par fil. C'est le boulot ingrat, celui qu'on voit pas sur les photos, mais c'est 80 % du job sur un rétrofit. Quand t'arrives sur une install que personne a documentée depuis dix ans, t'es un peu archéologue.

![L'armoire de toiture ouverte pendant le recâblage, automate et raccordements visibles](/articles/resurrection-vmc-double-flux/armoire-toiture.jpg)

## Le nouveau cerveau : un Distech ECY-650 🧠

Pour piloter tout ça, on a mis un **automate Distech Controls ECY-650**. Du solide, du communicant, du standard — fini le propriétaire qui t'enferme.

Et côté exploitation, on a soigné l'ergonomie avec **deux écrans** :

- 🖥️ Un **écran intégré sur le toit**, directement au plus près de la machine, pour les interventions sur site. Tu montes, t'as tout sous les yeux à côté de la CTA.
- 🖥️ Un **écran tactile déporté dans le local technique**, pour piloter au chaud sans se taper la passerelle sous la flotte. Parce que faire un réglage à genoux sur un toit venté en plein hiver, c'est rigolo deux minutes.

<figure>
  <img src="/articles/resurrection-vmc-double-flux/ecran-deporte.jpg" alt="Le pupitre du local technique : commutateurs, voyants de défaut et l'écran tactile déporté affichant la supervision" loading="lazy" />
  <figcaption>Le pupitre déporté dans le local technique : commutateurs et voyants de défaut physiques, et l'écran tactile qui affiche le synoptique en temps réel.</figcaption>
</figure>

Tu remarqueras sur le pupitre les commutateurs et les voyants bien old-school (Ventilation, Chauffage, Défaut insufflation, Défaut extraction, Défaut batterie électrique) — on garde le confort du tableau physique, mais derrière, tout est piloté et remonté par l'automate.

## Le moment de vérité : le redémarrage ⚡

Là, faut être honnête : c'est LE moment où tu serres les fesses.

Trois ans d'inactivité. Des moteurs qui ont pas tourné depuis une éternité, des roulements qui ont pu prendre l'humidité, des condensateurs qui ont pu sécher… On avait pris **toutes les mesures électriques possibles en amont** (isolement, continuité, on vérifie tout ce qui peut l'être avant d'envoyer le jus), mais à un moment faut appuyer sur le bouton et croiser les doigts.

On retient notre souffle. On lance.

Et là… **miracle : les moteurs repartent au quart de tour !** 🔄 Insufflation, extraction, la roue qui tourne, l'échangeur qui fait son boulot. Le synoptique de supervision s'anime, les températures remontent. Bonheur total.

<figure>
  <img src="/articles/resurrection-vmc-double-flux/supervision.png" alt="Le synoptique de supervision de la VMC double flux : rendement de roue, températures air neuf / repris / soufflé" loading="lazy" />
  <figcaption>Le synoptique de supervision : roue de récupération, débits, et les températures air neuf / post-roue / soufflé. C'est ici que le défaut de batterie se lira au premier coup d'œil.</figcaption>
</figure>

## Sauf que… la réalité du terrain te rattrape toujours 💥

Tu pensais que ça allait être trop beau ? Moi aussi.

La **batterie électrique de chauffe**, elle, n'a pas apprécié ses trois ans d'humidité. Malgré toute notre vigilance, l'**oxydation** avait fait son œuvre en silence. Au premier vrai démarrage en chauffe, un **connecteur a lâché** et l'un des **étages de chauffe a rendu l'âme**. 🔥

Et c'est là que la supervision montre toute son utilité. Tu vois sur le synoptique une **commande de chauffe à plus de 80 %**… mais une **température de soufflage qui bouge à peine**. 😉 Pour un œil exercé, le diagnostic saute aux yeux : si tu pousses la chauffe à fond et que l'air sort à peine plus chaud, c'est qu'un étage est mort. Sans supervision, t'aurais cherché pendant des heures. Là, c'est écrit noir sur blanc à l'écran.

## La morale du rétrofit 🛠️

C'est ça, le quotidien du rétrofit : **des victoires et des imprévus à gérer en direct**. Tu peux faire toutes les mesures du monde, prendre toutes les précautions, le terrain te réserve toujours une petite surprise. L'important c'est de la voir, de la comprendre, et de l'encaisser.

Au final, le bilan est limpide :

- ✅ Une installation **sauvée** de la casse, après trois ans d'arrêt.
- ✅ Une régulation **communicante** et ouverte (fini le propriétaire qui prend l'eau et bloque tout).
- ✅ Une machine **de nouveau opérationnelle**, exploitable depuis le toit ET le local technique.
- ✅ Un défaut de batterie **immédiatement diagnostiqué** grâce à la supervision.

Et la vraie leçon de l'histoire ? Une install complète a failli partir à la benne à cause d'**un boîtier propriétaire** devenu introuvable. Le standard et le communicant, c'est pas un luxe d'intégrateur : c'est ce qui fait qu'une machine est réparable dans dix ans au lieu d'être condamnée par une pièce qu'on ne trouve plus.

Bref. Une VMC ressuscitée, un étage de chauffe à remplacer, et une belle journée de chantier.

À la prochaine 🛠️

*#GTB #BMS #CVC #DistechControls #Retrofit #VMC*

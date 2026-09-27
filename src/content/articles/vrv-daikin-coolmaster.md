---
title: "Du VRV Daikin dans ta GTB sans y laisser ta santé mentale : le CoolMaster sur le grill"
date: "2026-09-27"
author: "Gus"
tags: ["daikin", "vrv", "coolautomation", "bacnet", "distech", "niagara", "retex"]
excerpt: "Deux gros groupes VRV Daikin, un bâtiment entier à reprendre et un client qui veut que ça marche même quand Internet fait la sieste. On a sorti un CoolMaster de CoolAutomation, un automate Distech et une Niagara 4. Je te raconte tout, y compris le piège de la sonde de reprise."
cover: "/articles/vrv-daikin-coolmaster/cover.jpg"
---

<script>
	import EcartSondeChart from '$lib/components/articles/EcartSondeChart.svelte';
</script>

![Schéma de l'architecture : groupes VRV Daikin raccordés au CoolMaster, remontée en BACnet/IP vers l'automate Distech, puis tunnel VPN 4G vers la supervision Niagara 4](/articles/vrv-daikin-coolmaster/cover.jpg)

Hello la GTB ! 👋

Si t'as déjà essayé de faire causer une clim propriétaire avec ta supervision, tu connais la chanson : passerelle constructeur introuvable, tarif qui pique, doc de 300 pages en anglais approximatif… et au bout du compte trois points remontés sur les cinquante promis.

Bref, l'enfer.

Sur un chantier récent, on a testé une autre approche, et franchement ça s'est tellement bien passé que je me devais de vous en parler. Au programme : un **CoolMaster** de chez [CoolAutomation](https://coolautomation.com), un automate **Distech**, une **Niagara 4** et un modem 4G. Allez, on déroule.

## Le contexte : un gros bâtiment et du Daikin partout

Le tableau est simple. Un grand bâtiment, **deux énormes groupes VRV Daikin** qui arrosent toutes les zones. <!-- À COMPLÉTER : nombre d'unités intérieures, usage du bâtiment -->

Pour ceux qui débarquent : un VRV (*Variable Refrigerant Volume*), c'est un système de clim où une unité extérieure alimente tout un paquet d'unités intérieures, avec un bus de communication propriétaire qui relie tout ce petit monde. Pratique pour Daikin, beaucoup moins pour nous quand il faut aller lire dedans.

Le cahier des charges tenait en trois lignes :

- reprendre la main sur **toutes** les unités depuis la GTB ;
- que ça tourne **même si le réseau tombe** (hors de question que les occupants finissent en glaçons parce que la box a planté) ;
- une interface propre pour le client, parce qu'au final c'est la seule chose qu'il voit.

## Le CoolMaster : tu branches, il scanne, c'est plié

<!-- IMAGE : photo du CoolMaster câblé dans l'armoire -->

Le principe du CoolMaster (ici un **CoolMasterPro**) est bête comme chou, et c'est justement ce qui le rend génial. Le boîtier se raccorde **directement sur le bus Daikin** (les bornes F1/F2 côté unité extérieure) et il scanne le bus tout seul. <!-- À VÉRIFIER : raccordement F1/F2 -->

Quelques secondes plus tard, **toutes** les unités intérieures de l'installation remontent, bien alignées, avec une adresse unifiée. Pas de config obscure, pas de logiciel constructeur à 2 000 balles, pas de dongle mystérieux. J'avoue, la première fois, j'ai cru que j'avais raté une étape.

<!-- À COMPLÉTER : temps de mise en service réel -->

## Le Distech en chef d'orchestre local

Le cloud c'est chouette, mais la résilience, c'est le nerf de la guerre. Donc toute la data part du CoolMaster en **BACnet/IP natif** vers un automate **Distech Controls Eclypse ECY-103**, qui fait office de cerveau local.

<figure class="not-prose my-8">
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
		<div class="border-border flex flex-col overflow-hidden rounded-md border">
			<div class="flex h-48 items-center justify-center bg-white p-4">
				<img src="/articles/vrv-daikin-coolmaster/coolmaster.webp" alt="Le boîtier CoolMasterPro de CoolAutomation avec son écran tactile" class="max-h-full w-auto object-contain" loading="lazy" />
			</div>
			<p class="border-border bg-card text-text-soft border-t px-3 py-2 font-mono text-xs"><span class="text-primary">01</span> · CoolMasterPro — le traducteur</p>
		</div>
		<div class="border-border flex flex-col overflow-hidden rounded-md border">
			<div class="flex h-48 items-center justify-center bg-white p-4">
				<img src="/articles/vrv-daikin-coolmaster/ecy103.webp" alt="L'automate Distech Controls Eclypse ECY-103" class="max-h-full w-auto object-contain" loading="lazy" />
			</div>
			<p class="border-border bg-card text-text-soft border-t px-3 py-2 font-mono text-xs"><span class="text-primary">02</span> · Eclypse ECY-103 — le cerveau</p>
		</div>
	</div>
	<figcaption class="text-text-dim mt-2 text-center text-xs">Le duo du chantier : le CoolMaster lit le bus Daikin, l'Eclypse fait tourner la logique en BACnet/IP.</figcaption>
</figure>

Et côté points remontés, c'est open bar :

- **consignes** en lecture/écriture ; <!-- À VÉRIFIER : pas de 0,1 °C ou 0,5 °C ? -->
- **température d'ambiance** de chaque unité intérieure (on en reparle plus bas, il y a un piège) ;
- **modes** : chaud, froid, auto, ventilation ;
- **vitesse de ventilation** ;
- et le Graal : **les codes défaut Daikin exacts**. Fini de faire le tour du bâtiment pour trouver quelle cassette est en PLS, tu sais direct laquelle et pourquoi.

<!-- IMAGE : capture de la liste des objets BACnet côté Distech -->

Toute la logique (programmes horaires, automatismes, sécurités) tourne **en local sur le Distech**. Concrètement, si la liaison vers l'extérieur saute, le bâtiment ne s'en rend même pas compte. Il continue sa vie tranquille.

## Supervision : 4G, VPN et Niagara 4

<!-- IMAGE : schéma d'architecture CoolMaster → Distech → modem 4G → VPN → Niagara -->

Pour la supervision globale, l'architecture est simple et propre :

1. un **modem 4G** sur site qui monte un **tunnel VPN** vers notre serveur de supervision (pas de port ouvert sur Internet, on n'est pas des sauvages) ;
2. sur le serveur, une bonne vieille **Tridium Niagara 4** qui centralise tout ;
3. pour l'interface client, les synoptiques sont faits avec **Distech Designer** : fluides, responsives, lisibles.

L'objectif, c'est que le facility manager pilote son confort du bout du doigt, sans avoir besoin d'un bac+5 en thermique.

<!-- IMAGE : capture d'un synoptique -->

## Le vrai point fort : le support CoolAutomation

Du matos qui marche, on en trouve. Du **support** qui marche, beaucoup moins. Et c'est là que CoolAutomation m'a vraiment bluffé.

Pas de bot qui te renvoie vers la page 142 d'un PDF. Des gens qui connaissent leur sujet de A à Z, qui t'aident dès le **dimensionnement**, qui **valident l'architecture** avec toi et qui répondent vite le jour de la mise en service quand t'as un doute sur le câblage du bus. Dans notre métier, ça vaut de l'or.

<!-- Si partenariat / matériel fourni : le mentionner ici en une ligne -->

## Les petits bémols (et un gros piège)

Parce que rien n'est parfait (et que tu me croirais pas sinon), voilà le piège qui nous a fait perdre un bon moment. Spoiler : c'est pas la faute du CoolMaster.

### La sonde de reprise qui ment… mais seulement à ta GTB

L'installation, c'est des **cassettes plafonnières Daikin**. Chaque cassette a sa propre sonde de température, planquée **dans la reprise d'air, au plafond**. Et chaque pièce a aussi sa **télécommande murale**, qui embarque elle aussi une sonde, à hauteur d'homme, là où les gens vivent.

Si personne ne touche à rien à la mise en service, la cassette prend **sa sonde de reprise** comme référence. Et le souci, c'est que l'air chaud monte : au plafond, il fait plus chaud qu'au niveau du bureau.

Côté Daikin, pas de drame : la machine **le sait** et applique une correction en interne dans sa régulation. Le confort est bon, les occupants ne sentent rien.

Sauf que ta GTB, elle, récupère la **valeur brute**. Résultat, la `Temp_Room` qui remonte dans le CoolMaster est **décalée de +2 à +4 °C** par rapport à ce qu'affiche la télécommande murale. Et là, ça pique :

- **tes courbes et tes rapports** sont faux : tu supervises des températures qui n'existent pas dans la pièce ;
- **tes alarmes** de dérive de température se déclenchent pour rien (ou ne se déclenchent pas quand il faudrait) ;
- **le client** voit 24 °C sur ton beau synoptique, 21 °C sur sa télécommande… et c'est **toi** qu'il appelle, pas Daikin.

Pour que tu visualises bien le truc, voilà une journée type. Passe la souris sur la courbe, et bascule la référence pour voir ce que change le réglage :

<EcartSondeChart />

### La solution (et un petit message aux metteurs en service)

La correction consiste à passer la **référence de température sur la sonde de la télécommande murale**, via les réglages sur site de l'unité (les *field settings* Daikin). Une fois fait, la `Temp_Room` remontée colle enfin à la réalité de la pièce, et ta supervision affiche des valeurs réelles. <!-- À VÉRIFIER : code exact du réglage selon le modèle de télécommande -->

Et du coup, petit message amical aux collègues qui font les mises en service Daikin : **pensez à basculer la référence de température sur la télécommande**. Le client l'a payée, cette sonde. Elle est à hauteur d'homme, dans la pièce, là où il fait réellement la température ressentie. Ce serait dommage de la laisser décorer le mur 😅

<!-- À COMPLÉTER : autres bémols éventuels (prix, délai, limites du CoolMaster) -->

## Alors, verdict ?

Si t'as des flottes de VRV à intégrer proprement en BACnet ou en Modbus, Daikin ou autre, le CoolMaster mérite clairement que tu y jettes un œil. Plug & play pour de vrai, des points complets, et une équipe derrière qui ne te lâche pas.

Et toi, c'est quoi tes techniques de sioux pour dompter les clims propriétaires ? Viens en parler sur le [fil de messages](/messages) !

À très vite pour de nouvelles bidouilles 🔧

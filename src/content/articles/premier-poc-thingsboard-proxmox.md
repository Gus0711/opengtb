---
title: "Premier POC ThingsBoard sur Proxmox"
date: "2026-03-12"
tags: ["thingsboard", "proxmox", "docker", "lxc"]
excerpt: "Retour de chantier après deux semaines à faire tenir ThingsBoard CE sur une LXC Debian 12 dans un cluster Proxmox. Ce qui a marché du premier coup, ce qui a coincé."
cover: "/articles/premier-poc-thingsboard-proxmox.svg"
---

Le besoin était simple sur le papier : monter une plateforme IoT pour visualiser une centaine de capteurs LoRaWAN sans payer la version managed-cloud d'un éditeur. ThingsBoard Community Edition était le candidat évident. Je voulais le faire tourner sur l'infra Proxmox existante du client, sans VM dédiée si possible.

## Pourquoi LXC plutôt qu'une VM ?

Un container LXC consomme dix fois moins de RAM qu'une VM Debian équivalente, et le démarrage est immédiat. Le client a une dizaine de containers déjà en prod sur le cluster ; rester cohérent avec le pattern existant simplifie la maintenance.

Le seul piège : ThingsBoard CE veut Docker à l'intérieur. Donc LXC nesting (`nesting=1`, `keyctl=1`) à activer sur le container côté Proxmox, et `cgroup v2` qui se mêle un peu avec l'iptables embarqué par Docker. Rien de bloquant.

## Le docker-compose initial

Pour ne pas perdre de temps à débugger une install bare-metal, j'ai démarré avec le compose officiel adapté :

```yaml
services:
  thingsboard:
    image: thingsboard/tb-postgres:3.7.0
    ports:
      - "8080:9090"
      - "1883:1883"
      - "5683:5683/udp"
    environment:
      TB_QUEUE_TYPE: in-memory
      INSTALL_TB: "true"
      LOAD_DEMO: "true"
    volumes:
      - tb-data:/data
      - tb-logs:/var/log/thingsboard
    restart: unless-stopped

volumes:
  tb-data:
  tb-logs:
```

`in-memory` pour la queue suffit largement à ce stade — pas la peine d'embarquer Kafka pour un POC. Le `LOAD_DEMO` crée le tenant de démo, pratique pour valider l'UI sans intégration capteur. Une fois que les vraies devices arrivent, on bascule `LOAD_DEMO: "false"` et on tire un dump propre du compose.

## Ce qui a coincé

Trois choses que je n'avais pas anticipées :

1. **Le port MQTT 1883 squatté par mosquitto** sur l'host. J'avais oublié qu'un autre container exposait déjà MQTT. Solution rapide : `1884:1883` côté ThingsBoard, et reverse-proxy MQTT côté HAProxy pour router selon le client_id.
2. **La consommation RAM** monte à 2.3 Go au démarrage avec Postgres embarqué. Sizing initial LXC à 1.5 Go = OOM-killer dans la minute. Bumped à 4 Go, ça respire.
3. **Le rule engine ne digère pas les payloads Cayenne LPP** bruts sans un decoder JS custom dans le device profile. Une heure perdue à chercher pourquoi mes températures arrivaient comme `data: "AQEAFw=="`. Mention pour plus tard : décoder côté ChirpStack avant de forwarder.

## La suite

POC validé, le client signe pour un déploiement à 600 capteurs sur 12 sites. Prochaine étape : externaliser Postgres, basculer la queue en RabbitMQ, et écrire un article plus sérieux sur le sizing réel.

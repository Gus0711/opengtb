# Exporters

Abstraction des exports (PDF, CSV, SVG, JSON) des outils OpenGTB.

**Phase 1 (V1, actuelle)** : génération locale côté navigateur, branding OpenGTB.

**Phase 2 (tier payant, à venir)** : bascule possible vers un appel API serveur
pour obtenir un export white-label avec le logo de l'utilisateur connecté.
Le contrat `Exporter<TInput>` reste identique côté appelant ; seule
l'implémentation change.

Cf. `src/lib/auth/` pour le module d'authentification associé.

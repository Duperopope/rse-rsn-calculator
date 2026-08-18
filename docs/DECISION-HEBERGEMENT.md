# Décision d’hébergement du pilote — 18 août 2026

## Conclusion

Aucune offre gratuite examinée ne prouve à elle seule les exigences actuelles
de FIMOCheck (processus Node, données persistantes, fichiers chiffrés,
sauvegardes restaurables et absence de facturation surprise). Le pilote public
reste donc interdit aux données réelles tant qu’une cible n’a pas passé la
commande `tools/qualify-public-pilot.js` et un exercice de restauration.

| Option | Avantage | Limite déterminante | Décision pilote |
| --- | --- | --- | --- |
| Render Free | Node, TLS et déploiement simples | système de fichiers éphémère ; pas de disque persistant ; Postgres gratuit expirant après 30 jours | démonstration sans données uniquement |
| Supabase Free | Postgres, Auth et stockage avec quotas gratuits | pause après inactivité, aucune sauvegarde automatique gratuite, migration applicative nécessaire | candidat de développement, pas preuve de production |
| Cloudflare Workers + D1/R2 | quotas gratuits et architecture distribuée | réécriture du serveur Node/SQLite et validation d’un nouveau modèle de sécurité | piste structurante, pas migration immédiate |
| VM « always free » | contrôle du disque et du conteneur | compte cloud, exploitation système, disponibilité de capacité et sauvegarde à organiser | candidat pilote si une VM est effectivement obtenue |

Sources officielles consultées :

- [Render — limites des services gratuits](https://render.com/docs/free)
- [Render — disques persistants réservés aux services payants](https://render.com/docs/disks)
- [Supabase — quotas et limites du plan gratuit](https://supabase.com/pricing)
- [Cloudflare Workers — tarification et disponibilité de D1](https://developers.cloudflare.com/workers/platform/pricing/)

## Porte de publication externe

Après création d’une cible autorisée et injection des secrets hors dépôt :

```sh
node tools/qualify-public-pilot.js https://pilote.example
```

La commande échoue si la cible redescend en HTTP, si les en-têtes HSTS/CSP et
anti-sniffing manquent, si une route privée répond anonymement ou si une
origine arbitraire obtient un accès CORS. Cette sonde ne remplace pas la
restauration d’une sauvegarde sur une nouvelle instance, mais empêche qu’un
simple écran accessible soit présenté comme une production qualifiée.

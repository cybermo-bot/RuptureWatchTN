# Recherche publique et revue de la branche olfa

Session du 25 novembre 2026. Référence de comparaison `origin/main` (`939b0c6`). La branche `olfa` ajoute `0b5c6f6` au-dessus de cette référence.

## Éléments réutilisables

| Élément de `olfa` | Intégration proposée |
| --- | --- |
| Navigation du parcours dans `LandingGlobe` et sélection des moments clés dans `tourStops()` | Le journal du scénario permet maintenant de revenir à chaque changement de niveau déjà affiché. La limite d’un seul gouvernorat reste visible dans l’explication du scénario existant. |
| Journal de changements à côté de la carte dans `LandingNational` | Reprendre les lignes datées avec niveau et raison dans la coordination, à partir de son propre journal et de ses règles d’affichage. |
| Courbe à paliers et carte régionale dans `LandingNational` | Associer une période de suivi à la liste des événements dans les vues professionnelles qui en ont besoin. La carte actuelle est déjà disponible avec les formes des gouvernorats et un équivalent texte. |

Le globe est pertinent comme expérience de démonstration facultative. Il dépend de WebGL et de Three.js, charge une géométrie d’environ 520 Ko et introduit une seconde palette et trois polices. La comparaison porte sur le code de `olfa`. Aucun aperçu Vercel n’était associé à son commit dans GitHub.

## Changements

- « Je cherche un médicament » présente trois exemples issus du catalogue CNAM dès l’ouverture. Un exemple lance la même recherche qu’une saisie. La page distingue les molécules des présentations par marque et propose de réessayer quand la recherche échoue. Une réponse obsolète ne peut pas remplacer les résultats de la saisie actuelle.
- La fiche met en évidence le produit choisi, la molécule qui porte le signal et le bouton de demande. L’historique s’ouvre à la demande. La notice de portée accompagne aussi le texte partagé. Le produit choisi reste présélectionné dans la demande et peut être élargi à toute marque de la même molécule.
- Des lignes avec séparateurs remplacent plusieurs panneaux dans les résultats, la fiche, le scénario et l’espace pharmacie. Le formulaire met en évidence le choix de la présentation.
- Les libellés publics nouveaux ou révisés sont dans les namespaces `medicines` et `medicine` de `public.json` en français et en arabe. La lecture de droite à gauche a été vérifiée dans Chrome. Les traductions restent à relire par un arabophone.

## Portée du signal et photos

Les rapports alimentent actuellement un niveau par `molecule_id`. L’app peut donc signaler une difficulté d’approvisionnement pour une molécule. Il faudrait des rapports et des règles au niveau de la présentation pour établir une rupture de la boîte précise, ou de toutes les présentations. La disponibilité demandée aux pharmacies peut déjà viser une présentation. L’évaluateur et les migrations restent hors de cette modification.

La recherche de photos n’a pas établi une correspondance et un droit de réutilisation pour les présentations vérifiées. La photo Atarax montre 25 comprimés et la ligne CNAM `300968` en indique 30. La photo Commons intitulée « Exforge » montre le marquage `VDL`, associé à Exforge HCT par l’EMA. Les pictogrammes de forme existants restent affichés. [Photo Atarax](https://commons.wikimedia.org/wiki/File:Atarax.JPG) · [Photo Exforge](https://commons.wikimedia.org/wiki/File:Exforge.jpg) · [EMA, Exforge HCT](https://www.ema.europa.eu/en/documents/product-information/exforge-hct-epar-product-information_en.pdf)

Question ouverte pour le catalogue photo. Quelles présentations peuvent être photographiées par la pharmacie partenaire avec autorisation de publication, ou fournies sous licence par le fabricant ? Une photo peut être rattachée au code PCT après vérification de la marque, du dosage, de la forme et du conditionnement.

## Vérifications locales

- `npm run check` passe avec 651 tests. Le détecteur Impeccable a signalé une taille de police littérale dans le formulaire. Le titre utilise désormais le même échelon que la fiche.
- Chrome à 360 px et 1280 px. Les exemples lancent la recherche, les erreurs peuvent être retentées, les résultats d’une ancienne saisie disparaissent et une faute de frappe retourne la molécule attendue.
- À 360 px, une recherche ANTIOMAL mène à la boîte de 60 comprimés à 500 mg, dont le choix est présélectionné dans la demande. Le passage à toute marque affiche la prudence requise. Aucune demande réelle n’a été envoyée.
- Le journal interactif du scénario revient à un événement déjà affiché. Les fiches française et arabe ont été contrôlées à 360 px, sans défilement horizontal.
- L’ouverture de la PR et la vérification sur son déploiement restent distinctes de ces contrôles locaux. Le scénario et l’espace pharmacie sont les seuls écrans professionnels ou de démonstration retouchés dans cette session.

[Recherche vide](medicine-search-design/search-fr-360.png) · [Résultats](medicine-search-design/search-results-fr-360.png) · [Fiche en français](medicine-search-design/status-fr-360.png) · [Fiche en arabe](medicine-search-design/status-ar-360.png)

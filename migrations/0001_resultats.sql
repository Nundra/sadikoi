-- Résultats du défi du jour (functions/api/daily.ts) : une ligne par jour, version des règles,
-- score et joueur. Refaire le même score ne compte pas une deuxième fois (clé primaire) ; un autre
-- score fait une autre ligne. Le joueur n'est que l'empreinte SHA-256 d'un identifiant tiré au
-- hasard par son navigateur. Lignes gardées 30 jours.
CREATE TABLE resultats (
  jour TEXT NOT NULL,
  version INTEGER NOT NULL,
  points INTEGER NOT NULL,
  etoiles INTEGER NOT NULL,
  pa_depenses INTEGER NOT NULL,
  prycipithon INTEGER NOT NULL,
  joueur TEXT NOT NULL,
  date INTEGER NOT NULL,
  -- Le tour qui a fait ce score (placement, sorts, actions), pour pouvoir le revoir un jour
  tour TEXT NOT NULL,
  PRIMARY KEY (jour, version, points, joueur)
);

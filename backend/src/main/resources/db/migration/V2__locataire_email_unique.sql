-- V2 : contrainte UNIQUE sur locataire.email (requise pour l'upsert)
-- et ajout index de recherche full-text locataire
ALTER TABLE locataire ADD CONSTRAINT uq_locataire_email UNIQUE (email);

CREATE INDEX idx_locataire_search ON locataire USING gin(
    to_tsvector('french', coalesce(nom, '') || ' ' || coalesce(email, ''))
);

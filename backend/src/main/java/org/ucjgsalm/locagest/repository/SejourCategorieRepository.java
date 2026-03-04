package org.ucjgsalm.locagest.repository;

import jakarta.inject.Singleton;
import javax.sql.DataSource;
import java.sql.*;
import java.util.*;
import org.ucjgsalm.locagest.domain.SejourCategorie;

@Singleton
public class SejourCategorieRepository {

    private final DataSource ds;

    public SejourCategorieRepository(DataSource ds) { this.ds = ds; }

    public List<SejourCategorie> findBySejourId(UUID sejourId) throws SQLException {
        String sql = """
            SELECT * FROM sejour_categorie
            WHERE sejour_id = ?
            ORDER BY ordre
            """;
        try (var conn = ds.getConnection();
             var ps = conn.prepareStatement(sql)) {
            ps.setObject(1, sejourId);
            return mapAll(ps.executeQuery());
        }
    }

    /** Insère une catégorie (snapshot copié du tarif au moment de la création du séjour). */
    public SejourCategorie insert(SejourCategorie sc) throws SQLException {
        String sql = """
            INSERT INTO sejour_categorie
                (id, sejour_id, tarif_id, nom_snapshot, prix_nuit_snapshot, nb_prevues, ordre)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            RETURNING *
            """;
        try (var conn = ds.getConnection();
             var ps = conn.prepareStatement(sql)) {
            ps.setObject(1, sc.id());
            ps.setObject(2, sc.sejourId());
            ps.setObject(3, sc.tarifId());
            ps.setString(4, sc.nomSnapshot());
            ps.setBigDecimal(5, sc.prixNuitSnapshot());
            ps.setObject(6, sc.nbPrevues());
            ps.setInt(7, sc.ordre());
            var rs = ps.executeQuery();
            rs.next();
            return map(rs);
        }
    }

    /**
     * Met à jour nb_reelles pour une catégorie — saisie du gardien.
     * On contrôle que la catégorie appartient bien au séjour attendu.
     */
    public void updateNbReelles(UUID categorieId, UUID sejourId, int nbReelles) throws SQLException {
        try (var conn = ds.getConnection();
             var ps = conn.prepareStatement(
                 "UPDATE sejour_categorie SET nb_reelles = ? WHERE id = ? AND sejour_id = ?")) {
            ps.setInt(1, nbReelles);
            ps.setObject(2, categorieId);
            ps.setObject(3, sejourId);
            int updated = ps.executeUpdate();
            if (updated == 0) throw new IllegalArgumentException(
                "Catégorie " + categorieId + " introuvable pour le séjour " + sejourId);
        }
    }

    private SejourCategorie map(ResultSet rs) throws SQLException {
        return new SejourCategorie(
            rs.getObject("id",        UUID.class),
            rs.getObject("sejour_id", UUID.class),
            rs.getObject("tarif_id",  UUID.class),
            rs.getString("nom_snapshot"),
            rs.getBigDecimal("prix_nuit_snapshot"),
            rs.getObject("nb_prevues", Integer.class),
            rs.getObject("nb_reelles", Integer.class),
            rs.getInt("ordre")
        );
    }

    private List<SejourCategorie> mapAll(ResultSet rs) throws SQLException {
        var list = new ArrayList<SejourCategorie>();
        while (rs.next()) list.add(map(rs));
        return list;
    }
}

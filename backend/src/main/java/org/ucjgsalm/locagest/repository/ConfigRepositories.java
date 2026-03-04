package org.ucjgsalm.locagest.repository;

import jakarta.inject.Singleton;
import javax.sql.DataSource;
import java.math.BigDecimal;
import java.sql.*;
import java.util.*;
import org.ucjgsalm.locagest.domain.*;
import org.ucjgsalm.locagest.domain.enums.*;

// ─────────────────────────────────────────────────────────────────────────────
@Singleton
public class ConfigSiteRepository {

    private final DataSource ds;
    public ConfigSiteRepository(DataSource ds) { this.ds = ds; }

    public Optional<String> get(String cle) throws SQLException {
        try (var conn = ds.getConnection();
             var ps = conn.prepareStatement("SELECT valeur FROM config_site WHERE cle = ?")) {
            ps.setString(1, cle);
            var rs = ps.executeQuery();
            if (rs.next()) return Optional.of(rs.getString("valeur"));
            return Optional.empty();
        }
    }

    public BigDecimal getDecimal(String cle) throws SQLException {
        return get(cle).map(BigDecimal::new)
            .orElseThrow(() -> new IllegalStateException("Config manquante : " + cle));
    }

    public int getInt(String cle) throws SQLException {
        return get(cle).map(Integer::parseInt)
            .orElseThrow(() -> new IllegalStateException("Config manquante : " + cle));
    }

    public Map<String, String> getAll() throws SQLException {
        try (var conn = ds.getConnection();
             var ps = conn.prepareStatement("SELECT cle, valeur FROM config_site ORDER BY cle")) {
            var rs = ps.executeQuery();
            var map = new LinkedHashMap<String, String>();
            while (rs.next()) map.put(rs.getString("cle"), rs.getString("valeur"));
            return map;
        }
    }

    public void set(String cle, String valeur, String updatedBy) throws SQLException {
        String sql = """
            INSERT INTO config_site (cle, valeur, updated_by)
            VALUES (?, ?, ?)
            ON CONFLICT (cle) DO UPDATE
            SET valeur = EXCLUDED.valeur, updated_by = EXCLUDED.updated_by, updated_at = now()
            """;
        try (var conn = ds.getConnection();
             var ps = conn.prepareStatement(sql)) {
            ps.setString(1, cle);
            ps.setString(2, valeur);
            ps.setString(3, updatedBy);
            ps.executeUpdate();
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
@Singleton
class TarifPersonneRepository {

    private final DataSource ds;
    TarifPersonneRepository(DataSource ds) { this.ds = ds; }

    public List<TarifPersonne> findActifs() throws SQLException {
        return findAll("WHERE actif = TRUE");
    }

    public List<TarifPersonne> findAll() throws SQLException {
        return findAll("");
    }

    private List<TarifPersonne> findAll(String where) throws SQLException {
        try (var conn = ds.getConnection();
             var ps = conn.prepareStatement(
                 "SELECT * FROM tarif_personne " + where + " ORDER BY ordre, nom")) {
            return mapAll(ps.executeQuery());
        }
    }

    public Optional<TarifPersonne> findById(UUID id) throws SQLException {
        try (var conn = ds.getConnection();
             var ps = conn.prepareStatement("SELECT * FROM tarif_personne WHERE id = ?")) {
            ps.setObject(1, id);
            var rs = ps.executeQuery();
            if (rs.next()) return Optional.of(map(rs));
            return Optional.empty();
        }
    }

    public TarifPersonne insert(TarifPersonne t) throws SQLException {
        String sql = """
            INSERT INTO tarif_personne (id, nom, prix_nuit, description, actif, ordre, updated_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            RETURNING *
            """;
        try (var conn = ds.getConnection(); var ps = conn.prepareStatement(sql)) {
            ps.setObject(1, t.id());
            ps.setString(2, t.nom());
            ps.setBigDecimal(3, t.prixNuit());
            ps.setString(4, t.description());
            ps.setBoolean(5, t.actif());
            ps.setInt(6, t.ordre());
            ps.setString(7, t.updatedBy());
            var rs = ps.executeQuery();
            rs.next();
            return map(rs);
        }
    }

    public TarifPersonne update(TarifPersonne t) throws SQLException {
        String sql = """
            UPDATE tarif_personne
            SET nom = ?, prix_nuit = ?, description = ?, actif = ?, ordre = ?, updated_by = ?, updated_at = now()
            WHERE id = ?
            RETURNING *
            """;
        try (var conn = ds.getConnection(); var ps = conn.prepareStatement(sql)) {
            ps.setString(1, t.nom());
            ps.setBigDecimal(2, t.prixNuit());
            ps.setString(3, t.description());
            ps.setBoolean(4, t.actif());
            ps.setInt(5, t.ordre());
            ps.setString(6, t.updatedBy());
            ps.setObject(7, t.id());
            var rs = ps.executeQuery();
            rs.next();
            return map(rs);
        }
    }

    private TarifPersonne map(ResultSet rs) throws SQLException {
        return new TarifPersonne(
            rs.getObject("id",  UUID.class),
            rs.getString("nom"),
            rs.getBigDecimal("prix_nuit"),
            rs.getString("description"),
            rs.getBoolean("actif"),
            rs.getInt("ordre"),
            rs.getObject("created_at", java.time.OffsetDateTime.class),
            rs.getObject("updated_at", java.time.OffsetDateTime.class),
            rs.getString("updated_by")
        );
    }

    private List<TarifPersonne> mapAll(ResultSet rs) throws SQLException {
        var list = new ArrayList<TarifPersonne>();
        while (rs.next()) list.add(map(rs));
        return list;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
@Singleton
class ConfigItemRepository {

    private final DataSource ds;
    ConfigItemRepository(DataSource ds) { this.ds = ds; }

    public List<ConfigItem> findActifs() throws SQLException {
        return findAll("WHERE actif = TRUE");
    }

    public List<ConfigItem> findAll() throws SQLException {
        return findAll("");
    }

    private List<ConfigItem> findAll(String where) throws SQLException {
        try (var conn = ds.getConnection();
             var ps = conn.prepareStatement(
                 "SELECT * FROM config_item " + where + " ORDER BY categorie, designation")) {
            return mapAll(ps.executeQuery());
        }
    }

    public ConfigItem insert(ConfigItem item) throws SQLException {
        String sql = """
            INSERT INTO config_item (id, designation, categorie, prix_unitaire, unite, actif)
            VALUES (?, ?, ?::categorie_item, ?, ?::unite_item, ?)
            RETURNING *
            """;
        try (var conn = ds.getConnection(); var ps = conn.prepareStatement(sql)) {
            ps.setObject(1, item.id());
            ps.setString(2, item.designation());
            ps.setString(3, item.categorie().name());
            ps.setBigDecimal(4, item.prixUnitaire());
            ps.setString(5, item.unite().name());
            ps.setBoolean(6, item.actif());
            var rs = ps.executeQuery();
            rs.next();
            return map(rs);
        }
    }

    public ConfigItem update(ConfigItem item) throws SQLException {
        String sql = """
            UPDATE config_item
            SET designation = ?, categorie = ?::categorie_item, prix_unitaire = ?, unite = ?::unite_item, actif = ?, updated_at = now()
            WHERE id = ?
            RETURNING *
            """;
        try (var conn = ds.getConnection(); var ps = conn.prepareStatement(sql)) {
            ps.setString(1, item.designation());
            ps.setString(2, item.categorie().name());
            ps.setBigDecimal(3, item.prixUnitaire());
            ps.setString(4, item.unite().name());
            ps.setBoolean(5, item.actif());
            ps.setObject(6, item.id());
            var rs = ps.executeQuery();
            rs.next();
            return map(rs);
        }
    }

    private ConfigItem map(ResultSet rs) throws SQLException {
        return new ConfigItem(
            rs.getObject("id", UUID.class),
            rs.getString("designation"),
            CategorieItem.valueOf(rs.getString("categorie")),
            rs.getBigDecimal("prix_unitaire"),
            UniteItem.valueOf(rs.getString("unite")),
            rs.getBoolean("actif"),
            rs.getObject("created_at", java.time.OffsetDateTime.class),
            rs.getObject("updated_at", java.time.OffsetDateTime.class)
        );
    }

    private List<ConfigItem> mapAll(ResultSet rs) throws SQLException {
        var list = new ArrayList<ConfigItem>();
        while (rs.next()) list.add(map(rs));
        return list;
    }
}

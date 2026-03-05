package org.ucjgsalm.locagest.repository;

import jakarta.inject.Singleton;
import javax.sql.DataSource;
import java.math.BigDecimal;
import java.sql.*;
import java.util.*;

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

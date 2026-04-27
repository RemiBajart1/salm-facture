FROM wordpress:6.7-php8.2-apache

# ── Composer ─────────────────────────────────────────────────────────────────
COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer

# ── WP-CLI ───────────────────────────────────────────────────────────────────
RUN curl -sS -o /usr/local/bin/wp \
      https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar \
    && chmod +x /usr/local/bin/wp

# ── Extensions PHP supplémentaires ───────────────────────────────────────────
# La plupart (mbstring, dom, gd, zip, openssl) sont déjà dans l'image de base.
# On ajoute intl (utile pour les formats monétaires) et on s'assure que GD
# est compilé avec freetype + jpeg pour la génération PDF (DOMPDF).
RUN apt-get update -qq \
    && apt-get install -y --no-install-recommends \
        libfreetype6-dev \
        libjpeg62-turbo-dev \
        libpng-dev \
        libicu-dev \
    && docker-php-ext-configure gd \
        --with-freetype \
        --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" \
        gd \
        intl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ── Apache : AllowOverride + CORS dev ────────────────────────────────────────
# AllowOverride All  → .htaccess WordPress + permaliens + REST API
# CORS              → autorise le frontend React (localhost:5173) en dev
RUN a2enmod rewrite headers \
    && printf '\
<Directory /var/www/html>\n\
    AllowOverride All\n\
    Options -Indexes\n\
</Directory>\n\
\n\
# CORS pour le frontend React en dev local\n\
<IfModule mod_headers.c>\n\
    Header always set Access-Control-Allow-Origin  "http://localhost:5173"\n\
    Header always set Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS"\n\
    Header always set Access-Control-Allow-Headers "Authorization, Content-Type, X-WP-Nonce"\n\
    Header always set Access-Control-Allow-Credentials "true"\n\
    # Répondre immédiatement aux preflight OPTIONS\n\
    RewriteEngine On\n\
    RewriteCond %%{REQUEST_METHOD} OPTIONS\n\
    RewriteRule .* - [R=204,L]\n\
</IfModule>\n\
' > /etc/apache2/conf-available/locagest-dev.conf \
    && a2enconf locagest-dev

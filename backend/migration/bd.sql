-- ===================================================================
-- SCHÉMA COMPLET BASE DE DONNÉES - PLATEFORME TRANSFERT D'ARGENT
-- Stack: PostgreSQL - Version Simplifiée
-- ===================================================================

-- SUPPRESSION DES TABLES EXISTANTES (ordre inverse des dépendances)
DROP TABLE IF EXISTS history CASCADE;
DROP TABLE IF EXISTS redirections CASCADE;
DROP TABLE IF EXISTS gains CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS authorized_numbers CASCADE;
DROP TABLE IF EXISTS rates CASCADE;
DROP TABLE IF EXISTS balances CASCADE;
DROP TABLE IF EXISTS payment_methods CASCADE;
DROP TABLE IF EXISTS currencies CASCADE;
DROP TABLE IF EXISTS countries CASCADE;
DROP TABLE IF EXISTS agents CASCADE;
DROP TABLE IF EXISTS admins CASCADE;

-- ===================================================================
-- 1. ADMINISTRATEURS
-- ===================================================================
CREATE TABLE admins (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===================================================================
-- 2. DEVISES
-- ===================================================================
CREATE TABLE currencies (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE, -- ex : XOF, RUB, EUR
    name VARCHAR(50) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===================================================================
-- 3. PAYS (avec devise directement intégrée)
-- ===================================================================
CREATE TABLE countries (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(3) NOT NULL UNIQUE, -- ISO 3166-1 alpha-3 (ex: CIV, RUS)
    phone_prefix VARCHAR(10) NOT NULL, -- Ex: +225, +242, +7
    currency_id INTEGER REFERENCES currencies(id) ON DELETE RESTRICT, -- Une seule devise par pays
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===================================================================
-- 4. AGENTS
-- ===================================================================
CREATE TABLE agents (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    country_id INTEGER REFERENCES countries(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===================================================================
-- 5. MOYENS DE PAIEMENT PAR PAYS
-- ===================================================================
CREATE TABLE payment_methods (
    id SERIAL PRIMARY KEY,
    country_id INTEGER REFERENCES countries(id) ON DELETE CASCADE,
    method VARCHAR(100) NOT NULL, -- ex: "Carte bancaire", "Orange Money", "MTN Mobile Money"
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(country_id, method)
);

-- ===================================================================
-- 6. BALANCES MULTI-DEVISES DES AGENTS
-- ===================================================================
CREATE TABLE balances (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER REFERENCES agents(id) ON DELETE CASCADE,
    currency_id INTEGER REFERENCES currencies(id) ON DELETE CASCADE,
    amount NUMERIC(20, 2) DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(agent_id, currency_id),
    CONSTRAINT positive_balance CHECK (amount >= 0)
);

-- ===================================================================
-- 7. NUMÉROS AGRÉÉS DE TRANSFERT
-- ===================================================================
CREATE TABLE authorized_numbers (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER REFERENCES agents(id) ON DELETE CASCADE,
    country_id INTEGER REFERENCES countries(id) ON DELETE CASCADE,
    payment_method_id INTEGER REFERENCES payment_methods(id) ON DELETE CASCADE,
    number VARCHAR(50) NOT NULL, -- Numéro de compte/carte/mobile money
    label VARCHAR(100), -- Description du compte (optionnel)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(agent_id, country_id, payment_method_id)
);

-- ===================================================================
-- 8. TAUX DE CHANGE
-- ===================================================================
CREATE TABLE rates (
    id SERIAL PRIMARY KEY,
    from_currency_id INTEGER REFERENCES currencies(id) ON DELETE CASCADE,
    to_currency_id INTEGER REFERENCES currencies(id) ON DELETE CASCADE,
    rate NUMERIC(20, 6) NOT NULL, -- Taux de conversion
    commission_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.75, -- Commission en %
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES admins(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT positive_rate CHECK (rate > 0),
    CONSTRAINT valid_commission CHECK (commission_percent >= 0 AND commission_percent <= 100),
    CONSTRAINT different_currencies CHECK (from_currency_id != to_currency_id),
    UNIQUE(from_currency_id, to_currency_id, created_at)
);

-- ===================================================================
-- 9. TRANSACTIONS PRINCIPALES
-- ===================================================================
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    tracking_code VARCHAR(20) UNIQUE NOT NULL,
    
    -- Pays et coordonnées
    from_country_id INTEGER REFERENCES countries(id),
    to_country_id INTEGER REFERENCES countries(id),
    sender_phone VARCHAR(20) NOT NULL,
    receiver_phone VARCHAR(20) NOT NULL,
    
    -- Méthode et montants
    sender_method_id INT NOT NULL REFERENCES payment_methods(id),
    receiver_method_id INT NOT NULL REFERENCES payment_methods(id),
    send_amount NUMERIC(20, 2) NOT NULL,
    receive_amount NUMERIC(20, 2) NOT NULL,
    
    -- Taux appliqué (historique)
    rate_applied NUMERIC(20, 6) NOT NULL,
    commission_applied NUMERIC(5, 2) NOT NULL,
    
    -- Statut et assignation
    status VARCHAR(20) DEFAULT 'en_attente',
    assigned_agent_id INTEGER REFERENCES agents(id),
    authorized_number_id INTEGER REFERENCES authorized_numbers(id),
    
    -- Temporisation
    expires_at TIMESTAMP, -- Expiration après 10 minutes
    completed_at TIMESTAMP, -- Date de complétion
    
    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Contraintes métier
    CONSTRAINT positive_amounts CHECK (send_amount > 0 AND receive_amount > 0),
    CONSTRAINT different_countries CHECK (from_country_id != to_country_id),
    CONSTRAINT valid_status CHECK (status IN ('en_attente', 'effectuee', 'echouee', 'expiree'))
);

-- ===================================================================
-- 10. GAINS DES AGENTS
-- ===================================================================
CREATE TABLE gains (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER REFERENCES transactions(id) ON DELETE CASCADE,
    agent_id INTEGER REFERENCES agents(id) ON DELETE CASCADE,
    currency_id INTEGER REFERENCES currencies(id),
    gain_amount NUMERIC(20, 2) NOT NULL,
    commission_percent_applied NUMERIC(5, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT positive_gain CHECK (gain_amount >= 0)
);

-- ===================================================================
-- 11. REDIRECTIONS (fonds insuffisants)
-- ===================================================================
CREATE TABLE redirections (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER REFERENCES transactions(id) ON DELETE CASCADE,
    from_agent_id INTEGER REFERENCES agents(id),
    to_agent_id INTEGER REFERENCES agents(id),
    redirected_amount NUMERIC(20, 2),
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, rejected
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    
    CONSTRAINT positive_redirected_amount CHECK (redirected_amount > 0),
    CONSTRAINT different_agents CHECK (from_agent_id != to_agent_id)
);

-- ===================================================================
-- 12. HISTORIQUE DES ACTIONS
-- ===================================================================
CREATE TABLE history (
    id SERIAL PRIMARY KEY,
    action_type VARCHAR(50) NOT NULL, -- transaction_created, balance_updated, rate_changed
    actor_type VARCHAR(20) NOT NULL, -- admin, agent, system
    actor_id INTEGER, -- ID de l'admin ou agent
    entity_type VARCHAR(50), -- transaction, balance, rate
    entity_id INTEGER, -- ID de l'entité concernée
    description TEXT,
    metadata JSONB, -- Données supplémentaires flexibles
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fonction pour générer un code de suivi unique
CREATE OR REPLACE FUNCTION generate_tracking_code() RETURNS VARCHAR(20) AS $$
DECLARE
    new_code VARCHAR(20);
    code_exists BOOLEAN;
BEGIN
    LOOP
        new_code := 'TR' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');
        SELECT EXISTS(SELECT 1 FROM transactions WHERE tracking_code = new_code) INTO code_exists;
        IF NOT code_exists THEN
            EXIT;
        END IF;
    END LOOP;
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour calculer les gains d'agent
CREATE OR REPLACE FUNCTION calculate_agent_gain(
    p_receive_amount NUMERIC,
    p_commission_percent NUMERIC
) RETURNS NUMERIC AS $$
BEGIN
    RETURN ROUND(p_receive_amount * p_commission_percent / 100, 0);
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Application du trigger sur les tables concernées
CREATE TRIGGER trigger_admins_updated_at BEFORE UPDATE ON admins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_agents_updated_at BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_rates_updated_at BEFORE UPDATE ON rates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

const pool = require("../config/db.js");

class TransactionModel {
    static async createTransaction(data) {
        const {
            from_country_id,
            to_country_id,
            sender_phone,
            receiver_phone,
            sender_method_id,
            receiver_method_id,
            send_amount
        } = data;

        const client = await pool.connect();
        try {
            await client.query("BEGIN");

            // 1. Récupérer les devises pour chaque pays
            const fromCurrencyRes = await client.query(
                `SELECT currency_id FROM countries WHERE id = $1`,
                [from_country_id]
            );
            const toCurrencyRes = await client.query(
                `SELECT currency_id FROM countries WHERE id = $1`,
                [to_country_id]
            );
            if (!fromCurrencyRes.rows.length || !toCurrencyRes.rows.length) {
                throw new Error("Pays invalide");
            }
            const from_currency_id = fromCurrencyRes.rows[0].currency_id;
            const to_currency_id = toCurrencyRes.rows[0].currency_id;

            // 2. Récupérer le taux et la commission
            const rateRes = await client.query(
                `SELECT rate, commission_percent
                 FROM rates
                 WHERE from_currency_id = $1
                 AND to_currency_id = $2
                 AND is_active = true
                 ORDER BY created_at DESC LIMIT 1`,
                [from_currency_id, to_currency_id]
            );
            if (!rateRes.rows.length) {
                throw new Error("Taux introuvable");
            }
            const { rate, commission_percent } = rateRes.rows[0];

            // 3. Calcul du montant reçu
            const receive_amount = send_amount * rate * (1 - commission_percent / 100);

            // 4. Sélection d’un agent actif ayant un numéro autorisé pour ce moyen de paiement
            const agentRes = await client.query(
                `SELECT an.agent_id, an.id AS authorized_number_id
                 FROM authorized_numbers an
                 JOIN agents a ON a.id = an.agent_id
                 WHERE an.country_id = $1
                 AND an.payment_method_id = $2
                 AND a.is_active = true
                 LIMIT 1`,
                [from_country_id, sender_method_id]
            );
            if (!agentRes.rows.length) {
                throw new Error("Aucun agent disponible pour ce pays et moyen de paiement");
            }
            const assigned_agent_id = agentRes.rows[0].agent_id;
            const authorized_number_id = agentRes.rows[0].authorized_number_id;

            // 5. Génération du tracking code
            const trackingCodeRes = await client.query(`SELECT generate_tracking_code() AS code`);
            const tracking_code = trackingCodeRes.rows[0].code;

            // 6. Insertion transaction
            const transactionRes = await client.query(
                `INSERT INTO transactions (
                    tracking_code, from_country_id, to_country_id,
                    sender_phone, receiver_phone,
                    sender_method_id, receiver_method_id,
                    send_amount, receive_amount,
                    rate_applied, commission_applied,
                    status, assigned_agent_id, authorized_number_id,
                    expires_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7,
                    $8, $9, $10, $11, 'en_attente', $12, $13,
                    NOW() + interval '10 minutes'
                )
                RETURNING *`,
                [
                    tracking_code, from_country_id, to_country_id,
                    sender_phone, receiver_phone,
                    sender_method_id, receiver_method_id,
                    send_amount, receive_amount,
                    rate, commission_percent,
                    assigned_agent_id, authorized_number_id
                ]
            );

            const transaction = transactionRes.rows[0];

            // 7. Enregistrer le gain pour l’agent
            await client.query(
                `INSERT INTO gains (transaction_id, agent_id, currency_id, gain_amount, commission_percent_applied)
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                    transaction.id,
                    assigned_agent_id,
                    from_currency_id,
                    send_amount * (commission_percent / 100),
                    commission_percent
                ]
            );

            await client.query("COMMIT");
            return transaction;
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = TransactionModel;

const TransactionModel = require("../models/transaction.model");

class TransactionController {
    static async createTransaction(req, res) {
        try {
            const transaction = await TransactionModel.createTransaction(req.body);
            res.status(201).json({
                message: "Transaction créée avec succès",
                transaction
            });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
}

module.exports = TransactionController;

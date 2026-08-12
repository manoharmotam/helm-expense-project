const dbcreds = require('./DbConfig');
const mysql = require('mysql2');

const pool = mysql.createPool({
    host     : process.env.DB_HOST     || dbcreds.DB_HOST,
    user     : process.env.DB_USER     || dbcreds.DB_USER,
    password : process.env.DB_PWD      || dbcreds.DB_PWD,
    database : process.env.DB_DATABASE || dbcreds.DB_DATABASE,
    waitForConnections : true,
    connectionLimit    : 10
});

const VALID_CATEGORIES = ['Food', 'Travel', 'Entertainment', 'Shopping', 'Health', 'Utilities', 'Other'];

function addTransaction(amount, description, category, callback) {
    const sql = 'INSERT INTO transactions (amount, description, category) VALUES (?, ?, ?)';
    pool.query(sql, [amount, description, category], callback);
}

function getAllTransactions(callback) {
    pool.query('SELECT * FROM transactions ORDER BY id DESC', callback);
}

function findTransactionById(id, callback) {
    pool.query('SELECT * FROM transactions WHERE id = ?', [id], callback);
}

function deleteAllTransactions(callback) {
    pool.query('DELETE FROM transactions', callback);
}

function deleteTransactionById(id, callback) {
    pool.query('DELETE FROM transactions WHERE id = ?', [id], callback);
}

module.exports = {
    VALID_CATEGORIES,
    addTransaction,
    getAllTransactions,
    findTransactionById,
    deleteAllTransactions,
    deleteTransactionById
};

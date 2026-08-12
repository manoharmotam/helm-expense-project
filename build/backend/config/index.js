const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const transactionService = require('./TransactionService');

const app = express();
const PORT = process.env.APP_PORT || 8080;

app.use(bodyParser.json());
app.use(cors());

// ── helpers ──────────────────────────────────────────────────────────────────

function validateTransaction(body) {
    const errors = [];

    const amount = Number(body.amount);
    if (!body.amount && body.amount !== 0) {
        errors.push('amount is required');
    } else if (!Number.isInteger(amount) || amount <= 0) {
        errors.push('amount must be a positive integer');
    } else if (amount > 1000000) {
        errors.push('amount cannot exceed 1,000,000');
    }

    if (!body.description || String(body.description).trim() === '') {
        errors.push('description is required');
    } else if (String(body.description).trim().length > 255) {
        errors.push('description cannot exceed 255 characters');
    }

    if (!body.category || String(body.category).trim() === '') {
        errors.push('category is required');
    } else if (!transactionService.VALID_CATEGORIES.includes(body.category)) {
        errors.push(`category must be one of: ${transactionService.VALID_CATEGORIES.join(', ')}`);
    }

    return errors;
}

// ── routes ───────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// GET all transactions
app.get('/transaction', (req, res) => {
    transactionService.getAllTransactions((err, results) => {
        if (err) {
            console.error('GET /transaction error:', err.message);
            return res.status(500).json({ message: 'could not retrieve transactions', error: err.message });
        }
        res.json({ result: results });
    });
});

// ADD a transaction
app.post('/transaction', (req, res) => {
    const errors = validateTransaction(req.body);
    if (errors.length > 0) {
        return res.status(400).json({ message: 'validation failed', errors });
    }

    const amount      = Number(req.body.amount);
    const description = String(req.body.description).trim();
    const category    = String(req.body.category).trim();

    transactionService.addTransaction(amount, description, category, (err) => {
        if (err) {
            console.error('POST /transaction error:', err.message);
            return res.status(500).json({ message: 'could not add transaction', error: err.message });
        }
        console.log(`Added transaction: amount=${amount} category=${category}`);
        res.status(201).json({ message: 'transaction added successfully' });
    });
});

// DELETE all transactions  →  200
app.delete('/transaction', (req, res) => {
    transactionService.deleteAllTransactions((err) => {
        if (err) {
            console.error('DELETE /transaction error:', err.message);
            return res.status(500).json({ message: 'could not delete transactions', error: err.message });
        }
        res.json({ message: 'all transactions deleted' });
    });
});

// 405 for any other method on /transaction
app.all('/transaction', (req, res) => {
    res.status(405).set('Allow', 'GET, POST, DELETE').json({ message: 'method not allowed' });
});

// DELETE single transaction by id  →  204 No Content
app.delete('/transaction/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: 'invalid id' });
    }
    transactionService.deleteTransactionById(id, (err) => {
        if (err) {
            console.error(`DELETE /transaction/${id} error:`, err.message);
            return res.status(500).json({ message: 'could not delete transaction', error: err.message });
        }
        res.status(204).end();
    });
});

// GET single transaction by id
app.get('/transaction/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: 'invalid id' });
    }
    transactionService.findTransactionById(id, (err, results) => {
        if (err) {
            console.error(`GET /transaction/${id} error:`, err.message);
            return res.status(500).json({ message: 'could not retrieve transaction', error: err.message });
        }
        if (!results || results.length === 0) {
            return res.status(404).json({ message: `transaction ${id} not found` });
        }
        res.json(results[0]);
    });
});

// 405 for any other method on /transaction/:id
app.all('/transaction/:id', (req, res) => {
    res.status(405).set('Allow', 'GET, DELETE').json({ message: 'method not allowed' });
});

// ── demo endpoints for gateway error codes ────────────────────────────────────

// 503 — uncomment the return line in nginx-lb.conf instead for a real infra demo,
//        but this endpoint lets you trigger it from the app layer too
app.get('/maintenance', (req, res) => {
    res.status(503).set('Retry-After', '60').json({ message: 'service temporarily unavailable' });
});

// 504 — responds after 40 s; nginx lb has proxy_read_timeout 10s → gateway times out first
app.get('/slow', (req, res) => {
    setTimeout(() => res.json({ message: 'finally responded after 40 s' }), 40000);
});

// ── start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
    console.log(`Expense backend v3 listening on port ${PORT}`);
});

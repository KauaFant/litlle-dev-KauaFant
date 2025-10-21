const express = require('express');
const multer = require('multer');
const path = require('path');
const dbConnection = require('./models/db'); // conexão já configurada
const app = express();
const PORT = 8080;

// Configuração do Express
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'src')));

// Configuração do upload de imagens
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

// Função auxiliar para usar Promises com MySQL
function executePromisified(sql, values) {
    return new Promise((resolve, reject) => {
        dbConnection.query(sql, values, (error, results) => {
            if (error) return reject(error);
            resolve(results);
        });
    });
}

// ======================================================================
// ROTA: CADASTRAR NOVO EQUIPAMENTO
// ======================================================================
app.get('/agendamentos', async (req, res) => {
    try {
        const query = `
            SELECT 
                a.idAgendamento,
                a.nomeSolicitante,
                a.dataHorarioAg,
                a.dataHorarioDev,
                e.nomeEquipamento,
                e.idEquipamentos AS idEquipamento
            FROM agendamento a
            JOIN equipamentos e ON a.idEquipamento = e.idEquipamentos
            ORDER BY a.dataHorarioAg DESC
        `;
        const agendamentos = await executePromisified(query);
        res.json({ success: true, agendamentos });
    } catch (erro) {
        console.error('Erro ao listar agendamentos:', erro);
        res.status(500).json({ success: false, message: 'Erro ao listar agendamentos.' });
    }
});

app.post('/equipamento/cadastro', upload.single('imagemEquipamento'), async (req, res) => {
    const file = req.file;
    const { fornecedor, nomeEquipamento, descricao, altoValor } = req.body;

    if (!file) {
        return res.status(400).json({ success: false, message: 'Nenhuma imagem enviada para o equipamento.' });
    }

    if (!fornecedor || !nomeEquipamento || !descricao || altoValor === undefined) {
        return res.status(400).json({ success: false, message: 'Todos os campos de texto do equipamento são obrigatórios.' });
    }

    try {
        const tipo_mime = file.mimetype;
        const dadosBinarios = file.buffer;
        const altoValorDb = (altoValor === 'true' || altoValor === 1 || altoValor === '1');

        const query = `
            INSERT INTO equipamentos 
            (fornecedor, nomeEquipamento, descricao, altoValor, tipo_mime, imagemEquipamento)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const values = [fornecedor, nomeEquipamento, descricao, altoValorDb, tipo_mime, dadosBinarios];
        const resultado = await executePromisified(query, values);

        res.json({
            success: true,
            message: 'Equipamento cadastrado com sucesso!',
            idEquipamento: resultado.insertId
        });
    } catch (erro) {
        console.error('Erro ao cadastrar o equipamento:', erro);
        res.status(500).json({ success: false, message: 'Erro interno do servidor ao cadastrar o equipamento.' });
    }
});

// ======================================================================
// ROTA: LISTAR EQUIPAMENTOS
// ======================================================================
app.get('/equipamentos', async (req, res) => {
    try {
        const query = `
            SELECT idEquipamentos, fornecedor, nomeEquipamento, descricao, altoValor, tipo_mime
            FROM equipamentos
            ORDER BY nomeEquipamento ASC
        `;
        const equipamentos = await executePromisified(query);
        res.json({ success: true, equipamentos });
    } catch (erro) {
        console.error('Erro ao listar equipamentos:', erro);
        res.status(500).json({ success: false, message: 'Erro interno ao listar equipamentos.' });
    }
});

// ======================================================================
// ROTA: RETORNAR IMAGEM DE EQUIPAMENTO
// ======================================================================
app.get('/equipamento/imagem/:id', async (req, res) => {
    const idEquipamento = req.params.id;

    try {
        const query = `
            SELECT nomeEquipamento, tipo_mime, imagemEquipamento
            FROM equipamentos
            WHERE idEquipamentos = ?
        `;
        const linhas = await executePromisified(query, [idEquipamento]);

        if (linhas.length === 0) {
            return res.status(404).send('Imagem do equipamento não encontrada.');
        }

        const equipamento = linhas[0];
        res.setHeader('Content-Type', equipamento.tipo_mime);
        res.setHeader('Content-Disposition', `inline; filename="${equipamento.nomeEquipamento}"`);
        res.send(equipamento.imagemEquipamento);

    } catch (erro) {
        console.error('Erro ao recuperar a imagem do equipamento:', erro);
        res.status(500).send('Erro interno ao recuperar a imagem do equipamento.');
    }
});

// ======================================================================
// 🆕 ROTA: CADASTRAR NOVO AGENDAMENTO
// ======================================================================
app.get('/agendamentos', async (req, res) => {
    const search = req.query.search || ''; // termo digitado na barra

    try {
        let query = `
            SELECT 
                a.idAgendamento,
                a.nomeSolicitante,
                a.dataHorarioAg,
                a.dataHorarioDev,
                e.nomeEquipamento,
                e.idEquipamentos AS idEquipamento
            FROM agendamento a
            JOIN equipamentos e ON a.idEquipamento = e.idEquipamentos
        `;
        const values = [];

        if (search.trim() !== '') {
            query += `
                WHERE a.nomeSolicitante LIKE ? 
                OR e.nomeEquipamento LIKE ?
            `;
            const like = `%${search}%`;
            values.push(like, like);
        }

        query += ` ORDER BY a.dataHorarioAg DESC`;

        const agendamentos = await executePromisified(query, values);
        res.json({ success: true, agendamentos });

    } catch (erro) {
        console.error('Erro ao listar agendamentos:', erro);
        res.status(500).json({ success: false, message: 'Erro ao listar agendamentos.' });
    }
});

app.post('/agendamento/novo', async (req, res) => {
    try {
        const { idEquipamento, nomeSolicitante, dataHorarioAg, dataHorarioDev } = req.body;

        // Validação simples
        if (!idEquipamento || !nomeSolicitante || !dataHorarioAg || !dataHorarioDev) {
            return res.status(400).json({ success: false, message: 'Preencha todos os campos obrigatórios.' });
        }

        // Query de inserção
        const query = `
            INSERT INTO agendamento (idEquipamento, nomeSolicitante, dataHorarioAg, dataHorarioDev)
            VALUES (?, ?, ?, ?)
        `;
        const values = [idEquipamento, nomeSolicitante, dataHorarioAg, dataHorarioDev];

        await executePromisified(query, values);

        res.json({ success: true, message: 'Agendamento cadastrado com sucesso!' });
    } catch (erro) {
        console.error('Erro ao cadastrar o agendamento:', erro);
        res.status(500).json({ success: false, message: 'Erro ao cadastrar o agendamento.' });
    }
});

// ======================================================================
// ROTA PRINCIPAL (frontend)
// ======================================================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

// ======================================================================
// INICIALIZAÇÃO DO SERVIDOR
// ======================================================================
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em: http://localhost:${PORT}`);
});
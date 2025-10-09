const express = require('express');
const multer = require('multer');
const path = require('path');
const dbConnection = require('./models/db');

const app = express();
const PORT = 8080; 

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 } 
});

function executePromisified(sql, values) {
    return new Promise((resolve, reject) => {
        dbConnection.query(sql, values, (error, results) => {
            if (error) {
                return reject(error);
            }
            resolve(results);
        });
    });
}

app.use(express.static(path.join(__dirname, 'src')));

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
        const values = [
            fornecedor, 
            nomeEquipamento, 
            descricao, 
            altoValorDb, 
            tipo_mime, 
            dadosBinarios
        ];
        
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

app.get('/equipamentos', async (req, res) => {
    try {
        const query = 'SELECT idEquipamentos, fornecedor, nomeEquipamento, descricao, altoValor, tipo_mime FROM equipamentos ORDER BY nomeEquipamento ASC';
        const equipamentos = await executePromisified(query);

        res.json({ success: true, equipamentos });
    } catch (erro) {
        console.error('Erro ao listar equipamentos:', erro);
        res.status(500).json({ success: false, message: 'Erro interno ao listar equipamentos.' });
    }
});

app.get('/equipamento/imagem/:id', async (req, res) => {
    const idEquipamento = req.params.id;

    try {
        const query = 'SELECT nomeEquipamento, tipo_mime, imagemEquipamento FROM equipamentos WHERE idEquipamentos = ?';
        const linhas = await executePromisified(query, [idEquipamento]);

        if (linhas.length === 0) {
            return res.status(404).send('Imagem do equipamento não encontrada.');
        }

        const equipamento = linhas[0];
        const dadosBinarios = equipamento.imagemEquipamento;

        res.setHeader('Content-Type', equipamento.tipo_mime);
        res.setHeader('Content-Disposition', `inline; filename="${equipamento.nomeEquipamento}"`);
        
        res.send(dadosBinarios);

    } catch (erro) {
        console.error('Erro ao recuperar a imagem do equipamento:', erro);
        res.status(500).send('Erro interno ao recuperar a imagem do equipamento.');
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor Node.js rodando em http://localhost:${PORT}`);
});
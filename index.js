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

app.get('/pendentes', async (req, res) => {
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
            WHERE a.dataHorarioDev < NOW()
            ORDER BY a.dataHorarioDev ASC
        `;
        const pendentes = await executePromisified(query);
        res.json({ success: true, pendentes });
    } catch (erro) {
        console.error('Erro ao listar pendentes:', erro);
        res.status(500).json({ success: false, message: 'Erro ao listar pendentes.' });
    }
});

app.get('/agendamentos/pendentes', async (req, res) => {
    try {
        const query = `
            SELECT 
                a.idAgendamento,
                a.nomeSolicitante,
                a.dataHorarioAg,
                a.dataHorarioDev,
                e.nomeEquipamento,
                e.imagemBase64
            FROM agendamento a
            INNER JOIN equipamento e ON a.idEquipamento = e.idEquipamento
            WHERE a.dataHorarioDev < NOW()
        `;

        const results = await executePromisified(query);

        res.json({ success: true, pendentes: results });
    } catch (erro) {
        console.error('Erro ao buscar equipamentos pendentes:', erro);
        res.status(500).json({ success: false, message: 'Erro ao buscar equipamentos pendentes.' });
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

app.get('/relatorios', async (req, res) => {
    try {
        const search = req.query.search ? `%${req.query.search}%` : '%';

        const query = `
            SELECT 
                a.idAgendamento,
                e.nomeEquipamento,
                e.fornecedor,
                a.nomeSolicitante,
                a.dataHorarioAg,
                a.dataHorarioDev,
                d.nomeDevolvedor,
                d.dataDev,
                d.condicao
            FROM agendamento a
            INNER JOIN equipamentos e ON a.idEquipamento = e.idEquipamentos
            LEFT JOIN devolucao d ON d.idEquipamento = e.idEquipamentos
            WHERE e.nomeEquipamento LIKE ? 
               OR a.nomeSolicitante LIKE ? 
               OR IFNULL(d.nomeDevolvedor, '') LIKE ?
            ORDER BY a.dataHorarioAg DESC
        `;

        const results = await executePromisified(query, [search, search, search]);
        res.json({ success: true, relatorios: results });
    } catch (erro) {
        console.error('Erro ao gerar relatório:', erro);
        res.status(500).json({ success: false, message: 'Erro interno ao gerar relatório.' });
    }
});

const PDFDocument = require('pdfkit');
const fs = require('fs');

app.get('/relatorios/pdf', async (req, res) => {
    try {
        const { tipo, mes, ano } = req.query;

        // Monta o filtro SQL conforme o tipo de relatório
        let query = `
            SELECT 
                a.idAgendamento,
                e.nomeEquipamento,
                e.fornecedor,
                a.nomeSolicitante,
                a.dataHorarioAg,
                a.dataHorarioDev,
                d.nomeDevolvedor,
                d.dataDev,
                d.condicao
            FROM agendamento a
            INNER JOIN equipamentos e ON a.idEquipamento = e.idEquipamentos
            LEFT JOIN devolucao d ON d.idEquipamento = e.idEquipamentos
        `;

        const params = [];

        // Filtro mensal
        if (tipo === 'mensal' && mes && ano) {
            query += ' WHERE MONTH(a.dataHorarioAg) = ? AND YEAR(a.dataHorarioAg) = ?';
            params.push(mes, ano);
        }

        // Filtro anual
        else if (tipo === 'anual' && ano) {
            query += ' WHERE YEAR(a.dataHorarioAg) = ?';
            params.push(ano);
        }

        query += ' ORDER BY a.dataHorarioAg DESC';

        // Executa consulta filtrada
        const relatorios = await executePromisified(query, params);

        // Geração do PDF
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const fileName = `relatorio-${tipo || 'geral'}-${ano || 'todos'}${mes ? '-' + mes : ''}.pdf`;
        const filePath = path.join(__dirname, fileName);
        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);

        // Título e cabeçalho
        doc
            .fontSize(18)
            .fillColor('#16429F')
            .text('Relatório de Agendamentos SENAI / FIEP', { align: 'center' })
            .moveDown(0.5)
            .fontSize(12)
            .fillColor('#000000')
            .text(
                tipo === 'mensal'
                    ? `Período: ${mes}/${ano}`
                    : tipo === 'anual'
                        ? `Ano: ${ano}`
                        : 'Relatório Geral',
                { align: 'center' }
            )
            .moveDown(1.5);

        // Cabeçalho da tabela
        const headerY = doc.y + 10;
        doc
            .fontSize(12)
            .fillColor('#16429F')
            .rect(40, headerY, 515, 25)
            .fill('#16429F');

        doc
            .fillColor('#FFFFFF')
            .text('Equipamento', 45, headerY + 6)
            .text('Solicitante', 165, headerY + 6)
            .text('Retirada', 285, headerY + 6)
            .text('Devolução', 385, headerY + 6)
            .text('Status', 485, headerY + 6);

        doc.moveDown(2);

        // Preenche as linhas
        relatorios.forEach((item, i) => {
            const status = item.dataDev
                ? 'Devolvido'
                : new Date(item.dataHorarioDev) < new Date()
                    ? 'Pendente'
                    : 'Em uso';

            const bgColor = i % 2 === 0 ? '#E8ECF3' : '#FFFFFF';
            const y = doc.y;

            doc
                .rect(40, y - 3, 515, 22)
                .fill(bgColor)
                .fillColor('#000000')
                .fontSize(10)
                .text(item.nomeEquipamento, 45, y)
                .text(item.nomeSolicitante, 165, y)
                .text(new Date(item.dataHorarioAg).toLocaleDateString('pt-BR'), 285, y)
                .text(new Date(item.dataHorarioDev).toLocaleDateString('pt-BR'), 385, y);

            // Cor por status
            let color = '#000';
            if (status === 'Pendente') color = '#C62828';
            if (status === 'Em uso') color = '#1565C0';
            if (status === 'Devolvido') color = '#2E7D32';

            doc.fillColor(color).text(status, 485, y);
            doc.fillColor('#000000');
            doc.moveDown(1);
        });

        // Mensagem se não houver registros
        if (relatorios.length === 0) {
            doc.moveDown(2);
            doc.fontSize(12).fillColor('#C62828').text('Nenhum registro encontrado para o período selecionado.', { align: 'center' });
        }

        doc.end();

        // Finaliza e envia o PDF
        writeStream.on('finish', () => {
            res.download(filePath, fileName, (err) => {
                if (err) console.error('Erro ao enviar PDF:', err);
                fs.unlinkSync(filePath);
            });
        });
    } catch (erro) {
        console.error('Erro ao gerar PDF:', erro);
        res.status(500).json({ success: false, message: 'Erro ao gerar o relatório em PDF.' });
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
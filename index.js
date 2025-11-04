const express = require('express');
const multer = require('multer');
const path = require('path');
const dbConnection = require('./models/db');
const app = express();
const PORT = 8080;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'src')));

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 }
});

function executePromisified(sql, values) {
    return new Promise((resolve, reject) => {
        dbConnection.query(sql, values, (error, results) => {
            if (error) return reject(error);
            resolve(results);
        });
    });
}

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
    const search = req.query.search || '';

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
            WHERE a.dataHorarioDev < NOW()
        `;
        const values = [];

        if (search.trim() !== '') {
            query += `
                AND (a.nomeSolicitante LIKE ? 
                OR e.nomeEquipamento LIKE ?)
            `;
            const like = `%${search}%`;
            values.push(like, like);
        }

        query += ` ORDER BY a.dataHorarioDev ASC`;

        const pendentes = await executePromisified(query, values);
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

app.get('/agendamentos', async (req, res) => {
    const search = req.query.search || '';

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

        if (!idEquipamento || !nomeSolicitante || !dataHorarioAg || !dataHorarioDev) {
            return res.status(400).json({ success: false, message: 'Preencha todos os campos obrigatórios.' });
        }

        const agora = new Date();
        const retirada = new Date(dataHorarioAg);
        const devolucao = new Date(dataHorarioDev);

        if (retirada < agora) {
            return res.status(400).json({ success: false, message: 'Não é possível agendar uma retirada antes do horário atual.' });
        }

        if (devolucao < agora) {
            return res.status(400).json({ success: false, message: 'Não é possível definir devolução antes do horário atual.' });
        }

        if (devolucao <= retirada) {
            return res.status(400).json({ success: false, message: 'A devolução deve ser posterior à retirada.' });
        }

        const conflitoQuery = `
            SELECT *
            FROM agendamento
            WHERE idEquipamento = ?
            AND (
                (dataHorarioAg <= ? AND dataHorarioDev > ?) OR
                (dataHorarioAg < ? AND dataHorarioDev >= ?) OR
                (dataHorarioAg >= ? AND dataHorarioAg < ?)
            )
        `;
        const conflitoValues = [
            idEquipamento,
            dataHorarioAg, dataHorarioAg,
            dataHorarioDev, dataHorarioDev,
            dataHorarioAg, dataHorarioDev
        ];
        const conflitos = await executePromisified(conflitoQuery, conflitoValues);

        if (conflitos.length > 0) {
            return res.status(400).json({
                success: false,
                message: '❌ Este equipamento já está agendado nesse horário. Escolha outro horário disponível.'
            });
        }

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
                e.tipo_mime,
                e.idEquipamentos AS idEquipamento,
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

        const relatorios = results.map(item => ({
            ...item,
            imagemUrl: `/equipamento/imagem/${item.idEquipamento}`
        }));

        res.json({ success: true, relatorios });
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

        if (tipo === 'mensal' && mes && ano) {
            query += ' WHERE MONTH(a.dataHorarioAg) = ? AND YEAR(a.dataHorarioAg) = ?';
            params.push(mes, ano);
        } else if (tipo === 'anual' && ano) {
            query += ' WHERE YEAR(a.dataHorarioAg) = ?';
            params.push(ano);
        }

        query += ' ORDER BY a.dataHorarioAg DESC';

        const relatorios = await executePromisified(query, params);

        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const fileName = `relatorio-${tipo || 'geral'}-${ano || 'todos'}${mes ? '-' + mes : ''}.pdf`;
        const filePath = path.join(__dirname, fileName);
        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);

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

            let color = '#000';
            if (status === 'Pendente') color = '#C62828';
            if (status === 'Em uso') color = '#1565C0';
            if (status === 'Devolvido') color = '#2E7D32';

            doc.fillColor(color).text(status, 485, y);
            doc.fillColor('#000000');
            doc.moveDown(1);
        });

        if (relatorios.length === 0) {
            doc.moveDown(2);
            doc.fontSize(12).fillColor('#C62828').text('Nenhum registro encontrado para o período selecionado.', { align: 'center' });
        }

        doc.end();

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
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'index.html'));
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

app.delete('/equipamento/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id) || id <= 0) {
        return res.status(400).json({ success: false, message: 'ID inválido.' });
    }

    try {
        const checkQuery = 'SELECT idEquipamentos FROM equipamentos WHERE idEquipamentos = ?';
        const check = await executePromisified(checkQuery, [id]);
        if (!check || check.length === 0) {
            return res.status(404).json({ success: false, message: 'Equipamento não encontrado.' });
        }

        try {
            await executePromisified('DELETE FROM devolucao WHERE idEquipamento = ?', [id]);
            await executePromisified('DELETE FROM agendamento WHERE idEquipamento = ?', [id]);
        } catch (innerErr) {
            console.warn('Aviso: não foi possível remover relacionamentos (ok se inexistente):', innerErr.message);
        }

        const deleteQuery = 'DELETE FROM equipamentos WHERE idEquipamentos = ?';
        await executePromisified(deleteQuery, [id]);

        return res.json({ success: true, message: 'Equipamento excluído com sucesso.' });
    } catch (err) {
        console.error('Erro ao excluir equipamento:', err);
        if (err && err.code && (err.code === 'ER_ROW_IS_REFERENCED_' || err.code === 'ER_ROW_IS_REFERENCED')) {
            return res.status(409).json({ success: false, message: 'Não foi possível excluir: existem registros referenciando este equipamento.' });
        }
        return res.status(500).json({ success: false, message: 'Erro interno ao excluir equipamento.' });
    }
});

app.put('/equipamento/editar/:id', upload.single('novaImagemEquipamento'), async (req, res) => {
    const id = req.params.id;
    const { novoNomeEquipamento, novaDescricao, novoAltoValor, novoFornecedor } = req.body;
    const file = req.file;

    try {
        // Validação
        if (!novoNomeEquipamento || !novaDescricao) {
            return res.status(400).json({ success: false, message: 'Nome e descrição são obrigatórios.' });
        }

        // Buscar fornecedor atual (para não perder o valor)
        const equipamentoExistente = await executePromisified(
            'SELECT fornecedor FROM equipamentos WHERE idEquipamentos = ?',
            [id]
        );

        if (equipamentoExistente.length === 0) {
            return res.status(404).json({ success: false, message: 'Equipamento não encontrado.' });
        }

        const fornecedorAtual = novoFornecedor || equipamentoExistente[0].fornecedor;

        const altoValorFinal =
            novoAltoValor === 'on' || novoAltoValor === 'true' || novoAltoValor === '1' || novoAltoValor === 1
                ? 1
                : 0;

        // Montar query dinamicamente
        let query = `
            UPDATE equipamentos
            SET fornecedor = ?, nomeEquipamento = ?, descricao = ?, altoValor = ?
        `;
        const values = [fornecedorAtual, novoNomeEquipamento, novaDescricao, altoValorFinal];

        if (file) {
            query += `, tipo_mime = ?, imagemEquipamento = ?`;
            values.push(file.mimetype, file.buffer);
        }

        query += ` WHERE idEquipamentos = ?`;
        values.push(id);

        const result = await executePromisified(query, values);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Equipamento não encontrado.' });
        }

        res.json({ success: true, message: 'Equipamento atualizado com sucesso!' });
    } catch (err) {
        console.error('❌ ERRO DETALHADO AO EDITAR EQUIPAMENTO:');
        console.error('Mensagem:', err.message);
        console.error('Código SQL:', err.code);
        res.status(500).json({ success: false, message: 'Erro interno ao editar o equipamento.', detalhes: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em: http://localhost:${PORT}`);
});

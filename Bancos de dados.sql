CREATE DATABASE sistemasEquipamentos CHARACTER SET utf8mb4 COLLATE
utf8mb4_unicode_ci;
USE sistemasEquipamentos;

CREATE TABLE equipamentos (
	idEquipamentos INT AUTO_INCREMENT PRIMARY KEY,
	fornecedor VARCHAR(45) NOT NULL,
    nomeEquipamento varchar(50) not null,
    descricao varchar(200) not null,
    altoValor boolean not null,
    tipo_mime VARCHAR(50) NOT NULL,
    imagemEquipamento LONGBLOB NOT NULL
);

create table agendamento (
	idAgendamento INT AUTO_INCREMENT PRIMARY KEY,
    idEquipamento int,
	nomeSolicitante varchar(45) not null,
    dataHorarioAg datetime not null,
    dataHorarioDev datetime not null,
    foreign key (idEquipamento) references equipamentos (idEquipamentos)
);

create table devolucao (
	idDevolucao INT AUTO_INCREMENT PRIMARY KEY,
    idEquipamento int,
    nomeDevolvedor varchar(45) not null,
    dataDev datetime not null,
    condicao varchar(45) not null,
    foreign key (idEquipamento) references equipamentos (idEquipamentos)
);

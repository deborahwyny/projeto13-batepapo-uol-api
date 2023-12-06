# Bate-Papo UOL

Uma aplicação de bate-papo em tempo real inspirada no clássico Bate-Papo UOL.

## Funcionalidades
- **Autenticação:** Os usuários podem fazer login para acessar o chat.
- **Chat em Tempo Real:** Mensagens são enviadas e recebidas em tempo real.
- **Mensagens Públicas e Privadas:** Envio de mensagens para todos ou para usuários específicos, mantendo a privacidade.
- **Armazenamento de Dados:** Utilização do MongoDB para armazenar informações de participantes e mensagens.
- **Status de Participantes:** Exibição de status quando um participante entra ou sai da sala.

## Tecnologias Utilizadas

- **Axios** 
- **Node.js** 
- **Express** 
- **MongoDB**
- **Joi** 
- **Day.js** 

## Execução do Projeto

1. **Instale as dependências:**
 
    ```bash
    npm install
    ```
3. **Configurar Variáveis de Ambiente**
4. **Executar o Aplicativo:**
 
     ```bash
    npm start
    ```

## Rotas

### POST /participants

Registra um novo participante na sala.

#### - Parâmetros de Entrada

- **name:** Nome do participante a ser cadastrado.

### GET /participants: 

Retorna a lista de todos os participantes na sala.

### POST /messages: 

Envia uma nova mensagem para a sala.

#### - Parâmetros de Entrada

- **to:** Nome do destinatário da mensagem.
- **text:** Texto da mensagem.
- **type:** Tipo da mensagem (message ou private_message).

 #### Header

- **User:** Nome do remetente da mensagem.

### GET /messages

Retorna as mensagens relevantes para o usuário.

 #### Header

- **User:** Nome do usuário solicitando as mensagens.

### POST /status

Atualiza o status de um participante.

 #### Header

- **User:** Nome do participante a ter o status atualizado.

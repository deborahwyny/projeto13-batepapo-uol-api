import express from 'express'
import cors from 'cors'
import dotenv from "dotenv"
import { MongoClient, ObjectId } from "mongodb"
import joi from "joi"
import dayjs from 'dayjs'

/// configurações
const app = express();
app.use(cors());
app.use(express.json())
dotenv.config()


/// conexão com o banco
const mongoClient = new MongoClient(process.env.DATABASE_URL)
let db

mongoClient.connect()
    .then(()=> db = mongoClient.db())
    .catch((err)=> console.log(err.message))


/// variaveis globais


const validadorUser = joi.object({
    name: joi.string().required()
})

const date = Date.now()

/// funções 


/// login participante 
app.post("/participants", async (req, res) => {
    const {name} = req.body

	try {

    const {error} = validadorUser.validate({name})
        if(error) return res.status(422).send("Preencha todos os campos!")

    const participanteExistente = await db.collection("participants").findOne({name:name})
        if(participanteExistente) { return res.status(409).send("Essa usuario já existe!")}

    const data = Date.now()
    const horario = dayjs(data).format('HH:mm:ss');

     const novoParticipante = {
        name,
        lastStatus: data
    }

    const entrouSala = {
            from: name,
            to: 'Todos',
            text: 'entra na sala...',
            type: 'status',
            time: horario
    }
    
    await db.collection("participants").insertOne(novoParticipante)
    await db.collection("messages").insertOne(entrouSala)
        return res.sendStatus(201)

    }catch (err) {
        res.status(500).send(err.message);
    }
});

//// Retornar a lista de todos os participantes

app.get("/participants", async (req, res) =>{


    try {
        const listaParticipantes = await db.collection("participants").find().toArray()
            res.send(listaParticipantes)
          
        }
        catch (err) {
            res.status(500).send(err.message);
        }
    
      
})

/// postar menssagem 
app.post("/messages", async (req, res)=>{

    /// pegando login
    const {user} = req.headers
    if(!user){
        return res.status(401)
    }

    const {to, text, type} = req.body

    const menssagem = {to, text, type}

    const menssagemSchema = joi.object({
            to: joi.string(),
            text: joi.string(),
            type: joi.string().valid('message', 'private_message')
    })
    const validacaoMensagem =  menssagemSchema.validate(menssagem)

    const data = Date.now()
    const horario = dayjs(data).format('HH:mm:ss');

    const messagemTime = {
        from:user,
        to:to, 
        text:text, 
        type:type,
        time:horario
    }

    try{

        if(validacaoMensagem.error) {return res.sendStatus(422)}
        const participanteExistente = await db.collection("participants").findOne({name:user})
        if(!participanteExistente) { return res.sendStatus(422)}

        await db.collection("messages").insertOne(messagemTime)
        return res.sendStatus(201)

    }
    catch (err) {
        res.status(500).send(err.message);
    }


})

/// receber menssagem

app.get("/messages", async (req, res) => {

    const {limit} = req.query

    const {user} = req.headers
    if(!user){
        return res.status(401)
    }


    try {
        const participante = await db.collection("participants").findOne({name:user})
        const username = participante.name
        let mensagem;

        if(!limit) {
            mensagem = await db.collection("messages").find({$or: [
                {to:username},
                {to:"Todos"},
                {from:username}
            ]}).sort({ time: -1 })
        } else if (limit == 0 || limit <=0 || isNaN(parseInt(limit))) {
            return res.status(422).send("Parâmetro de limite inválido.");
        }


        if(limit) {
            mensagem = await db.collection("messages").find({$or: [
                {to:username},
                {to:"Todos"},
                {from:username}
            ]}).sort({ time: -1 }).limit(parseInt(limit))
        }

    const messagesArray = await mensagem.toArray();

    return res.status(200).send(messagesArray);
      
    }
    catch (err) {
        res.status(500).send(err.message);
    }
  });
  

/// status usario  
app.post("/status", async (req, res)=>{


    try {
        const {user} = req.headers
        if(!user){
            return res.status(404).send("Não autorizado. Cabeçalho 'user' não fornecido.");
        }
        const participante = await db.collection("participants").findOne({name: user})
        if(!participante) {
            return res.status(404).send("Participante não encontrado.");
        }

        participante.lastStatus = Date.now()
        await db.collection("participants").updateOne({ _id: participante._id }, { $set: { lastStatus: participante.lastStatus } });

            res.sendStatus(200)

    }
    catch (err) {
        res.status(500).send(err.message);
    }
  
})

/// delete usuario


async function deleteInactive(){


    try {
    const limite = Date.now() - 10 * 1000;
    const user = await db.collection("participants").find({lastStatus: { $lt: limite }}).toArray()
    if(user && user.length !== 0){
        const data = Date.now()
        const horario = dayjs(data).format('HH:mm:ss');
        let listaMensagens = []
    
        user.forEach(usuario => {
            const mens = {
                from: usuario.name,
                to: 'Todos',
                text: 'sai da sala...',
                type: 'status',
                time:horario
            }
            listaMensagens.push(mens)
        });
        const mensagemSaida = await db.collection("messages").insertMany(listaMensagens)
       const userIds = user.map(user => user._id); 
        const result = await db.collection("participants").deleteMany({ _id: { $in: userIds } });
    }

   } catch(err) {
    console.log(err)
}
}

setInterval(deleteInactive, 2 * 1000)







/// porta sendo utilizada
const PORT = 5000
app.listen(PORT, () =>console.log(`servidor está rodando na porta ${PORT}`))
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
            from: {name},
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
        to:to, 
        text:text, 
        type:type,
        time:horario
    }

    try{

        if(validacaoMensagem.error) {return res.status(409)}
        const participanteExistente = await db.collection("participants").findOne({name:to})
        if(!participanteExistente) { return res.status(409)}

        await db.collection("messages").insertOne(messagemTime)
        return res.sendStatus(201)

    }
    catch (err) {
        res.status(500).send(err.message);
    }


})

/// receber menssagem

app.get("/messages", async (req, res) => {

    // const {limit} = req.query
    // const limite = {limit}

    const {user} = req.headers
    if(!user){
        return res.status(401)
    }


    try {
    const mensagem = await db.collection("messages").find().toArray()

    // if(limite === 0 || limite === undefined){
    //     return res.sendStatus(422)
    // }
        res.send(mensagem)
      
    }
    catch (err) {
        res.status(500).send(err.message);
    }
  });
  

app.post("/status", async (req, res)=>{


    try {
        const {user} = req.headers
        if(!user){
            return res.status(401).send("Não autorizado. Cabeçalho 'user' não fornecido.");
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



/// porta sendo utilizada
const PORT = 5000
app.listen(PORT, () =>console.log(`servidor está rodando na porta ${PORT}`))
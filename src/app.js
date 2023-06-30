import express from 'express'
import cors from 'cors'
import dotenv from "dotenv"
import { MongoClient } from "mongodb"
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

const listaParticipantes = []

const validadorUser = joi.object({
    name: joi.string().required()
})

const date = Date.now()

/// funções 


/// login participante 
app.post("/participants", async (req, res) => {
    const {name} = req.body

    const {error} = validadorUser.validate({name})
    if(error) return res.status(422).send("Preencha todos os campos!")


    
    // const novoParticipante = {
    //     name,
    //     lastStatus: Date.now()
    // }
	try {

    const {error} = validadorUser.validate({name})
    if(error) return res.status(422).send("Preencha todos os campos!")

    const participanteExistente = await db.collection("participants").findOne({name:name})
     if(participanteExistente) { return res.status(409).send("Essa usuario já existe!")}

     const novoParticipante = {
        name,
        lastStatus: Date.now()
    }
    
    await db.collection("participants").insertOne(novoParticipante)
        return res.sendStatus(201)

    }catch (err) {
        res.status(500).send(err.message);
    }
});

//// Retornar a lista de todos os participantes

app.get("/participants", (req, res) =>{


    db.collection("participants").find().toArray()
    .then((data) => {
        res.send(data)})
    .catch((err) => {
        res.status(500).send(err.message)})
      
})




/// porta sendo utilizada
const PORT = 5000
app.listen(PORT, () =>console.log(`servidor está rodando na porta ${PORT}`))
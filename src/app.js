import express from 'express'
import cors from 'cors'
import dotenv from "dotenv"
import { MongoClient } from "mongodb"
import joi from "joi"
import dayjs from 'dayjs'

/// settings
const app = express();
app.use(cors());
app.use(express.json())
dotenv.config()


/// database connection
const mongoClient = new MongoClient(process.env.DATABASE_URL)
let db

mongoClient.connect()
    .then(()=> db = mongoClient.db())
    .catch((err)=> console.log(err.message))


/// global variables


const validationUser = joi.object({
    name: joi.string().required()
})

const date = Date.now()

/// functions 


/// login participant 
app.post("/participants", async (req, res) => {
    const {name} = req.body

	try {

    const {error} = validationUser.validate({name})
        if(error) return res.status(422).send("Fill in all the fields!")

    const existingParticipant = await db.collection("participants").findOne({name:name})
        if(existingParticipant) { return res.status(409).send("This user already exists!")}

    const date = Date.now()
    const hour = dayjs(date).format('HH:mm:ss');

     const newParticipant = {
        name,
        lastStatus: date
    }

    const room = {
            from: name,
            to: 'Todos',
            text: 'entra na sala...',
            type: 'status',
            time: hour
    }
    
    await db.collection("participants").insertOne(newParticipant)
    await db.collection("messages").insertOne(room)
        return res.sendStatus(201)

    }catch (err) {
        res.status(500).send(err.message);
    }
});

//// return list with all participants

app.get("/participants", async (req, res) =>{


    try {
        const listParticipants = await db.collection("participants").find().toArray()
            res.send(listParticipants)
          
        }
        catch (err) {
            res.status(500).send(err.message);
        }
    
      
})

/// post message 
app.post("/messages", async (req, res)=>{

    /// login
    const {user} = req.headers
    if(!user){
        return res.status(401)
    }

    const {to, text, type} = req.body

    const message = {to, text, type}

    const messageSchema = joi.object({
            to: joi.string(),
            text: joi.string(),
            type: joi.string().valid('message', 'private_message')
    })
    const validationMessage =  messageSchema.validate(message)

    const date = Date.now()
    const hour = dayjs(date).format('HH:mm:ss');

    const messageTime = {
        from:user,
        to:to, 
        text:text, 
        type:type,
        time:hour
    }

    try{

        if(validationMessage.error) {return res.sendStatus(422)}
        const existingParticipant = await db.collection("participants").findOne({name:user})
        if(!existingParticipant) { return res.sendStatus(422)}

        await db.collection("messages").insertOne(messageTime)
        return res.sendStatus(201)

    }
    catch (err) {
        res.status(500).send(err.message);
    }


})

/// get message

app.get("/messages", async (req, res) => {

    const {limit} = req.query

    const {user} = req.headers
    if(!user){
        return res.status(401)
    }


    try {
        const participant = await db.collection("participants").findOne({name:user})
        const username = participant.name
        let mensagem;

        if(!limit) {
            mensagem = await db.collection("messages").find({$or: [
                {to:username},
                {to:"Todos"},
                {from:username}
            ]}).sort({ time: -1 })
        } else if (limit == 0 || limit <=0 || isNaN(parseInt(limit))) {
            return res.status(422).send("Invalid parameter.");
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
  

/// status user  
app.post("/status", async (req, res)=>{


    try {
        const {user} = req.headers
        if(!user){
            return res.status(404).send("Not authorized. 'user' header not provided");
        }
        const participant = await db.collection("participants").findOne({name: user})
        if(!participant) {
            return res.status(404).send("participant not found");
        }

        participant.lastStatus = Date.now()
        await db.collection("participants").updateOne({ _id: participant._id }, { $set: { lastStatus: participant.lastStatus } });

            res.sendStatus(200)

    }
    catch (err) {
        res.status(500).send(err.message);
    }
  
})

/// delete user


async function deleteInactive(){


    try {
    const limite = Date.now() - 10 * 1000;
    const user = await db.collection("participants").find({lastStatus: { $lt: limite }}).toArray()
    if(user && user.length !== 0){
        const date = Date.now()
        const hour = dayjs(date).format('HH:mm:ss');
        let listaMensagens = []
    
        user.forEach(usuario => {
            const mens = {
                from: usuario.name,
                to: 'Todos',
                text: 'sai da sala...',
                type: 'status',
                time:hour
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







/// port
const port = process.env.PORT || 5000
app.listen(port, () =>console.log(`server is running on the port ${port}`))
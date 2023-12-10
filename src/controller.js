import { MongoClient } from 'mongodb';
import joi from 'joi';
import dayjs from 'dayjs';
import dotenv from 'dotenv';

dotenv.config();

const mongoClient = new MongoClient(process.env.DATABASE_URL);
let db;

mongoClient
  .connect()
  .then(() => (db = mongoClient.db()))
  .catch((err) => console.log(err.message));

const validationUser = joi.object({
  name: joi.string().required(),
});

export async function addParticipant(req, res) {
  const { name } = req.body;

  try {
    const { error } = validationUser.validate({ name });
    if (error) return res.status(422).send('Fill in all the fields!');

    const existingParticipant = await db.collection('participants').findOne({ name: name });
    if (existingParticipant) {
      return res.status(409).send('This user already exists!');
    }

    const date = Date.now();
    const hour = dayjs(date).format('HH:mm:ss');

    const newParticipant = {
      name,
      lastStatus: date,
    };

    const room = {
      from: name,
      to: 'Todos',
      text: 'entra na sala...',
      type: 'status',
      time: hour,
    };

    await db.collection('participants').insertOne(newParticipant);
    await db.collection('messages').insertOne(room);
    return res.sendStatus(201);
  } catch (err) {
    res.status(500).send(err.message);
  }
}

export async function getAllParticipants(req, res) {
  try {
    const listParticipants = await db.collection('participants').find().toArray();
    res.send(listParticipants);
  } catch (err) {
    res.status(500).send(err.message);
  }
}

export async function postMessage(req, res) {
  const { user } = req.headers;

  if (!user) {
    return res.status(401).send('Unauthorized');
  }

  const { to, text, type } = req.body;

  const message = { to, text, type };

  const messageSchema = joi.object({
    to: joi.string(),
    text: joi.string(),
    type: joi.string().valid('message', 'private_message'),
  });

  const validationMessage = messageSchema.validate(message);

  const date = Date.now();
  const hour = dayjs(date).format('HH:mm:ss');

  const messageTime = {
    from: user,
    to,
    text,
    type,
    time: hour,
  };

  try {
    if (validationMessage.error) {
      return res.sendStatus(422);
    }

    const existingParticipant = await db.collection('participants').findOne({ name: user });

    if (!existingParticipant) {
      return res.sendStatus(422);
    }

    await db.collection('messages').insertOne(messageTime);
    return res.sendStatus(201);
  } catch (err) {
    res.status(500).send(err.message);
  }
}

export async function getMessages(req, res) {
  const { limit } = req.query;
  const { user } = req.headers;

  if (!user) {
    return res.status(401).send('Unauthorized');
  }

  try {
    const participant = await db.collection('participants').findOne({ name: user });
    const username = participant.name;
    let mensagem;

    if (!limit) {
      mensagem = await db
        .collection('messages')
        .find({
          $or: [
            { to: username },
            { to: 'Todos' },
            { from: username },
          ],
        })
        .sort({ time: -1 });
    } else if (limit == 0 || limit <= 0 || isNaN(parseInt(limit))) {
      return res.status(422).send('Invalid parameter.');
    }

    if (limit) {
      mensagem = await db
        .collection('messages')
        .find({
          $or: [
            { to: username },
            { to: 'Todos' },
            { from: username },
          ],
        })
        .sort({ time: -1 })
        .limit(parseInt(limit));
    }

    const messagesArray = await mensagem.toArray();

    return res.status(200).send(messagesArray);
  } catch (err) {
    res.status(500).send(err.message);
  }
}

export async function postStatus(req, res) {
  try {
    const { user } = req.headers;
    if (!user) {
      return res.status(404).send("Not authorized. 'user' header not provided");
    }
    const participant = await db.collection('participants').findOne({ name: user });

    if (!participant) {
      return res.status(404).send('Participant not found');
    }

    participant.lastStatus = Date.now();
    await db
      .collection('participants')
      .updateOne({ _id: participant._id }, { $set: { lastStatus: participant.lastStatus } });

    res.sendStatus(200);
  } catch (err) {
    res.status(500).send(err.message);
  }
}

export async function deleteInactive(req, res) {
  try {
    const limit = Date.now() - 10 * 1000;
    const inactiveUsers = await db.collection('participants').find({ lastStatus: { $lt: limit } }).toArray();

    if (inactiveUsers && inactiveUsers.length !== 0) {
      const date = Date.now();
      const hour = dayjs(date).format('HH:mm:ss');
      let exitMessages = [];

      inactiveUsers.forEach((user) => {
        const exitMessage = {
          from: user.name,
          to: 'Todos',
          text: 'sai da sala...',
          type: 'status',
          time: hour,
        };
        exitMessages.push(exitMessage);
      });

      await db.collection('messages').insertMany(exitMessages);

      const userIds = inactiveUsers.map((user) => user._id);
      await db.collection('participants').deleteMany({ _id: { $in: userIds } });
    }

    res.sendStatus(204);
  } catch (err) {
    console.log(err);
    res.status(500).send('Internal Server Error');
  }
}

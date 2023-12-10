import express from 'express';
import {
  addParticipant,
  getAllParticipants,
  postMessage,
  getMessages,
  postStatus,
  deleteInactive,
} from './controller.js';

const router = express.Router();

router.post('/participants', addParticipant);
router.get('/participants', getAllParticipants);
router.post('/messages', postMessage);
router.get('/messages', getMessages);
router.post('/status', postStatus);
router.delete('/inactive', deleteInactive);

export default router;

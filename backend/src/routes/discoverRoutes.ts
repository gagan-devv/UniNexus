import { Router } from 'express';
import { discover } from '../controllers/discoverController';

const router = Router();

router.get('/', discover);

export default router;

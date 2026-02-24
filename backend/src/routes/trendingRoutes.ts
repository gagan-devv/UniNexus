import { Router } from 'express';
import { getTrending } from '../controllers/trendingController';

const router = Router();

router.get('/', getTrending);

export default router;

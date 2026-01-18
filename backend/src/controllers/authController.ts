import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { logger } from '../utils/logger';

const generateToken = (id: string) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || '', {
        expiresIn: '30d',
    });
};

export const registerUser = async (req: Request, res: Response): Promise<void> => {
    try
    {
        logger.debug('Registration attempt:', req.body);
        const { username, email, password, role } = req.body;

        if(!username || !email || !password)
        {
            logger.warn('Missing required fields');
            res.status(400).json({ message: 'Please fill in all fields.' });
            return;
        }

        logger.debug('Checking if user exists...');
        const userExists = await User.findOne({ email });
        if(userExists)
        {
            logger.warn('User already exists');
            res.status(400).json({ message: 'User already exists.' });
            return;
        }

        logger.debug('Hashing password...');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        logger.debug('Creating user...');
        const user = await User.create({
            username,
            email,
            password: hashedPassword,
            role: role || 'student'
        });

        if(user)
        {
            logger.info('User created successfully');
            res.status(201).json({
                _id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                token: generateToken(user.id.toString()),
            });
        }
        else
        {
            logger.error('Failed to create user');
            res.status(500).json({ message: 'Invalid user data.' });
        }
    }
    catch (error)
    {
        logger.error('Registration error:', error instanceof Error ? error : String(error));
        res.status(500).json({ message: 'Internal Server Error.' });
    }
};

export const loginUser = async (req: Request, res: Response): Promise<void> => {
    try 
    {
        const { email, password } = req.body;

        if(!email || !password)
        {
            res.status(400).json({ message: 'Please provide email and password.' });
            return;
        }

        const user = await User.findOne({ email });

        if(user && await bcrypt.compare(password, user.password as string))
        {
            res.status(200).json({
                _id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                token: generateToken(user.id.toString()),
            });
        }
        else
        {
            res.status(401).json({ message: 'Invalid email or password.' });
        }
    } 
    catch (error) 
    {
        logger.error('Login error:', error instanceof Error ? error : String(error));
        res.status(500).json({ message: 'Internal Server Error.' });
    }
};
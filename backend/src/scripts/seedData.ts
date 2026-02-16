import mongoose from 'mongoose';
import { User } from '../models/User';
import { ClubProfile } from '../models/ClubProfile';
import { Event } from '../models/Event';
import { RSVP } from '../models/RSVP';
import { connectDB } from '../config/db';
import { logger } from '../utils/logger';
import dotenv from 'dotenv';

dotenv.config();

// Sample user data
const sampleUsers = [
  {
    username: 'johndoe',
    email: 'john.doe@university.edu',
    password: 'Password123!',
    firstName: 'John',
    lastName: 'Doe',
    year: 3,
    major: 'Computer Science',
    bio: 'Passionate about AI and machine learning. Love building innovative solutions.',
    role: 'student'
  },
  {
    username: 'janesmit',
    email: 'jane.smith@university.edu',
    password: 'Password123!',
    firstName: 'Jane',
    lastName: 'Smith',
    year: 2,
    major: 'Business Administration',
    bio: 'Entrepreneur at heart. Building the next big startup.',
    role: 'student'
  },
  {
    username: 'mikejohnson',
    email: 'mike.johnson@university.edu',
    password: 'Password123!',
    firstName: 'Mike',
    lastName: 'Johnson',
    year: 4,
    major: 'Electrical Engineering',
    bio: 'Hardware enthusiast and robotics lover.',
    role: 'student'
  },
  {
    username: 'sarahwilliams',
    email: 'sarah.williams@university.edu',
    password: 'Password123!',
    firstName: 'Sarah',
    lastName: 'Williams',
    year: 1,
    major: 'Psychology',
    bio: 'Interested in human behavior and mental health advocacy.',
    role: 'student'
  },
  {
    username: 'davidbrown',
    email: 'david.brown@university.edu',
    password: 'Password123!',
    firstName: 'David',
    lastName: 'Brown',
    year: 3,
    major: 'Mechanical Engineering',
    bio: 'Building sustainable solutions for tomorrow.',
    role: 'student'
  },
  {
    username: 'emilydavis',
    email: 'emily.davis@university.edu',
    password: 'Password123!',
    firstName: 'Emily',
    lastName: 'Davis',
    year: 2,
    major: 'Biology',
    bio: 'Pre-med student passionate about healthcare innovation.',
    role: 'student'
  },
  {
    username: 'alexmartinez',
    email: 'alex.martinez@university.edu',
    password: 'Password123!',
    firstName: 'Alex',
    lastName: 'Martinez',
    year: 4,
    major: 'Data Science',
    bio: 'Data enthusiast exploring the world of analytics and visualization.',
    role: 'student'
  },
  {
    username: 'oliviagarcia',
    email: 'olivia.garcia@university.edu',
    password: 'Password123!',
    firstName: 'Olivia',
    lastName: 'Garcia',
    year: 3,
    major: 'Environmental Science',
    bio: 'Fighting climate change one project at a time.',
    role: 'student'
  }
];

// Sample club data
const sampleClubs = [
  {
    name: 'Tech Innovators Club',
    description: 'A community of tech enthusiasts building the future. We organize hackathons, workshops, and tech talks featuring industry leaders. Join us to learn, build, and innovate together!',
    email: 'tech.innovators@university.edu',
    category: 'Technology',
    foundedYear: 2018,
    memberCount: 150,
    socialLinks: {
      instagram: 'https://instagram.com/techinnovators',
      linkedin: 'https://linkedin.com/company/tech-innovators',
      website: 'https://techinnovators.university.edu'
    }
  },
  {
    name: 'Entrepreneurship Society',
    description: 'Empowering student entrepreneurs to turn their ideas into reality. We provide mentorship, funding opportunities, and networking events with successful founders and investors.',
    email: 'entrepreneurship@university.edu',
    category: 'Business & Entrepreneurship',
    foundedYear: 2015,
    memberCount: 200,
    socialLinks: {
      linkedin: 'https://linkedin.com/company/entrepreneurship-society',
      twitter: 'https://twitter.com/entrepreneusoc'
    }
  },
  {
    name: 'Robotics Engineering Club',
    description: 'Building autonomous robots and competing in national competitions. From drones to humanoid robots, we explore cutting-edge robotics technology and participate in RoboCup.',
    email: 'robotics@university.edu',
    category: 'Technology',
    foundedYear: 2016,
    memberCount: 85,
    socialLinks: {
      instagram: 'https://instagram.com/roboticsclub',
      website: 'https://robotics.university.edu'
    }
  },
  {
    name: 'Mental Health Awareness Club',
    description: 'Promoting mental health awareness and providing support resources for students. We organize wellness workshops, meditation sessions, and peer support groups.',
    email: 'mentalhealth@university.edu',
    category: 'Health & Wellness',
    foundedYear: 2019,
    memberCount: 120,
    socialLinks: {
      instagram: 'https://instagram.com/mentalhealthclub'
    }
  },
  {
    name: 'Sustainable Engineering Initiative',
    description: 'Engineering solutions for a sustainable future. We work on renewable energy projects, waste reduction systems, and green technology innovations.',
    email: 'sustainable.eng@university.edu',
    category: 'Environmental',
    foundedYear: 2017,
    memberCount: 95,
    socialLinks: {
      linkedin: 'https://linkedin.com/company/sustainable-eng',
      website: 'https://sustainable.university.edu'
    }
  },
  {
    name: 'Data Science Society',
    description: 'Exploring the world of data through analytics, machine learning, and visualization. We host Kaggle competitions, data challenges, and industry workshops.',
    email: 'datascience@university.edu',
    category: 'Technology',
    foundedYear: 2020,
    memberCount: 180,
    socialLinks: {
      linkedin: 'https://linkedin.com/company/data-science-society',
      medium: 'https://medium.com/@datasciencesoc'
    }
  },
  {
    name: 'Environmental Action Group',
    description: 'Taking action to protect our planet. We organize campus cleanups, tree planting drives, and advocate for sustainable campus policies.',
    email: 'environmental@university.edu',
    category: 'Environmental',
    foundedYear: 2014,
    memberCount: 140,
    socialLinks: {
      instagram: 'https://instagram.com/envactiongroup',
      facebook: 'https://facebook.com/environmentalactiongroup'
    }
  },
  {
    name: 'Pre-Med Society',
    description: 'Supporting aspiring healthcare professionals on their journey to medical school. We provide MCAT prep, clinical shadowing opportunities, and pre-med advising.',
    email: 'premed@university.edu',
    category: 'Professional',
    foundedYear: 2012,
    memberCount: 250,
    socialLinks: {
      instagram: 'https://instagram.com/premedsociety',
      linkedin: 'https://linkedin.com/company/premed-society'
    }
  }
];

// Sample event data (will be created after clubs)
const sampleEvents = [
  {
    title: 'HackUni 2026 - 48 Hour Hackathon',
    description: 'Join us for the biggest hackathon of the year! Build innovative solutions, win prizes worth $10,000, and network with industry professionals. Free food, swag, and workshops included. Teams of 1-4 members welcome.',
    location: 'Engineering Building, Main Hall',
    category: 'Tech',
    startTime: new Date('2026-03-15T09:00:00Z'),
    endTime: new Date('2026-03-17T17:00:00Z'),
    maxAttendees: 200,
    tags: ['hackathon', 'coding', 'innovation', 'prizes'],
    isPublic: true
  },
  {
    title: 'Startup Pitch Competition',
    description: 'Present your startup idea to a panel of investors and entrepreneurs. Top 3 teams win seed funding and mentorship. Open to all students with innovative business ideas.',
    location: 'Business School Auditorium',
    category: 'Workshop',
    startTime: new Date('2026-02-20T14:00:00Z'),
    endTime: new Date('2026-02-20T18:00:00Z'),
    maxAttendees: 100,
    tags: ['startup', 'entrepreneurship', 'pitch', 'funding'],
    isPublic: true
  },
  {
    title: 'RoboCup Regional Competition',
    description: 'Watch our robotics team compete against universities from across the region. Autonomous robots will battle in soccer, rescue, and maze challenges. Free entry for students!',
    location: 'Sports Complex Arena',
    category: 'Sports',
    startTime: new Date('2026-04-10T10:00:00Z'),
    endTime: new Date('2026-04-10T16:00:00Z'),
    maxAttendees: 500,
    tags: ['robotics', 'competition', 'engineering', 'autonomous'],
    isPublic: true
  },
  {
    title: 'Mental Health Awareness Week Kickoff',
    description: 'Join us for a week dedicated to mental health awareness. This kickoff event features guest speakers, wellness activities, and resource fair. Learn about campus mental health services.',
    location: 'Student Center Plaza',
    category: 'Seminar',
    startTime: new Date('2026-03-01T12:00:00Z'),
    endTime: new Date('2026-03-01T15:00:00Z'),
    maxAttendees: 300,
    tags: ['mental-health', 'wellness', 'awareness', 'support'],
    isPublic: true
  },
  {
    title: 'Sustainable Energy Workshop',
    description: 'Learn about renewable energy technologies and sustainable engineering practices. Hands-on workshop covering solar panels, wind turbines, and energy storage systems.',
    location: 'Engineering Lab 204',
    category: 'Workshop',
    startTime: new Date('2026-02-25T15:00:00Z'),
    endTime: new Date('2026-02-25T18:00:00Z'),
    maxAttendees: 50,
    tags: ['sustainability', 'renewable-energy', 'workshop', 'engineering'],
    isPublic: true
  },
  {
    title: 'Data Science Kaggle Competition',
    description: 'Compete in our internal Kaggle-style data science competition. Analyze real-world datasets, build predictive models, and win prizes. All skill levels welcome!',
    location: 'Computer Science Building, Room 301',
    category: 'Tech',
    startTime: new Date('2026-03-08T13:00:00Z'),
    endTime: new Date('2026-03-08T17:00:00Z'),
    maxAttendees: 80,
    tags: ['data-science', 'machine-learning', 'kaggle', 'competition'],
    isPublic: true
  },
  {
    title: 'Campus Cleanup Day',
    description: 'Help us make our campus greener! Join the environmental action group for a campus-wide cleanup. Gloves, bags, and refreshments provided. Community service hours available.',
    location: 'Meet at Student Center',
    category: 'Other',
    startTime: new Date('2026-02-28T09:00:00Z'),
    endTime: new Date('2026-02-28T13:00:00Z'),
    maxAttendees: 150,
    tags: ['environment', 'cleanup', 'volunteer', 'community-service'],
    isPublic: true
  },
  {
    title: 'MCAT Prep Workshop Series',
    description: 'Comprehensive MCAT preparation workshop covering all sections. Led by students who scored in the 95th percentile. Includes practice questions and test-taking strategies.',
    location: 'Library Conference Room A',
    category: 'Seminar',
    startTime: new Date('2026-03-05T18:00:00Z'),
    endTime: new Date('2026-03-05T20:00:00Z'),
    maxAttendees: 60,
    tags: ['mcat', 'pre-med', 'test-prep', 'medical-school'],
    isPublic: true
  },
  {
    title: 'AI & Machine Learning Summit',
    description: 'Full-day summit featuring talks from AI researchers and industry leaders. Topics include deep learning, NLP, computer vision, and ethical AI. Networking lunch included.',
    location: 'University Conference Center',
    category: 'Seminar',
    startTime: new Date('2026-04-20T09:00:00Z'),
    endTime: new Date('2026-04-20T17:00:00Z'),
    maxAttendees: 250,
    tags: ['ai', 'machine-learning', 'deep-learning', 'summit'],
    isPublic: true
  },
  {
    title: 'Founder Fireside Chat',
    description: 'Intimate conversation with successful startup founders. Learn about their journey, challenges, and advice for aspiring entrepreneurs. Q&A session included.',
    location: 'Innovation Hub',
    category: 'Seminar',
    startTime: new Date('2026-03-12T17:00:00Z'),
    endTime: new Date('2026-03-12T19:00:00Z'),
    maxAttendees: 75,
    tags: ['entrepreneurship', 'startup', 'founder', 'networking'],
    isPublic: true
  }
];

async function seedDatabase() {
  try {
    logger.info('🌱 Starting database seeding...');

    // Connect to database
    await connectDB();

    // Clear existing data
    logger.info('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await ClubProfile.deleteMany({});
    await Event.deleteMany({});
    await RSVP.deleteMany({});

    // Create users
    logger.info('👥 Creating users...');
    const createdUsers = await User.create(sampleUsers);
    logger.info(`✅ Created ${createdUsers.length} users`);

    // Create clubs (assign to users)
    logger.info('🏢 Creating clubs...');
    const createdClubs = [];
    for (let i = 0; i < sampleClubs.length; i++) {
      const user = createdUsers[i];
      if (!user) continue;
      
      const clubData = {
        ...sampleClubs[i],
        user: user._id,
        verificationStatus: 'approved' as const,
        isVerified: true
      };
      const club = await ClubProfile.create(clubData);
      createdClubs.push(club);
    }
    logger.info(`✅ Created ${createdClubs.length} clubs`);

    // Create events (assign to clubs)
    logger.info('📅 Creating events...');
    const createdEvents = [];
    for (let i = 0; i < sampleEvents.length; i++) {
      const clubIndex = i % createdClubs.length;
      const club = createdClubs[clubIndex];
      if (!club) continue;
      
      const eventData = {
        ...sampleEvents[i],
        organizer: club._id
      };
      const event = await Event.create(eventData);
      createdEvents.push(event);
    }
    logger.info(`✅ Created ${createdEvents.length} events`);

    // Create some RSVPs
    logger.info('✋ Creating RSVPs...');
    let rsvpCount = 0;
    for (const event of createdEvents) {
      // Random number of RSVPs per event (5-20)
      const numRsvps = Math.floor(Math.random() * 16) + 5;
      const shuffledUsers = [...createdUsers].sort(() => Math.random() - 0.5);
      
      for (let i = 0; i < Math.min(numRsvps, shuffledUsers.length); i++) {
        const user = shuffledUsers[i];
        if (!user) continue;
        
        const statuses: Array<'going' | 'interested' | 'not_going' | 'waitlist'> = ['going', 'interested', 'not_going', 'waitlist'];
        const randomIndex = Math.floor(Math.random() * statuses.length);
        const randomStatus = statuses[randomIndex]!;
        
        await RSVP.create({
          user: user._id,
          event: event._id,
          status: randomStatus
        });
        rsvpCount++;
      }
    }
    logger.info(`✅ Created ${rsvpCount} RSVPs`);

    // Print summary
    logger.info('\n📊 Seeding Summary:');
    logger.info(`   Users: ${createdUsers.length}`);
    logger.info(`   Clubs: ${createdClubs.length}`);
    logger.info(`   Events: ${createdEvents.length}`);
    logger.info(`   RSVPs: ${rsvpCount}`);
    
    logger.info('\n🎉 Database seeding completed successfully!');
    logger.info('\n📝 Sample Login Credentials:');
    logger.info('   Email: john.doe@university.edu');
    logger.info('   Password: Password123!');
    logger.info('\n   (All users have the same password: Password123!)');

    process.exit(0);
  } catch (error) {
    logger.error('❌ Error seeding database:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run seeding
seedDatabase();

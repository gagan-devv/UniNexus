import mongoose from 'mongoose';
import { User } from '../models/User';
import { ClubProfile } from '../models/ClubProfile';
import { Event } from '../models/Event';
import { RSVP } from '../models/RSVP';
import { Comment } from '../models/Comment';
import { Notification } from '../models/Notification';
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
// Helper function to get future dates
const getFutureDate = (daysFromNow: number, hour: number = 9, minute: number = 0): Date => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, minute, 0, 0);
  return date;
};

const sampleEvents = [
  {
    title: 'HackUni 2026 - 48 Hour Hackathon',
    description: 'Join us for the biggest hackathon of the year! Build innovative solutions, win prizes worth $10,000, and network with industry professionals. Free food, swag, and workshops included. Teams of 1-4 members welcome.',
    location: 'Engineering Building, Main Hall',
    category: 'Tech',
    startTime: getFutureDate(15, 9, 0), // 15 days from now, 9 AM
    endTime: getFutureDate(17, 17, 0), // 17 days from now, 5 PM
    maxAttendees: 200,
    tags: ['hackathon', 'coding', 'innovation', 'prizes'],
    isPublic: true
  },
  {
    title: 'Startup Pitch Competition',
    description: 'Present your startup idea to a panel of investors and entrepreneurs. Top 3 teams win seed funding and mentorship. Open to all students with innovative business ideas.',
    location: 'Business School Auditorium',
    category: 'Workshop',
    startTime: getFutureDate(7, 14, 0), // 7 days from now, 2 PM
    endTime: getFutureDate(7, 18, 0), // Same day, 6 PM
    maxAttendees: 100,
    tags: ['startup', 'entrepreneurship', 'pitch', 'funding'],
    isPublic: true
  },
  {
    title: 'RoboCup Regional Competition',
    description: 'Watch our robotics team compete against universities from across the region. Autonomous robots will battle in soccer, rescue, and maze challenges. Free entry for students!',
    location: 'Sports Complex Arena',
    category: 'Sports',
    startTime: getFutureDate(25, 10, 0), // 25 days from now, 10 AM
    endTime: getFutureDate(25, 16, 0), // Same day, 4 PM
    maxAttendees: 500,
    tags: ['robotics', 'competition', 'engineering', 'autonomous'],
    isPublic: true
  },
  {
    title: 'Mental Health Awareness Week Kickoff',
    description: 'Join us for a week dedicated to mental health awareness. This kickoff event features guest speakers, wellness activities, and resource fair. Learn about campus mental health services.',
    location: 'Student Center Plaza',
    category: 'Seminar',
    startTime: getFutureDate(10, 12, 0), // 10 days from now, 12 PM
    endTime: getFutureDate(10, 15, 0), // Same day, 3 PM
    maxAttendees: 300,
    tags: ['mental-health', 'wellness', 'awareness', 'support'],
    isPublic: true
  },
  {
    title: 'Sustainable Energy Workshop',
    description: 'Learn about renewable energy technologies and sustainable engineering practices. Hands-on workshop covering solar panels, wind turbines, and energy storage systems.',
    location: 'Engineering Lab 204',
    category: 'Workshop',
    startTime: getFutureDate(5, 15, 0), // 5 days from now, 3 PM
    endTime: getFutureDate(5, 18, 0), // Same day, 6 PM
    maxAttendees: 50,
    tags: ['sustainability', 'renewable-energy', 'workshop', 'engineering'],
    isPublic: true
  },
  {
    title: 'Data Science Kaggle Competition',
    description: 'Compete in our internal Kaggle-style data science competition. Analyze real-world datasets, build predictive models, and win prizes. All skill levels welcome!',
    location: 'Computer Science Building, Room 301',
    category: 'Tech',
    startTime: getFutureDate(12, 13, 0), // 12 days from now, 1 PM
    endTime: getFutureDate(12, 17, 0), // Same day, 5 PM
    maxAttendees: 80,
    tags: ['data-science', 'machine-learning', 'kaggle', 'competition'],
    isPublic: true
  },
  {
    title: 'Campus Cleanup Day',
    description: 'Help us make our campus greener! Join the environmental action group for a campus-wide cleanup. Gloves, bags, and refreshments provided. Community service hours available.',
    location: 'Meet at Student Center',
    category: 'Other',
    startTime: getFutureDate(3, 9, 0), // 3 days from now, 9 AM
    endTime: getFutureDate(3, 13, 0), // Same day, 1 PM
    maxAttendees: 150,
    tags: ['environment', 'cleanup', 'volunteer', 'community-service'],
    isPublic: true
  },
  {
    title: 'MCAT Prep Workshop Series',
    description: 'Comprehensive MCAT preparation workshop covering all sections. Led by students who scored in the 95th percentile. Includes practice questions and test-taking strategies.',
    location: 'Library Conference Room A',
    category: 'Seminar',
    startTime: getFutureDate(8, 18, 0), // 8 days from now, 6 PM
    endTime: getFutureDate(8, 20, 0), // Same day, 8 PM
    maxAttendees: 60,
    tags: ['mcat', 'pre-med', 'test-prep', 'medical-school'],
    isPublic: true
  },
  {
    title: 'AI & Machine Learning Summit',
    description: 'Full-day summit featuring talks from AI researchers and industry leaders. Topics include deep learning, NLP, computer vision, and ethical AI. Networking lunch included.',
    location: 'University Conference Center',
    category: 'Seminar',
    startTime: getFutureDate(30, 9, 0), // 30 days from now, 9 AM
    endTime: getFutureDate(30, 17, 0), // Same day, 5 PM
    maxAttendees: 250,
    tags: ['ai', 'machine-learning', 'deep-learning', 'summit'],
    isPublic: true
  },
  {
    title: 'Founder Fireside Chat',
    description: 'Intimate conversation with successful startup founders. Learn about their journey, challenges, and advice for aspiring entrepreneurs. Q&A session included.',
    location: 'Innovation Hub',
    category: 'Seminar',
    startTime: getFutureDate(18, 17, 0), // 18 days from now, 5 PM
    endTime: getFutureDate(18, 19, 0), // Same day, 7 PM
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

    // DO NOT clear existing data - only add/update
    logger.info('📊 Checking existing data...');
    const existingUserCount = await User.countDocuments();
    const existingClubCount = await ClubProfile.countDocuments();
    const existingEventCount = await Event.countDocuments();
    logger.info(`   Existing Users: ${existingUserCount}`);
    logger.info(`   Existing Clubs: ${existingClubCount}`);
    logger.info(`   Existing Events: ${existingEventCount}`);

    // Create or update users (skip if email exists)
    logger.info('\n👥 Creating/updating users...');
    const createdUsers = [];
    for (const userData of sampleUsers) {
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        logger.info(`   ⏭️  User ${userData.email} already exists, skipping...`);
        createdUsers.push(existingUser);
      } else {
        const newUser = await User.create(userData);
        logger.info(`   ✅ Created user: ${userData.email}`);
        createdUsers.push(newUser);
      }
    }
    logger.info(`✅ Processed ${createdUsers.length} users`);

    // Create or update clubs (skip if club with same name exists)
    logger.info('\n🏢 Creating/updating clubs...');
    const createdClubs = [];
    let updatedClubCount = 0;
    
    for (let i = 0; i < sampleClubs.length; i++) {
      const clubData = sampleClubs[i];
      if (!clubData) continue;
      
      const user = createdUsers[i];
      if (!user) continue;
      
      const existingClub = await ClubProfile.findOne({ name: clubData.name });
      if (existingClub) {
        // Update the club to ensure it has approved status
        existingClub.verificationStatus = 'approved';
        existingClub.isVerified = true;
        existingClub.status = 'approved';
        existingClub.approvedAt = new Date();
        await existingClub.save();
        logger.info(`   🔄 Updated club status: ${clubData.name}`);
        createdClubs.push(existingClub);
        updatedClubCount++;
      } else {
        const newClubData = {
          ...clubData,
          user: user._id,
          verificationStatus: 'approved' as const,
          isVerified: true,
          status: 'approved' as const,
          approvedAt: new Date()
        };
        const newClub = await ClubProfile.create(newClubData);
        logger.info(`   ✅ Created club: ${clubData.name}`);
        createdClubs.push(newClub);
      }
    }
    logger.info(`✅ Processed ${createdClubs.length} clubs (updated ${updatedClubCount} to approved status)`);

    // Create or update events
    logger.info('\n📅 Creating/updating events...');
    const createdEvents = [];
    let updatedEventCount = 0;
    
    for (let i = 0; i < sampleEvents.length; i++) {
      const eventData = sampleEvents[i];
      if (!eventData) continue;
      
      const clubIndex = i % createdClubs.length;
      const club = createdClubs[clubIndex];
      if (!club) continue;
      
      const existingEvent = await Event.findOne({ 
        title: eventData.title,
        organizer: club._id 
      });
      
      if (existingEvent) {
        // Update the event dates to future dates
        existingEvent.startTime = eventData.startTime;
        existingEvent.endTime = eventData.endTime;
        await existingEvent.save();
        logger.info(`   🔄 Updated event dates: ${eventData.title}`);
        createdEvents.push(existingEvent);
        updatedEventCount++;
      } else {
        const newEventData = {
          ...eventData,
          organizer: club._id
        };
        const newEvent = await Event.create(newEventData);
        logger.info(`   ✅ Created event: ${eventData.title}`);
        createdEvents.push(newEvent);
      }
    }
    logger.info(`✅ Processed ${createdEvents.length} events (updated ${updatedEventCount} with future dates)`);

    // Create RSVPs (skip if RSVP already exists)
    logger.info('\n✋ Creating RSVPs...');
    let rsvpCount = 0;
    let skippedRsvpCount = 0;
    
    for (const event of createdEvents) {
      // Random number of RSVPs per event (5-20)
      const numRsvps = Math.floor(Math.random() * 16) + 5;
      const shuffledUsers = [...createdUsers].sort(() => Math.random() - 0.5);
      
      for (let i = 0; i < Math.min(numRsvps, shuffledUsers.length); i++) {
        const user = shuffledUsers[i];
        if (!user) continue;
        
        // Check if RSVP already exists
        const existingRsvp = await RSVP.findOne({
          user: user._id,
          event: event._id
        });
        
        if (existingRsvp) {
          skippedRsvpCount++;
          continue;
        }
        
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
    logger.info(`✅ Created ${rsvpCount} new RSVPs (skipped ${skippedRsvpCount} existing)`);

    // Create sample comments with threading
    logger.info('\n💬 Creating sample comments...');
    let commentCount = 0;
    
    for (const event of createdEvents.slice(0, 5)) { // Add comments to first 5 events
      // Create root comments
      const numRootComments = Math.floor(Math.random() * 3) + 2; // 2-4 root comments
      
      for (let i = 0; i < numRootComments; i++) {
        const randomUser = createdUsers[Math.floor(Math.random() * createdUsers.length)];
        if (!randomUser) continue;
        
        const rootCommentContent = [
          "This looks amazing! Can't wait to attend! 🎉",
          "Great initiative! Will definitely be there.",
          "Interesting event. What's the registration process?",
          "This is exactly what our campus needs!",
          "Looking forward to this. Any prerequisites?"
        ][i % 5] || "Great event!";
        
        const existingComment = await Comment.findOne({
          eventId: event._id,
          content: rootCommentContent,
          author: randomUser._id
        });
        
        if (existingComment) continue;
        
        const rootCommentData = {
          content: rootCommentContent,
          author: randomUser._id,
          eventId: event._id,
          parentId: null,
          path: '',
          depth: 0,
          upvotes: [],
          downvotes: [],
          voteCount: 0
        };
        
        const rootComments = await Comment.create([rootCommentData]);
        const rootComment = rootComments[0];
        if (!rootComment) continue;
        
        commentCount++;
        
        // Add some upvotes to root comment
        const numUpvotes = Math.floor(Math.random() * 5) + 1;
        const upvoters = [...createdUsers].sort(() => Math.random() - 0.5).slice(0, numUpvotes);
        rootComment.upvotes = upvoters.map(u => u._id);
        rootComment.voteCount = numUpvotes;
        await rootComment.save();
        
        // Create 1-2 replies to this root comment
        const numReplies = Math.floor(Math.random() * 2) + 1;
        
        for (let j = 0; j < numReplies; j++) {
          const replyUser = createdUsers[Math.floor(Math.random() * createdUsers.length)];
          if (!replyUser) continue;
          
          const replyContent = [
            "Thanks for your interest! Registration opens next week.",
            "I agree! This will be a great learning experience.",
            "No prerequisites needed, everyone is welcome!",
            "See you there! 👍",
            "Feel free to reach out if you have any questions."
          ][j % 5] || "Thanks!";
          
          const existingReply = await Comment.findOne({
            eventId: event._id,
            content: replyContent,
            author: replyUser._id,
            parentId: rootComment._id
          });
          
          if (existingReply) continue;
          
          const replyData = {
            content: replyContent,
            author: replyUser._id,
            eventId: event._id,
            parentId: rootComment._id,
            path: `${rootComment._id}.`,
            depth: 1,
            upvotes: [],
            downvotes: [],
            voteCount: 0
          };
          
          const replies = await Comment.create([replyData]);
          const reply = replies[0];
          if (!reply) continue;
          
          commentCount++;
          
          // Add some upvotes to reply
          const numReplyUpvotes = Math.floor(Math.random() * 3) + 1;
          const replyUpvoters = [...createdUsers].sort(() => Math.random() - 0.5).slice(0, numReplyUpvotes);
          reply.upvotes = replyUpvoters.map(u => u._id);
          reply.voteCount = numReplyUpvotes;
          await reply.save();
          
          // Occasionally create a nested reply (depth 2)
          if (Math.random() > 0.5) {
            const nestedUser = createdUsers[Math.floor(Math.random() * createdUsers.length)];
            if (!nestedUser) continue;
            
            const nestedContent = [
              "That's helpful, thanks!",
              "Perfect! Count me in.",
              "Awesome, looking forward to it!",
              "Great to hear!"
            ][Math.floor(Math.random() * 4)] || "Thanks!";
            
            const existingNested = await Comment.findOne({
              eventId: event._id,
              content: nestedContent,
              author: nestedUser._id,
              parentId: reply._id
            });
            
            if (existingNested) continue;
            
            const nestedData = {
              content: nestedContent,
              author: nestedUser._id,
              eventId: event._id,
              parentId: reply._id,
              path: `${rootComment._id}.${reply._id}.`,
              depth: 2,
              upvotes: [],
              downvotes: [],
              voteCount: Math.floor(Math.random() * 2)
            };
            
            const nestedReplies = await Comment.create([nestedData]);
            if (nestedReplies[0]) {
              commentCount++;
            }
          }
        }
      }
    }
    logger.info(`✅ Created ${commentCount} comments with threading`);

    // Create sample notifications
    logger.info('\n🔔 Creating sample notifications...');
    let notificationCount = 0;
    
    for (const user of createdUsers.slice(0, 5)) { // Add notifications for first 5 users
      const notificationTypes = [
        {
          type: 'event' as const,
          title: 'RSVP Confirmed',
          content: 'Your RSVP for HackUni 2026 has been confirmed!',
          relatedId: createdEvents[0]?._id,
          relatedType: 'event' as const
        },
        {
          type: 'event' as const,
          title: 'Event Update',
          content: 'The venue for Startup Pitch Competition has been changed.',
          relatedId: createdEvents[1]?._id,
          relatedType: 'event' as const
        },
        {
          type: 'event' as const,
          title: 'New Reply',
          content: 'Someone replied to your comment on AI & Machine Learning Summit.',
          relatedId: createdEvents[8]?._id,
          relatedType: 'event' as const
        }
      ];
      
      for (const notifData of notificationTypes) {
        // Skip if relatedId is undefined
        if (!notifData.relatedId) continue;
        
        const existingNotif = await Notification.findOne({
          userId: user._id,
          type: notifData.type,
          title: notifData.title
        });
        
        if (existingNotif) continue;
        
        await Notification.create({
          userId: user._id,
          type: notifData.type,
          title: notifData.title,
          content: notifData.content,
          relatedId: notifData.relatedId,
          relatedType: notifData.relatedType,
          read: Math.random() > 0.5 // 50% chance of being read
        });
        notificationCount++;
      }
    }
    logger.info(`✅ Created ${notificationCount} notifications`);

    // Get final counts
    const finalUserCount = await User.countDocuments();
    const finalClubCount = await ClubProfile.countDocuments();
    const finalEventCount = await Event.countDocuments();
    const finalRsvpCount = await RSVP.countDocuments();
    const finalCommentCount = await Comment.countDocuments();
    const finalNotificationCount = await Notification.countDocuments();

    // Print summary
    logger.info('\n📊 Seeding Summary:');
    logger.info(`   Users: ${finalUserCount} (added ${finalUserCount - existingUserCount})`);
    logger.info(`   Clubs: ${finalClubCount} (added ${finalClubCount - existingClubCount})`);
    logger.info(`   Events: ${finalEventCount} (added ${finalEventCount - existingEventCount})`);
    logger.info(`   RSVPs: ${finalRsvpCount}`);
    logger.info(`   Comments: ${finalCommentCount}`);
    logger.info(`   Notifications: ${finalNotificationCount}`);
    
    logger.info('\n🎉 Database seeding completed successfully!');
    logger.info('\n📝 Sample Login Credentials:');
    logger.info('   Email: john.doe@university.edu');
    logger.info('   Password: Password123!');
    logger.info('\n   (All sample users have the same password: Password123!)');

    process.exit(0);
  } catch (error) {
    logger.error('❌ Error seeding database:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      logger.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run seeding
seedDatabase();

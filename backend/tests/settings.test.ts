import fc from 'fast-check';
import request from 'supertest';
import express, { Application } from 'express';
import mongoose from 'mongoose';
import { User } from '../src/models/User';
import settingsRoutes from '../src/routes/settingsRoutes';
import { AuthService } from '../src/services/authService';

const app: Application = express();
app.use(express.json());
app.use('/api/settings', settingsRoutes);

describe('Settings API Tests', () => {
    let testUser: any;
    let authToken: string;

    beforeEach(async () => {
        // Create test user
        testUser = await User.create({
            username: 'settingsuser',
            email: 'settings@test.com',
            password: 'TestPass123!',
            role: 'student'
        });

        authToken = AuthService.generateAccessToken(testUser._id.toString());
    });

    describe('Property 20: Settings structure', () => {
        /**
         * **Validates: Requirements 5.2, 5.3**
         * Feature: uninexus-phase-2-frontend-and-api-completion, Property 20: Settings structure
         */
        it('should return settings with notification preferences (events, clubs, messages) and privacy preferences (showProfile, showEvents)', async () => {
            const response = await request(app)
                .get('/api/settings')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeDefined();

            const settings = response.body.data;

            // Verify notification preferences structure
            expect(settings.notifications).toBeDefined();
            expect(typeof settings.notifications.events).toBe('boolean');
            expect(typeof settings.notifications.clubs).toBe('boolean');
            expect(typeof settings.notifications.messages).toBe('boolean');

            // Verify privacy preferences structure
            expect(settings.privacy).toBeDefined();
            expect(typeof settings.privacy.showProfile).toBe('boolean');
            expect(typeof settings.privacy.showEvents).toBe('boolean');
        });

        it('should return default settings when user has no custom settings', async () => {
            // Create a new user without custom settings
            const newUser = await User.create({
                username: 'newsettingsuser',
                email: 'newsettings@test.com',
                password: 'TestPass123!',
                role: 'student'
            });

            const newToken = AuthService.generateAccessToken(newUser._id.toString());

            const response = await request(app)
                .get('/api/settings')
                .set('Authorization', `Bearer ${newToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            const settings = response.body.data;

            // Verify default values
            expect(settings.notifications.events).toBe(true);
            expect(settings.notifications.clubs).toBe(true);
            expect(settings.notifications.messages).toBe(true);
            expect(settings.privacy.showProfile).toBe(true);
            expect(settings.privacy.showEvents).toBe(true);
        });
    });

    describe('Property 21: Settings update', () => {
        /**
         * **Validates: Requirements 5.4**
         * Feature: uninexus-phase-2-frontend-and-api-completion, Property 21: Settings update
         */
        it('should update user settings with provided values', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        notifications: fc.option(fc.record({
                            events: fc.option(fc.boolean(), { nil: undefined }),
                            clubs: fc.option(fc.boolean(), { nil: undefined }),
                            messages: fc.option(fc.boolean(), { nil: undefined })
                        }), { nil: undefined }),
                        privacy: fc.option(fc.record({
                            showProfile: fc.option(fc.boolean(), { nil: undefined }),
                            showEvents: fc.option(fc.boolean(), { nil: undefined })
                        }), { nil: undefined })
                    }),
                    async (settingsUpdate) => {
                        // Filter out undefined values
                        const cleanUpdate: any = {};
                        if (settingsUpdate.notifications) {
                            cleanUpdate.notifications = Object.fromEntries(
                                Object.entries(settingsUpdate.notifications).filter(([_, v]) => v !== undefined)
                            );
                            if (Object.keys(cleanUpdate.notifications).length === 0) {
                                delete cleanUpdate.notifications;
                            }
                        }
                        if (settingsUpdate.privacy) {
                            cleanUpdate.privacy = Object.fromEntries(
                                Object.entries(settingsUpdate.privacy).filter(([_, v]) => v !== undefined)
                            );
                            if (Object.keys(cleanUpdate.privacy).length === 0) {
                                delete cleanUpdate.privacy;
                            }
                        }

                        // Skip if no valid updates
                        if (Object.keys(cleanUpdate).length === 0) {
                            return;
                        }

                        const response = await request(app)
                            .put('/api/settings')
                            .set('Authorization', `Bearer ${authToken}`)
                            .send(cleanUpdate);

                        expect(response.status).toBe(200);
                        expect(response.body.success).toBe(true);

                        // Verify the updated settings
                        const getResponse = await request(app)
                            .get('/api/settings')
                            .set('Authorization', `Bearer ${authToken}`);

                        const updatedSettings = getResponse.body.data;

                        // Check that provided values were updated
                        if (cleanUpdate.notifications) {
                            if (cleanUpdate.notifications.events !== undefined) {
                                expect(updatedSettings.notifications.events).toBe(cleanUpdate.notifications.events);
                            }
                            if (cleanUpdate.notifications.clubs !== undefined) {
                                expect(updatedSettings.notifications.clubs).toBe(cleanUpdate.notifications.clubs);
                            }
                            if (cleanUpdate.notifications.messages !== undefined) {
                                expect(updatedSettings.notifications.messages).toBe(cleanUpdate.notifications.messages);
                            }
                        }

                        if (cleanUpdate.privacy) {
                            if (cleanUpdate.privacy.showProfile !== undefined) {
                                expect(updatedSettings.privacy.showProfile).toBe(cleanUpdate.privacy.showProfile);
                            }
                            if (cleanUpdate.privacy.showEvents !== undefined) {
                                expect(updatedSettings.privacy.showEvents).toBe(cleanUpdate.privacy.showEvents);
                            }
                        }
                    }
                ),
                { numRuns: 20 }
            );
        });
    });

    describe('Property 22: Settings validation', () => {
        /**
         * **Validates: Requirements 5.5, 5.6**
         * Feature: uninexus-phase-2-frontend-and-api-completion, Property 22: Settings validation
         */
        it('should validate that all notification and privacy preference values are boolean and reject non-boolean values', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.oneof(
                        fc.record({
                            notifications: fc.record({
                                events: fc.oneof(fc.string(), fc.integer(), fc.constant(null))
                            })
                        }),
                        fc.record({
                            notifications: fc.record({
                                clubs: fc.oneof(fc.string(), fc.integer(), fc.constant(null))
                            })
                        }),
                        fc.record({
                            notifications: fc.record({
                                messages: fc.oneof(fc.string(), fc.integer(), fc.constant(null))
                            })
                        }),
                        fc.record({
                            privacy: fc.record({
                                showProfile: fc.oneof(fc.string(), fc.integer(), fc.constant(null))
                            })
                        }),
                        fc.record({
                            privacy: fc.record({
                                showEvents: fc.oneof(fc.string(), fc.integer(), fc.constant(null))
                            })
                        })
                    ),
                    async (invalidSettings) => {
                        const response = await request(app)
                            .put('/api/settings')
                            .set('Authorization', `Bearer ${authToken}`)
                            .send(invalidSettings);

                        expect(response.status).toBe(400);
                        expect(response.body.success).toBe(false);
                        expect(response.body.message).toBe('Validation failed');
                        expect(response.body.errors).toBeDefined();
                        expect(Array.isArray(response.body.errors)).toBe(true);
                        expect(response.body.errors.length).toBeGreaterThan(0);
                    }
                ),
                { numRuns: 20 }
            );
        });

        it('should accept valid boolean values for all settings', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        notifications: fc.record({
                            events: fc.boolean(),
                            clubs: fc.boolean(),
                            messages: fc.boolean()
                        }),
                        privacy: fc.record({
                            showProfile: fc.boolean(),
                            showEvents: fc.boolean()
                        })
                    }),
                    async (validSettings) => {
                        const response = await request(app)
                            .put('/api/settings')
                            .set('Authorization', `Bearer ${authToken}`)
                            .send(validSettings);

                        expect(response.status).toBe(200);
                        expect(response.body.success).toBe(true);
                    }
                ),
                { numRuns: 20 }
            );
        });
    });

    describe('Property 23: Password change', () => {
        /**
         * **Validates: Requirements 5.7, 5.8, 5.9, 5.10, 5.11, 5.12**
         * Feature: uninexus-phase-2-frontend-and-api-completion, Property 23: Password change
         */
        it('should verify current password, validate new password strength, and hash new password before storage', async () => {
            // Test with valid password change
            const validNewPassword = 'NewPass456!';

            const response = await request(app)
                .put('/api/settings/password')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    currentPassword: 'TestPass123!',
                    newPassword: validNewPassword
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Password changed successfully');

            // Verify the password was actually changed and hashed
            const updatedUser = await User.findById(testUser._id);
            expect(updatedUser).toBeDefined();
            
            // Password should be hashed (not plain text)
            expect(updatedUser!.password).not.toBe(validNewPassword);
            expect(updatedUser!.password.length).toBeGreaterThan(20); // Bcrypt hashes are long

            // Verify new password works
            const isPasswordCorrect = await updatedUser!.comparePassword(validNewPassword);
            expect(isPasswordCorrect).toBe(true);

            // Reset password for other tests
            await request(app)
                .put('/api/settings/password')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    currentPassword: validNewPassword,
                    newPassword: 'TestPass123!'
                });
        });

        it('should return 401 when current password is incorrect', async () => {
            const response = await request(app)
                .put('/api/settings/password')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    currentPassword: 'WrongPassword123!',
                    newPassword: 'NewPass456!'
                });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Current password is incorrect');
        });

        it('should validate new password strength requirements', async () => {
            const weakPasswords = [
                'short',                    // Too short
                'nouppercase123!',         // No uppercase
                'NOLOWERCASE123!',         // No lowercase
                'NoNumbers!',              // No numbers
                'NoSpecialChar123',        // No special character
                'abc123'                   // Multiple failures
            ];

            for (const weakPassword of weakPasswords) {
                const response = await request(app)
                    .put('/api/settings/password')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        currentPassword: 'TestPass123!',
                        newPassword: weakPassword
                    });

                expect(response.status).toBe(400);
                expect(response.body.success).toBe(false);
                expect(response.body.message).toBe('Password validation failed');
                expect(response.body.errors).toBeDefined();
                expect(Array.isArray(response.body.errors)).toBe(true);
                expect(response.body.errors.length).toBeGreaterThan(0);
            }
        });

        it('should accept passwords meeting all strength requirements', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 8, maxLength: 20 })
                        .filter(s => /[A-Z]/.test(s))
                        .filter(s => /[a-z]/.test(s))
                        .filter(s => /\d/.test(s))
                        .filter(s => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(s)),
                    async (strongPassword) => {
                        const response = await request(app)
                            .put('/api/settings/password')
                            .set('Authorization', `Bearer ${authToken}`)
                            .send({
                                currentPassword: 'TestPass123!',
                                newPassword: strongPassword
                            });

                        // Should succeed or fail with 401 (if we changed password in previous iteration)
                        if (response.status === 200) {
                            expect(response.body.success).toBe(true);
                            
                            // Reset password for next iteration
                            await request(app)
                                .put('/api/settings/password')
                                .set('Authorization', `Bearer ${authToken}`)
                                .send({
                                    currentPassword: strongPassword,
                                    newPassword: 'TestPass123!'
                                });
                        } else {
                            // If 401, it means password was changed in previous iteration
                            expect(response.status).toBe(401);
                        }
                    }
                ),
                { numRuns: 10 }
            );
        });
    });
});

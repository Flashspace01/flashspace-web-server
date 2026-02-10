import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client, Credentials } from 'google-auth-library';
import fs from 'fs';
import path from 'path';

interface BusyTime {
    start: Date;
    end: Date;
}

interface CreateEventParams {
    summary: string;
    description: string;
    startTime: Date;
    endTime: Date;
    attendeeEmail: string;
    attendeeName: string;
}

interface CreatedEvent {
    eventId: string;
    meetLink: string;
    htmlLink: string;
}

const TOKEN_PATH = path.join(__dirname, 'google-tokens.json');

export class GoogleCalendarService {
    private static oauth2Client: OAuth2Client | null = null;
    private static calendar: calendar_v3.Calendar | null = null;
    private static isInitialized = false;

    /**
     * Get OAuth2 client instance
     */
    static getOAuth2Client(): OAuth2Client {
        if (!this.oauth2Client) {
            const clientId = process.env.MEETING_SCHEDULER_GOOGLE_CLIENT_ID;
            const clientSecret = process.env.MEETING_SCHEDULER_GOOGLE_CLIENT_SECRET;
            const redirectUri = process.env.MEETING_SCHEDULER_CALLBACK_URL ||
                `${process.env.FRONTEND_URL || 'http://localhost:5000'}/api/meetings/auth/google/callback`;

            if (!clientId || !clientSecret) {
                throw new Error('Meeting Scheduler OAuth credentials not configured. Set MEETING_SCHEDULER_GOOGLE_CLIENT_ID and MEETING_SCHEDULER_GOOGLE_CLIENT_SECRET.');
            }

            this.oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);
        }
        return this.oauth2Client;
    }

    /**
     * Generate the Google OAuth2 authorization URL
     */
    static getAuthUrl(): string {
        const oauth2Client = this.getOAuth2Client();

        return oauth2Client.generateAuthUrl({
            access_type: 'offline',
            prompt: 'consent',
            scope: [
                'https://www.googleapis.com/auth/calendar',
                'https://www.googleapis.com/auth/calendar.events'
            ]
        });
    }

    /**
     * Exchange authorization code for tokens
     */
    static async handleCallback(code: string): Promise<Credentials> {
        const oauth2Client = this.getOAuth2Client();

        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        // Save tokens for future use
        this.saveTokens(tokens);
        this.initializeCalendar();

        return tokens;
    }

    /**
     * Save OAuth tokens to file
     */
    private static saveTokens(tokens: Credentials): void {
        try {
            fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
            console.log('✅ Google OAuth tokens saved');
        } catch (error) {
            console.error('❌ Failed to save tokens:', error);
        }
    }

    /**
     * Load OAuth tokens from file
     */
    private static loadTokens(): Credentials | null {
        try {
            if (fs.existsSync(TOKEN_PATH)) {
                const tokensData = fs.readFileSync(TOKEN_PATH, 'utf-8');
                return JSON.parse(tokensData);
            }
        } catch (error) {
            console.error('❌ Failed to load tokens:', error);
        }
        return null;
    }

    /**
     * Initialize the Calendar API with stored tokens
     */
    static initializeCalendar(): boolean {
        try {
            const tokens = this.loadTokens();

            if (!tokens) {
                console.warn('⚠️ No OAuth tokens found. Please authorize via /api/meetings/auth/google');
                return false;
            }

            const oauth2Client = this.getOAuth2Client();
            oauth2Client.setCredentials(tokens);

            // Handle token refresh
            oauth2Client.on('tokens', (newTokens) => {
                const existingTokens = this.loadTokens();
                const updatedTokens = { ...existingTokens, ...newTokens };
                this.saveTokens(updatedTokens);
                console.log('✅ OAuth tokens refreshed');
            });

            this.calendar = google.calendar({ version: 'v3', auth: oauth2Client });
            this.isInitialized = true;
            console.log('✅ Google Calendar service initialized with OAuth2');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Google Calendar service:', error);
            return false;
        }
    }

    /**
     * Check if OAuth2 is authorized
     */
    static isAuthorized(): boolean {
        const tokens = this.loadTokens();
        return !!tokens;
    }

    /**
     * Revoke OAuth tokens and clear stored credentials
     */
    static async revokeAuth(): Promise<boolean> {
        try {
            const tokens = this.loadTokens();
            if (tokens?.access_token) {
                const oauth2Client = this.getOAuth2Client();
                await oauth2Client.revokeToken(tokens.access_token);
            }

            if (fs.existsSync(TOKEN_PATH)) {
                fs.unlinkSync(TOKEN_PATH);
            }

            this.oauth2Client = null;
            this.calendar = null;
            this.isInitialized = false;

            console.log('✅ Google OAuth tokens revoked');
            return true;
        } catch (error) {
            console.error('❌ Failed to revoke tokens:', error);
            return false;
        }
    }

    /**
     * Get busy times from the sales team calendar
     */
    static async getBusyTimes(startDate: Date, endDate: Date): Promise<BusyTime[]> {
        if (!this.isInitialized) {
            this.initializeCalendar();
        }

        if (!this.calendar) {
            console.warn('⚠️ Google Calendar not initialized, returning empty busy times');
            return [];
        }

        const calendarId = process.env.MEETING_SCHEDULER_CALENDAR_ID || 'primary';

        try {
            const response = await this.calendar.freebusy.query({
                requestBody: {
                    timeMin: startDate.toISOString(),
                    timeMax: endDate.toISOString(),
                    items: [{ id: calendarId }]
                }
            });

            const busyPeriods = response.data.calendars?.[calendarId]?.busy || [];

            return busyPeriods.map(period => ({
                start: new Date(period.start || ''),
                end: new Date(period.end || '')
            }));
        } catch (error) {
            console.error('❌ Error fetching busy times:', error);
            return [];
        }
    }

    /**
     * Create a calendar event with Google Meet conferencing
     */
    static async createEvent(params: CreateEventParams): Promise<CreatedEvent | null> {
        if (!this.isInitialized) {
            this.initializeCalendar();
        }

        if (!this.calendar) {
            console.error('❌ Google Calendar not initialized. Please authorize first.');
            return null;
        }

        const calendarId = process.env.MEETING_SCHEDULER_CALENDAR_ID || 'primary';

        try {
            const event: calendar_v3.Schema$Event = {
                summary: params.summary,
                description: params.description,
                start: {
                    dateTime: params.startTime.toISOString(),
                    timeZone: 'Asia/Kolkata'
                },
                end: {
                    dateTime: params.endTime.toISOString(),
                    timeZone: 'Asia/Kolkata'
                },
                attendees: [
                    { email: params.attendeeEmail, displayName: params.attendeeName }
                ],
                conferenceData: {
                    createRequest: {
                        requestId: `meeting-${Date.now()}`,
                        conferenceSolutionKey: { type: 'hangoutsMeet' }
                    }
                },
                reminders: {
                    useDefault: false,
                    overrides: [
                        { method: 'email', minutes: 60 },
                        { method: 'popup', minutes: 15 }
                    ]
                }
            };

            const response = await this.calendar.events.insert({
                calendarId,
                requestBody: event,
                conferenceDataVersion: 1,
                sendUpdates: 'all'
            });

            const createdEvent = response.data;
            const meetLink = createdEvent.conferenceData?.entryPoints?.find(
                ep => ep.entryPointType === 'video'
            )?.uri || '';

            console.log('✅ Calendar event created:', createdEvent.id);

            return {
                eventId: createdEvent.id || '',
                meetLink,
                htmlLink: createdEvent.htmlLink || ''
            };
        } catch (error) {
            console.error('❌ Error creating calendar event:', error);
            return null;
        }
    }

    /**
     * Delete a calendar event
     */
    static async deleteEvent(eventId: string): Promise<boolean> {
        if (!this.calendar) {
            return false;
        }

        const calendarId = process.env.MEETING_SCHEDULER_CALENDAR_ID || 'primary';

        try {
            await this.calendar.events.delete({
                calendarId,
                eventId
            });
            console.log('✅ Calendar event deleted:', eventId);
            return true;
        } catch (error) {
            console.error('❌ Error deleting calendar event:', error);
            return false;
        }
    }

    /**
     * Check if the service is properly configured
     */
    static isConfigured(): boolean {
        return !!(
            process.env.MEETING_SCHEDULER_GOOGLE_CLIENT_ID &&
            process.env.MEETING_SCHEDULER_GOOGLE_CLIENT_SECRET
        );
    }
}

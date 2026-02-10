import { DateTime } from 'luxon';
import { MeetingModel, MeetingStatus } from './meeting.model';
import { GoogleCalendarService } from './googleCalendar.service';
import { MeetingEmailUtil } from './email.util';

interface TimeSlot {
    startTime: Date;
    endTime: Date;
    displayTime: string;
}

interface DayAvailability {
    date: string;
    displayDate: string;
    slots: TimeSlot[];
}

interface BookMeetingRequest {
    fullName: string;
    email: string;
    phoneNumber: string;
    slotTime: Date;
    notes?: string;
}

interface BookingResult {
    success: boolean;
    meeting?: any;
    message: string;
}

export class MeetingSchedulerService {
    private static readonly SLOT_DURATION_MINUTES = 30;
    private static readonly WORKING_START_HOUR = 10; // 10 AM
    private static readonly WORKING_END_HOUR = 19; // 7 PM
    private static readonly BREAK_START_HOUR = 13;
    private static readonly BREAK_START_MINUTE = 30; // 1:30 PM
    private static readonly BREAK_END_HOUR = 14; // 2 PM
    private static readonly MIN_BOOKING_NOTICE_HOURS = 1; // Book at least 1 hour in advance
    private static readonly TIMEZONE = 'Asia/Kolkata';

    /**
     * Get available time slots for the next N days
     */
    static async getAvailableSlots(days: number = 7): Promise<DayAvailability[]> {
        const now = DateTime.now().setZone(this.TIMEZONE);
        const startDate = now.startOf('day');
        const endDate = startDate.plus({ days });

        // Fetch busy times from Google Calendar
        const busyTimes = await GoogleCalendarService.getBusyTimes(
            startDate.toJSDate(),
            endDate.toJSDate()
        );

        // Fetch already booked meetings from database
        const bookedMeetings = await MeetingModel.find({
            startTime: { $gte: startDate.toJSDate(), $lte: endDate.toJSDate() },
            status: { $ne: MeetingStatus.Cancelled }
        }).select('startTime endTime');

        // Combine busy times
        const allBusyTimes = [
            ...busyTimes,
            ...bookedMeetings.map(m => ({
                start: new Date(m.startTime),
                end: new Date(m.endTime)
            }))
        ];

        const availability: DayAvailability[] = [];

        for (let dayOffset = 0; dayOffset < days; dayOffset++) {
            const currentDay = startDate.plus({ days: dayOffset });

            // Skip Sundays (day 7 in Luxon)
            if (currentDay.weekday === 7) {
                continue;
            }

            const slots = this.generateDaySlots(currentDay, allBusyTimes, now);

            if (slots.length > 0) {
                availability.push({
                    date: currentDay.toISODate() || '',
                    displayDate: currentDay.toFormat('cccc, LLLL d, yyyy'),
                    slots
                });
            }
        }

        return availability;
    }

    /**
     * Generate available slots for a specific day
     */
    private static generateDaySlots(
        day: DateTime,
        busyTimes: { start: Date; end: Date }[],
        now: DateTime
    ): TimeSlot[] {
        const slots: TimeSlot[] = [];
        const minBookingTime = now.plus({ hours: this.MIN_BOOKING_NOTICE_HOURS });

        let currentSlot = day.set({
            hour: this.WORKING_START_HOUR,
            minute: 0,
            second: 0,
            millisecond: 0
        });

        const dayEnd = day.set({
            hour: this.WORKING_END_HOUR,
            minute: 0,
            second: 0,
            millisecond: 0
        });

        while (currentSlot < dayEnd) {
            const slotEnd = currentSlot.plus({ minutes: this.SLOT_DURATION_MINUTES });

            // Check if slot is in the past or too soon
            if (slotEnd <= minBookingTime) {
                currentSlot = slotEnd;
                continue;
            }

            // Check if slot overlaps with break time (1:30 PM - 2 PM)
            const breakStart = day.set({
                hour: this.BREAK_START_HOUR,
                minute: this.BREAK_START_MINUTE
            });
            const breakEnd = day.set({
                hour: this.BREAK_END_HOUR,
                minute: 0
            });

            if (this.slotsOverlap(currentSlot, slotEnd, breakStart, breakEnd)) {
                currentSlot = breakEnd;
                continue;
            }

            // Check if slot overlaps with any busy time
            const isBusy = busyTimes.some(busy => {
                const busyStart = DateTime.fromJSDate(busy.start).setZone(this.TIMEZONE);
                const busyEnd = DateTime.fromJSDate(busy.end).setZone(this.TIMEZONE);
                return this.slotsOverlap(currentSlot, slotEnd, busyStart, busyEnd);
            });

            if (!isBusy) {
                slots.push({
                    startTime: currentSlot.toJSDate(),
                    endTime: slotEnd.toJSDate(),
                    displayTime: `${currentSlot.toFormat('h:mm a')} - ${slotEnd.toFormat('h:mm a')}`
                });
            }

            currentSlot = slotEnd;
        }

        return slots;
    }

    /**
     * Check if two time ranges overlap
     */
    private static slotsOverlap(
        start1: DateTime,
        end1: DateTime,
        start2: DateTime,
        end2: DateTime
    ): boolean {
        return start1 < end2 && end1 > start2;
    }

    /**
     * Book a meeting
     */
    static async bookMeeting(request: BookMeetingRequest): Promise<BookingResult> {
        const slotTime = DateTime.fromJSDate(new Date(request.slotTime)).setZone(this.TIMEZONE);
        const slotEnd = slotTime.plus({ minutes: this.SLOT_DURATION_MINUTES });
        const now = DateTime.now().setZone(this.TIMEZONE);

        // Validate slot time
        if (slotTime <= now.plus({ hours: this.MIN_BOOKING_NOTICE_HOURS })) {
            return {
                success: false,
                message: 'Cannot book a slot less than 1 hour in advance'
            };
        }

        // Check if within working hours
        if (slotTime.hour < this.WORKING_START_HOUR || slotTime.hour >= this.WORKING_END_HOUR) {
            return {
                success: false,
                message: 'Slot is outside working hours (10 AM - 7 PM)'
            };
        }

        // Check if not on Sunday
        if (slotTime.weekday === 7) {
            return {
                success: false,
                message: 'Cannot book meetings on Sunday'
            };
        }

        // Check if slot is already booked
        const existingMeeting = await MeetingModel.findOne({
            startTime: slotTime.toJSDate(),
            status: { $ne: MeetingStatus.Cancelled }
        });

        if (existingMeeting) {
            return {
                success: false,
                message: 'This time slot is no longer available'
            };
        }

        // Create Google Calendar event
        const calendarEvent = await GoogleCalendarService.createEvent({
            summary: `FlashSpace Sales Meeting - ${request.fullName}`,
            description: `Meeting with ${request.fullName}\nEmail: ${request.email}\nPhone: ${request.phoneNumber}\n${request.notes ? `Notes: ${request.notes}` : ''}`,
            startTime: slotTime.toJSDate(),
            endTime: slotEnd.toJSDate(),
            attendeeEmail: request.email,
            attendeeName: request.fullName
        });

        // Calculate expiration time (30 mins after meeting ends)
        const expiresAt = slotEnd.plus({ minutes: 30 }).toJSDate();

        // Create meeting in database
        const meeting = await MeetingModel.create({
            bookingUserName: request.fullName,
            bookingUserEmail: request.email,
            bookingUserPhone: request.phoneNumber,
            startTime: slotTime.toJSDate(),
            endTime: slotEnd.toJSDate(),
            googleCalendarEventId: calendarEvent?.eventId,
            googleMeetLink: calendarEvent?.meetLink || '',
            notes: request.notes,
            status: MeetingStatus.Scheduled,
            expiresAt
        });

        // Sending Email is disabled for now

        // Send confirmation email
        if (calendarEvent?.meetLink) {
            await MeetingEmailUtil.sendMeetingConfirmation({
                to: request.email,
                fullName: request.fullName,
                meetingDate: slotTime.toJSDate(),
                meetLink: calendarEvent.meetLink,
                duration: this.SLOT_DURATION_MINUTES
            });
        }

        return {
            success: true,
            meeting: {
                id: meeting._id,
                bookingUserName: meeting.bookingUserName,
                bookingUserEmail: meeting.bookingUserEmail,
                startTime: meeting.startTime,
                endTime: meeting.endTime,
                googleMeetLink: meeting.googleMeetLink,
                status: meeting.status
            },
            message: 'Meeting booked successfully'
        };
    }

    /**
     * Get meeting by ID
     */
    static async getMeetingById(meetingId: string): Promise<any> {
        const meeting = await MeetingModel.findById(meetingId);

        if (!meeting) {
            return null;
        }

        return {
            id: meeting._id,
            bookingUserName: meeting.bookingUserName,
            bookingUserEmail: meeting.bookingUserEmail,
            bookingUserPhone: meeting.bookingUserPhone,
            startTime: meeting.startTime,
            endTime: meeting.endTime,
            googleMeetLink: meeting.googleMeetLink,
            status: meeting.status,
            notes: meeting.notes
        };
    }
}

import InformationalPage from '../components/ui/InformationalPage';

const sections = [
    {
        heading: '1. Introduction and acceptance',
        paragraphs: ['These draft terms describe use of the EventHub application. By using the application, you agree to follow these terms and any event-specific information shown by its organizer.'],
    },
    {
        heading: '2. Accounts',
        paragraphs: ['Keep your account details accurate and protect your sign-in credentials. Account access and available actions depend on the role assigned to your account. Do not use another person’s account without permission.'],
    },
    {
        heading: '3. Event information and availability',
        paragraphs: ['Events are listed with information supplied through EventHub’s event-management tools. Event details and available seats can change; review the event page before making a booking. The application does not promise that an event will remain available.'],
    },
    {
        heading: '4. Booking and attendee information',
        paragraphs: ['A booking may require the event, ticket quantity, attendee names, and optional attendee email addresses. The application may require a one-time verification step when a booking is submitted. Check the information before submitting.'],
    },
    {
        heading: '5. Tickets and QR verification',
        paragraphs: ['Tickets and their references are associated with bookings. Event staff assigned to an event can use the scanner to check a ticket and record entry. A ticket may not be accepted if it is invalid, void, or has already been checked in.'],
    },
    {
        heading: '6. Cancellation and booking status',
        paragraphs: ['The application may show a cancellation option for eligible bookings. Its availability and effect depend on the booking state and applicable event arrangements. EventHub does not state a universal refund entitlement or guarantee refunds. Payment-related status shown in the application may require administrator confirmation; follow the event organizer’s stated instructions for payment matters.'],
    },
    {
        heading: '7. Administrator and event staff responsibilities',
        paragraphs: ['Administrators manage event listings and booking records and may assign staff to events. Event staff may access assigned event information and perform ticket checks. Use these role-specific features only for their intended event operations.'],
    },
    {
        heading: '8. Acceptable use',
        paragraphs: ['Do not interfere with the application, attempt to bypass access controls, submit misleading attendee information, or use tickets and account features without authorization.'],
    },
    {
        heading: '9. Availability and limitations',
        paragraphs: ['EventHub may be changed, temporarily unavailable, or unable to display current event information. The application does not promise uninterrupted service. Event-specific arrangements should be checked with the relevant organizer.'],
    },
    {
        heading: '10. Changes to these terms',
        paragraphs: ['These draft terms may be revised as the application and its policies are reviewed. The version published on this page should be checked before continued use.'],
    },
];

const Terms = () => (
    <InformationalPage
        title="Terms & Conditions"
        introduction="These draft terms outline basic expectations for using EventHub."
        draftNotice="Draft for review. This informational text is not legal advice and must be reviewed and approved before production use."
        sections={sections}
    />
);

export default Terms;

import InformationalPage from '../components/ui/InformationalPage';

const sections = [
    {
        heading: '1. About this draft',
        paragraphs: ['This draft describes information handled by the EventHub application based on the current project implementation. It requires review against the deployed service and applicable privacy requirements before production use.'],
    },
    {
        heading: '2. Information you provide',
        paragraphs: ['Registration uses a name, email address, and password. Booking submissions can include the event, ticket quantity, attendee names, and optional attendee email addresses.'],
    },
    {
        heading: '3. Account and authentication information',
        paragraphs: ['The application uses account information to register and authenticate users, verify accounts, and support password reset. The browser stores the signed-in session token and user information in local storage; signing out removes those values.'],
    },
    {
        heading: '4. Booking and ticket information',
        paragraphs: ['Booking records can include the event, attendee details, quantity, booking reference, amount, payment status, and associated ticket details. Tickets include a reference and check-in status used by the application.'],
    },
    {
        heading: '5. How information is used',
        paragraphs: ['The application uses these details to support accounts, display event listings, submit and show bookings, provide ticket downloads, manage event operations, and verify tickets at entry. Account and booking email addresses are used for verification codes, password-reset messages, and booking confirmations. A booking confirmation can include booking details, attendee count, payment status, and ticket PDF attachments.'],
    },
    {
        heading: '6. Access within EventHub',
        paragraphs: ['Signed-in users can view their own booking information. Administrators have role-protected tools to manage events and booking records. Event staff can access assigned event information and check tickets for those events. Access is limited by the application’s account and role checks.'],
    },
    {
        heading: '7. Security',
        paragraphs: ['The reviewed application uses authenticated API requests and role checks for protected operations. This description is limited to the implementation reviewed and is not a guarantee that every risk is prevented or a claim of a security certification.'],
    },
    {
        heading: '8. Retention and account management',
        paragraphs: ['The project does not define a general retention period or provide a self-service account deletion feature. Retention and requests to access, correct, or remove information should be defined by the service operator before production use.'],
    },
    {
        heading: '9. Service providers',
        paragraphs: ['The server sends transactional email through a configured delivery service. The service in use depends on deployment configuration and is not identified in this draft; confirm its data handling and disclose it before publication.'],
    },
    {
        heading: '10. Policy updates',
        paragraphs: ['This draft may be updated as EventHub’s implementation and privacy practices are reviewed. Check this page for the current published version.'],
    },
];

const Privacy = () => (
    <InformationalPage
        title="Privacy Policy"
        introduction="This draft explains the information EventHub handles and how the application uses it."
        draftNotice="Draft for review. Confirm the deployed data flows and obtain legal review before production use."
        sections={sections}
    />
);

export default Privacy;

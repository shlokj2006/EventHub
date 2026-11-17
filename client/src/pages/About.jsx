import InformationalPage from '../components/ui/InformationalPage';

const sections = [
    {
        heading: 'Discover events',
        paragraphs: ['EventHub is a platform for browsing events published in the application. Event listings show details such as the date, location, description, and available seats when those details are provided.'],
    },
    {
        heading: 'Book and manage tickets',
        paragraphs: ['Visitors can open an event page to review its details. To book, users sign in, provide attendee information, and complete a one-time email verification. Signed-in users can review their bookings and access available ticket PDF downloads from their dashboard.'],
    },
    {
        heading: 'Event operations',
        paragraphs: ['Administrators manage event listings and booking records, including recording payment status. Event staff can review events assigned to them and verify tickets at entry using the QR scanner.'],
    },
];

const About = () => (
    <InformationalPage
        title="About EventHub"
        introduction="EventHub helps people find events and manage their ticket bookings in one place."
        sections={sections}
        action={{ to: '/', label: 'Browse events' }}
    />
);

export default About;

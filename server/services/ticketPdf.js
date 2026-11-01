const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

const renderTicketPdf = async (ticket, eventLocation) => {
    const qrBuffer = await QRCode.toBuffer(ticket.ticketReference, {
        type: 'png',
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 240,
    });
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const chunks = [];

    return new Promise((resolve, reject) => {
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        doc.fontSize(24).fillColor('#111827').text('EventHub Ticket');
        doc.moveDown(0.5);
        doc.fontSize(18).text(ticket.eventTitle || 'Event');
        if (ticket.eventDate) {
            doc.moveDown(0.3);
            doc.fontSize(11).fillColor('#374151').text(`Event date: ${new Date(ticket.eventDate).toLocaleString()}`);
        }
        if (eventLocation) doc.text(`Location: ${eventLocation}`);
        doc.moveDown();
        doc.fontSize(13).fillColor('#111827').text(`Attendee: ${ticket.attendee?.name || 'Attendee'}`);
        doc.text(`Ticket reference: ${ticket.ticketReference}`);
        doc.text(`Ticket status: ${ticket.status === 'active' ? 'Active' : 'Voided'}`);
        if (ticket.checkedInAt) doc.text(`Checked in: ${new Date(ticket.checkedInAt).toLocaleString()}`);
        doc.moveDown();
        doc.image(qrBuffer, { fit: [240, 240], align: 'left' });
        doc.moveDown();
        doc.fontSize(9).fillColor('#6b7280').text('Present this QR code at the event entrance. Ticket validity is verified by EventHub.');
        doc.end();
    });
};

module.exports = { renderTicketPdf };
